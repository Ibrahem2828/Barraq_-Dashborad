import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { backendJson, logBackendFailure } from "@/lib/api/backend-http";
import { bindingDisabledPayload, isApiBindingEnabled } from "@/lib/api/binding";
import { ACCESS_COOKIE } from "@/lib/auth/cookies";
import { clearAuthCookies, refreshAccessToken } from "@/lib/auth/server";

export async function POST(request: Request) {
  let bodyToken: string | null = null;
  try {
    const body = await request.json().catch(() => null);
    if (body && typeof body === "object" && typeof (body as Record<string, unknown>).token === "string") {
      bodyToken = String((body as Record<string, unknown>).token);
    }
  } catch {
    bodyToken = null;
  }

  if (!isApiBindingEnabled()) {
    await clearAuthCookies();
    return NextResponse.json(bindingDisabledPayload(), { status: 503 });
  }

  const store = await cookies();
  let token = bodyToken ?? store.get(ACCESS_COOKIE)?.value ?? null;
  if (!token) token = await refreshAccessToken();
  if (!token) {
    await clearAuthCookies();
    return NextResponse.json(
      { success: false, message: "Authentication required", code: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  const startedAt = Date.now();
  try {
    const upstream = await backendJson("auth/verify/", {
      method: "POST",
      data: { token }
    });

    if (upstream.status === 401) {
      const renewed = await refreshAccessToken();
      if (renewed) {
        const retry = await backendJson("auth/verify/", {
          method: "POST",
          data: { token: renewed }
        });
        if (retry.status < 200 || retry.status >= 300) {
          await clearAuthCookies();
          return NextResponse.json(
            { success: false, message: "Token invalid", code: "authentication_error" },
            { status: 401 }
          );
        }
        return NextResponse.json({ success: true, data: { valid: true }, message: "Token verified" });
      }
      await clearAuthCookies();
      return NextResponse.json(
        { success: false, message: "Token invalid", code: "authentication_error" },
        { status: 401 }
      );
    }

    if (upstream.status < 200 || upstream.status >= 300) {
      const payload = (upstream.data && typeof upstream.data === "object"
        ? upstream.data
        : { success: false, message: "Token verification failed" });
      return NextResponse.json(payload, { status: upstream.status });
    }

    return NextResponse.json({ success: true, data: { valid: true }, message: "Token verified" });
  } catch (error) {
    const { status } = logBackendFailure("auth/verify", error, startedAt);
    return NextResponse.json(
      { success: false, message: "Unable to reach authentication service", code: "server_error" },
      { status }
    );
  }
}
