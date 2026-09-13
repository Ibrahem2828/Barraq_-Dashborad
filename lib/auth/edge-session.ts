import { NextRequest, NextResponse } from "next/server";
import { isApiBindingEnabled } from "@/lib/api/binding";
import { ACCESS_COOKIE, CSRF_COOKIE, REFRESH_COOKIE } from "@/lib/auth/cookies";

function backendBase(): string {
  return (process.env.BACKEND_API_URL ?? "https://api.barraq.xn--mgbaab0cxheq.tech/api/v1").replace(/\/$/, "");
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
    domain: cookieDomain()
  };
}

export function clearAuthCookiesOn(response: NextResponse): void {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE]) {
    response.cookies.set(name, "", { ...authCookieOptions(name !== CSRF_COOKIE), maxAge: 0 });
  }
}

function setAuthCookiesOn(response: NextResponse, access: string, refresh: string): void {
  response.cookies.set(ACCESS_COOKIE, access, { ...authCookieOptions(true), maxAge: 60 * 15 });
  response.cookies.set(REFRESH_COOKIE, refresh, { ...authCookieOptions(true), maxAge: 60 * 60 * 24 * 30 });
  response.cookies.set(CSRF_COOKIE, crypto.randomUUID(), { ...authCookieOptions(false), maxAge: 60 * 60 * 24 * 30 });
}

function readJwtExp(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

function isJwtUnexpired(token: string, skewSeconds = 30): boolean {
  const exp = readJwtExp(token);
  if (exp === null) return false;
  return exp > Math.floor(Date.now() / 1000) + skewSeconds;
}

type VerifyResult = "valid" | "invalid" | "unreachable";

async function verifyAccessToken(token: string): Promise<VerifyResult> {
  try {
    const response = await fetch(`${backendBase()}/auth/verify/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store"
    });
    if (response.ok) return "valid";
    if (response.status === 401 || response.status === 403) return "invalid";
    return "unreachable";
  } catch {
    return "unreachable";
  }
}

async function refreshTokens(refresh: string): Promise<{ access: string; refresh: string } | null> {
  try {
    const response = await fetch(`${backendBase()}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refresh }),
      cache: "no-store"
    });
    if (!response.ok) return null;
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!payload || typeof payload !== "object") return null;
    const data = (payload.data && typeof payload.data === "object" ? payload.data : payload) as Record<string, unknown>;
    const access =
      typeof data.access === "string" ? data.access : typeof data.access_token === "string" ? data.access_token : null;
    const nextRefresh =
      typeof data.refresh === "string" ? data.refresh : typeof data.refresh_token === "string" ? data.refresh_token : refresh;
    if (!access) return null;
    return { access, refresh: nextRefresh };
  } catch {
    return null;
  }
}

function acceptToken(result: VerifyResult, token: string): boolean {
  if (result === "valid") return true;
  // Backend blip: allow only structurally valid, unexpired JWTs.
  return result === "unreachable" && isJwtUnexpired(token);
}

export type EdgeSessionResult =
  | { authenticated: true; attach?: (response: NextResponse) => void }
  | { authenticated: false };

/**
 * Edge-safe session gate for middleware: verifies access with the backend,
 * refreshes when needed, and rejects forged/empty cookie values.
 */
export async function resolveEdgeSession(request: NextRequest): Promise<EdgeSessionResult> {
  if (!isApiBindingEnabled()) {
    return { authenticated: false };
  }

  const access = request.cookies.get(ACCESS_COOKIE)?.value ?? null;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value ?? null;
  if (!access && !refresh) {
    return { authenticated: false };
  }

  if (access) {
    const verified = await verifyAccessToken(access);
    if (acceptToken(verified, access)) {
      return { authenticated: true };
    }
    if (verified === "unreachable") {
      // Unreachable and token not a valid unexpired JWT → fall through to refresh.
    }
  }

  if (refresh) {
    const renewed = await refreshTokens(refresh);
    if (renewed) {
      const verified = await verifyAccessToken(renewed.access);
      if (acceptToken(verified, renewed.access)) {
        return {
          authenticated: true,
          attach(response) {
            setAuthCookiesOn(response, renewed.access, renewed.refresh);
          }
        };
      }
    }
  }

  return { authenticated: false };
}
