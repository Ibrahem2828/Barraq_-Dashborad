import "server-only";

import { cookies, headers } from "next/headers";
import { isApiBindingEnabled } from "@/lib/api/binding";
import { ACCESS_COOKIE, CSRF_COOKIE, REFRESH_COOKIE } from "@/lib/auth/cookies";

const backendUrl = (process.env.BACKEND_API_URL ?? "https://api.baraqapp.com/api/v1").replace(/\/$/, "");
const cookieSecure = (process.env.AUTH_COOKIE_SECURE ?? "true").toLowerCase() === "true";
const cookieDomain = process.env.AUTH_COOKIE_DOMAIN || undefined;

export function getBackendUrl(path: string): string {
  const clean = path.replace(/^\/+/, "");
  return `${backendUrl}/${clean}`;
}

export function cookieOptions(httpOnly = true) {
  return {
    httpOnly,
    secure: cookieSecure,
    sameSite: "lax" as const,
    path: "/",
    domain: cookieDomain
  };
}

export async function setAuthCookies(access: string, refresh: string): Promise<string> {
  const store = await cookies();
  const csrf = crypto.randomUUID();
  store.set(ACCESS_COOKIE, access, { ...cookieOptions(true), maxAge: 60 * 15 });
  store.set(REFRESH_COOKIE, refresh, { ...cookieOptions(true), maxAge: 60 * 60 * 24 * 30 });
  store.set(CSRF_COOKIE, csrf, { ...cookieOptions(false), maxAge: 60 * 60 * 24 * 30 });
  return csrf;
}

export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE]) {
    store.set(name, "", { ...cookieOptions(name !== CSRF_COOKIE), maxAge: 0 });
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  const store = await cookies();
  const refresh = store.get(REFRESH_COOKIE)?.value;
  if (!refresh) return null;

  // Binding paused: keep offline session without hitting backend.
  if (!isApiBindingEnabled()) {
    return store.get(ACCESS_COOKIE)?.value ?? "offline-access";
  }

  const response = await fetch(getBackendUrl("auth/refresh/"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ refresh }),
    cache: "no-store"
  });
  if (!response.ok) return null;
  const payload = await response.json() as Record<string, unknown>;
  const data = (payload.data && typeof payload.data === "object" ? payload.data : payload) as Record<string, unknown>;
  const access = typeof data.access === "string" ? data.access : typeof data.access_token === "string" ? data.access_token : null;
  const nextRefresh = typeof data.refresh === "string" ? data.refresh : refresh;
  if (!access) return null;
  store.set(ACCESS_COOKIE, access, { ...cookieOptions(true), maxAge: 60 * 15 });
  if (nextRefresh !== refresh) store.set(REFRESH_COOKIE, nextRefresh, { ...cookieOptions(true), maxAge: 60 * 60 * 24 * 30 });
  return access;
}

export async function validateMutationCsrf(request: Request): Promise<boolean> {
  const method = request.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return true;
  const store = await cookies();
  const cookieToken = store.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get("x-csrf-token");
  if (!cookieToken || !headerToken || cookieToken !== headerToken) return false;

  const requestHeaders = await headers();
  const origin = request.headers.get("origin");
  const host = requestHeaders.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
