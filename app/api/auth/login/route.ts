import { NextResponse } from "next/server";
import { isApiBindingEnabled } from "@/lib/api/binding";
import { ACCESS_COOKIE, CSRF_COOKIE, REFRESH_COOKIE } from "@/lib/auth/cookies";
import { backendFetch, cookieOptions } from "@/lib/auth/server";

function withAuthCookies(response: NextResponse, access: string, refresh: string) {
  const csrf = crypto.randomUUID();
  response.cookies.set(ACCESS_COOKIE, access, { ...cookieOptions(true), maxAge: 60 * 15 });
  response.cookies.set(REFRESH_COOKIE, refresh, { ...cookieOptions(true), maxAge: 60 * 60 * 24 * 30 });
  response.cookies.set(CSRF_COOKIE, csrf, { ...cookieOptions(false), maxAge: 60 * 60 * 24 * 30 });
  return response;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON" }, { status: 400 });
  }

  // Binding fully paused: local offline session only.
  if (!isApiBindingEnabled()) {
    const response = NextResponse.json({
      success: true,
      data: { authenticated: true, offline: true },
      message: "Signed in (API binding paused)"
    });
    return withAuthCookies(response, "offline-access", "offline-refresh");
  }

  try {
    const upstream = await backendFetch("auth/login/", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await upstream.json().catch(() => ({ success: false, message: "Authentication failed" }));
    if (!upstream.ok) return NextResponse.json(payload, { status: upstream.status });

    const root = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
    const access =
      typeof data.access === "string" ? data.access : typeof data.access_token === "string" ? data.access_token : null;
    const refresh =
      typeof data.refresh === "string" ? data.refresh : typeof data.refresh_token === "string" ? data.refresh_token : null;
    if (!access || !refresh) {
      return NextResponse.json({ success: false, message: "Backend token contract mismatch" }, { status: 502 });
    }

    // Authentication alone is insufficient: students must never receive a
    // dashboard session. Confirm RBAC access before writing auth cookies.
    const adminCheck = await backendFetch("admin/me/", {
      headers: { Authorization: `Bearer ${access}` }
    });
    if (!adminCheck.ok) {
      return NextResponse.json(
        { success: false, message: "هذا الحساب غير مخوّل للوصول إلى لوحة التحكم", code: "ADMIN_ACCESS_REQUIRED" },
        { status: adminCheck.status === 401 ? 401 : 403 }
      );
    }

    const response = NextResponse.json({ success: true, data: { authenticated: true }, message: "Signed in" });
    return withAuthCookies(response, access, refresh);
  } catch {
    return NextResponse.json({ success: false, message: "Unable to reach authentication service" }, { status: 503 });
  }
}
