import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { backendJson, logBackendFailure } from "@/lib/api/backend-http";
import { isApiBindingEnabled } from "@/lib/api/binding";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/cookies";
import { clearAuthCookies, refreshAccessToken } from "@/lib/auth/server";

export async function GET() {
  const store = await cookies();
  let access = store.get(ACCESS_COOKIE)?.value ?? null;
  const hasRefresh = Boolean(store.get(REFRESH_COOKIE)?.value);

  if (!access && !hasRefresh) {
    return NextResponse.json({ success: true, data: { authenticated: false, verified: false } });
  }

  // Binding disabled: never treat cookie presence as a verified session.
  if (!isApiBindingEnabled()) {
    await clearAuthCookies();
    return NextResponse.json({
      success: true,
      data: { authenticated: false, verified: false, binding_disabled: true }
    });
  }

  if (!access) access = await refreshAccessToken();
  if (!access) {
    await clearAuthCookies();
    return NextResponse.json({ success: true, data: { authenticated: false, verified: false } });
  }

  const startedAt = Date.now();
  try {
    const upstream = await backendJson("auth/verify/", {
      method: "POST",
      data: { token: access }
    });

    if (upstream.status < 200 || upstream.status >= 300) {
      const renewed = await refreshAccessToken();
      if (renewed) {
        const retry = await backendJson("auth/verify/", {
          method: "POST",
          data: { token: renewed }
        });
        if (retry.status >= 200 && retry.status < 300) {
          return NextResponse.json({ success: true, data: { authenticated: true, verified: true } });
        }
      }
      await clearAuthCookies();
      return NextResponse.json({ success: true, data: { authenticated: false, verified: false } });
    }

    return NextResponse.json({ success: true, data: { authenticated: true, verified: true } });
  } catch (error) {
    logBackendFailure("auth/session", error, startedAt);
    return NextResponse.json({
      success: true,
      data: { authenticated: Boolean(access), verified: false, unreachable: true }
    });
  }
}
