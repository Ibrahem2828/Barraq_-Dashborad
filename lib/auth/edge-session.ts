import { NextRequest, NextResponse } from "next/server";
import { isApiBindingEnabled } from "@/lib/api/binding";
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_MAX_AGE_SECONDS,
  CSRF_COOKIE,
  REFRESH_COOKIE,
  REFRESH_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/auth/cookies";

function backendBase(): string {
  return (
    process.env.BACKEND_API_URL ??
    "https://api.baraqapp.com/api/v1"
  ).replace(/\/+$/, "");
}

function backendTimeoutMs(): number {
  const configured = Number(process.env.BACKEND_API_TIMEOUT_MS ?? 15_000);
  return Number.isFinite(configured) && configured > 0 ? configured : 15_000;
}

function cookieSecure(): boolean {
  return (process.env.AUTH_COOKIE_SECURE ?? "true").toLowerCase() === "true";
}

function cookieDomain(): string | undefined {
  return process.env.AUTH_COOKIE_DOMAIN || undefined;
}

function authCookieOptions(httpOnly: boolean) {
  return {
    httpOnly,
    secure: cookieSecure(),
    sameSite: "lax" as const,
    path: "/",
    domain: cookieDomain(),
  };
}

export function clearAuthCookiesOn(response: NextResponse): void {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE]) {
    response.cookies.set(name, "", {
      ...authCookieOptions(name !== CSRF_COOKIE),
      maxAge: 0,
    });
  }
}

function setAuthCookiesOn(
  response: NextResponse,
  access: string,
  refresh: string,
): void {
  response.cookies.set(ACCESS_COOKIE, access, {
    ...authCookieOptions(true),
    maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS,
  });
  response.cookies.set(REFRESH_COOKIE, refresh, {
    ...authCookieOptions(true),
    maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
  });
  response.cookies.set(CSRF_COOKIE, crypto.randomUUID(), {
    ...authCookieOptions(false),
    maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
  });
}

type VerifyResult = "valid" | "invalid" | "unreachable";

async function verifyAdminAccess(
  token: string,
  requestId: string | null,
): Promise<VerifyResult> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      // See lib/api/backend-http.ts: this bypasses the Caddy gateway, so
      // Django's SECURE_SSL_REDIRECT needs this header set explicitly or it
      // 301s this internal plain-HTTP call to a dead HTTPS port.
      "X-Forwarded-Proto": "https",
    };
    if (requestId) headers["X-Request-ID"] = requestId;
    const response = await fetch(`${backendBase()}/admin/me/`, {
      method: "GET",
      headers,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(backendTimeoutMs()),
    });
    if (response.ok) return "valid";
    if (response.status === 401 || response.status === 403) return "invalid";
    return "unreachable";
  } catch {
    return "unreachable";
  }
}

async function refreshTokens(
  refresh: string,
  requestId: string | null,
): Promise<{ access: string; refresh: string } | null> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Forwarded-Proto": "https",
    };
    if (requestId) headers["X-Request-ID"] = requestId;
    const response = await fetch(`${backendBase()}/auth/refresh/`, {
      method: "POST",
      headers,
      body: JSON.stringify({ refresh }),
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(backendTimeoutMs()),
    });
    if (!response.ok) return null;
    const payload = (await response.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!payload || typeof payload !== "object") return null;
    const data = (
      payload.data && typeof payload.data === "object" ? payload.data : payload
    ) as Record<string, unknown>;
    const access =
      typeof data.access === "string"
        ? data.access
        : typeof data.access_token === "string"
          ? data.access_token
          : null;
    const nextRefresh =
      typeof data.refresh === "string"
        ? data.refresh
        : typeof data.refresh_token === "string"
          ? data.refresh_token
          : refresh;
    if (!access) return null;
    return { access, refresh: nextRefresh };
  } catch {
    return null;
  }
}

export type EdgeSessionResult =
  | { authenticated: true; attach?: (response: NextResponse) => void }
  | { authenticated: false };

/**
 * Edge-safe session gate for middleware: verifies access with the backend,
 * refreshes when needed, and rejects forged/empty cookie values.
 */
export async function resolveEdgeSession(
  request: NextRequest,
): Promise<EdgeSessionResult> {
  if (!isApiBindingEnabled()) {
    return { authenticated: false };
  }

  const access = request.cookies.get(ACCESS_COOKIE)?.value ?? null;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value ?? null;
  const requestId = request.headers.get("x-request-id");
  if (!access && !refresh) {
    return { authenticated: false };
  }

  if (access) {
    const verified = await verifyAdminAccess(access, requestId);
    if (verified === "valid") {
      return { authenticated: true };
    }
    if (verified === "unreachable") {
      // Fail closed, but allow one bounded refresh attempt before rejecting.
    }
  }

  if (refresh) {
    const renewed = await refreshTokens(refresh, requestId);
    if (renewed) {
      const verified = await verifyAdminAccess(renewed.access, requestId);
      if (verified === "valid") {
        return {
          authenticated: true,
          attach(response) {
            setAuthCookiesOn(response, renewed.access, renewed.refresh);
          },
        };
      }
    }
  }

  return { authenticated: false };
}
