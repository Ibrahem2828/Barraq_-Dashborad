import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { backendRequest, logBackendFailure } from "@/lib/api/backend-http";
import { bindingDisabledPayload, isApiBindingEnabled } from "@/lib/api/binding";
import { ACCESS_COOKIE } from "@/lib/auth/cookies";
import {
  clearAuthCookies,
  refreshAccessToken,
  validateMutationCsrf,
} from "@/lib/auth/server";

const allowedMethods = new Set(["GET", "POST", "PATCH", "PUT", "DELETE"]);
const configuredMaxBodyBytes = Number(
  process.env.BFF_MAX_BODY_BYTES ?? 30 * 1024 * 1024,
);
const maxBodyBytes =
  Number.isFinite(configuredMaxBodyBytes) && configuredMaxBodyBytes > 0
    ? configuredMaxBodyBytes
    : 30 * 1024 * 1024;

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  if (!allowedMethods.has(request.method))
    return NextResponse.json(
      { success: false, message: "Method not allowed" },
      { status: 405 },
    );

  const { path } = await context.params;
  const safePath = path.filter(Boolean).join("/");
  if (safePath.includes(".."))
    return NextResponse.json(
      { success: false, message: "Invalid path" },
      { status: 400 },
    );

  // Binding disabled: refuse proxy entirely (no unauthenticated stubs).
  if (!isApiBindingEnabled()) {
    return NextResponse.json(bindingDisabledPayload(), {
      status: 503,
      headers: { "Cache-Control": "no-store", "X-API-Binding": "disabled" },
    });
  }

  if (!(await validateMutationCsrf(request)))
    return NextResponse.json(
      { success: false, message: "CSRF validation failed" },
      { status: 403 },
    );

  const search = request.nextUrl.searchParams.toString();
  const targetPath = `${safePath}/${search ? `?${search}` : ""}`;

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > maxBodyBytes) {
    return NextResponse.json(
      {
        success: false,
        message: "Request body too large",
        code: "PAYLOAD_TOO_LARGE",
      },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }
  const rawBody = ["GET", "HEAD"].includes(request.method)
    ? undefined
    : await request.arrayBuffer();
  if (rawBody && rawBody.byteLength > maxBodyBytes) {
    return NextResponse.json(
      {
        success: false,
        message: "Request body too large",
        code: "PAYLOAD_TOO_LARGE",
      },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  const store = await cookies();
  let access = store.get(ACCESS_COOKIE)?.value ?? null;
  if (!access) access = await refreshAccessToken();
  if (!access) {
    await clearAuthCookies();
    return NextResponse.json(
      {
        success: false,
        message: "Authentication required",
        code: "UNAUTHENTICATED",
      },
      { status: 401 },
    );
  }

  const forward = async (token: string) => {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };
    const contentType = request.headers.get("content-type");
    if (contentType) headers["Content-Type"] = contentType;
    const idempotency = request.headers.get("idempotency-key");
    if (idempotency) headers["Idempotency-Key"] = idempotency;
    const acceptLanguage = request.headers.get("accept-language");
    if (acceptLanguage) headers["Accept-Language"] = acceptLanguage;
    const requestId = request.headers.get("x-request-id");
    if (requestId) headers["X-Request-ID"] = requestId;

    return backendRequest<ArrayBuffer>(targetPath, {
      method: request.method,
      headers,
      data:
        rawBody && rawBody.byteLength > 0 ? Buffer.from(rawBody) : undefined,
      responseType: "arraybuffer",
      // Avoid axios transforming empty bodies oddly for GET.
      transformRequest: [(data) => data],
    });
  };

  const startedAt = Date.now();
  let response: Awaited<ReturnType<typeof forward>>;
  try {
    response = await forward(access);
    if (response.status === 401) {
      const renewed = await refreshAccessToken();
      if (renewed) response = await forward(renewed);
    }
  } catch (error) {
    const { status, code } = logBackendFailure(
      `bff/${safePath}`,
      error,
      startedAt,
      request.headers.get("x-request-id"),
    );
    return NextResponse.json(
      {
        success: false,
        message: "Upstream service is temporarily unavailable",
        code,
      },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (response.status === 401) await clearAuthCookies();

  const responseBody =
    response.data instanceof ArrayBuffer
      ? response.data
      : Buffer.isBuffer(response.data)
        ? response.data
        : new Uint8Array();

  const next = new NextResponse(responseBody, { status: response.status });
  const contentType = response.headers["content-type"];
  next.headers.set(
    "Content-Type",
    typeof contentType === "string"
      ? contentType
      : "application/json; charset=utf-8",
  );
  next.headers.set("Cache-Control", "no-store");
  const requestId = response.headers["x-request-id"];
  if (typeof requestId === "string")
    next.headers.set("X-Request-ID", requestId);
  return next;
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
