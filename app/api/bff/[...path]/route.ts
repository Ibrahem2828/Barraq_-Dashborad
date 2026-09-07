import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { isApiBindingEnabled, offlineStubForPath } from "@/lib/api/binding";
import { ACCESS_COOKIE } from "@/lib/auth/cookies";
import { clearAuthCookies, getBackendUrl, refreshAccessToken, validateMutationCsrf } from "@/lib/auth/server";

const allowedMethods = new Set(["GET", "POST", "PATCH", "PUT", "DELETE"]);

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!allowedMethods.has(request.method)) return NextResponse.json({ success: false, message: "Method not allowed" }, { status: 405 });

  const { path } = await context.params;
  const safePath = path.filter(Boolean).join("/");
  if (safePath.includes("..")) return NextResponse.json({ success: false, message: "Invalid path" }, { status: 400 });

  // Binding paused: keep BFF route, do not call backend.
  if (!isApiBindingEnabled()) {
    return NextResponse.json(offlineStubForPath(safePath, request.method), {
      status: 200,
      headers: { "Cache-Control": "no-store", "X-API-Binding": "paused" }
    });
  }

  if (!(await validateMutationCsrf(request))) return NextResponse.json({ success: false, message: "CSRF validation failed" }, { status: 403 });

  const target = new URL(getBackendUrl(`${safePath}/`));
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.append(key, value));

  const rawBody = ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer();

  const store = await cookies();
  let access = store.get(ACCESS_COOKIE)?.value ?? null;
  if (!access) access = await refreshAccessToken();
  if (!access) {
    await clearAuthCookies();
    return NextResponse.json({ success: false, message: "Authentication required", code: "UNAUTHENTICATED" }, { status: 401 });
  }

  const forward = async (token: string) => {
    const headers = new Headers();
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("Accept", "application/json");
    const contentType = request.headers.get("content-type");
    if (contentType) headers.set("Content-Type", contentType);
    const idempotency = request.headers.get("idempotency-key");
    if (idempotency) headers.set("Idempotency-Key", idempotency);
    const body = rawBody ? rawBody.slice(0) : undefined;
    return fetch(target, { method: request.method, headers, body, redirect: "manual", cache: "no-store" });
  };

  let response = await forward(access);
  if (response.status === 401) {
    const renewed = await refreshAccessToken();
    if (renewed) response = await forward(renewed);
  }
  if (response.status === 401) await clearAuthCookies();

  const responseBody = await response.arrayBuffer();
  const next = new NextResponse(responseBody, { status: response.status });
  next.headers.set("Content-Type", response.headers.get("content-type") ?? "application/json; charset=utf-8");
  next.headers.set("Cache-Control", "no-store");
  const requestId = response.headers.get("x-request-id");
  if (requestId) next.headers.set("X-Request-ID", requestId);
  return next;
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
