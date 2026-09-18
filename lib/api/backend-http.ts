import "server-only";

import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";

const backendBase = (
  process.env.BACKEND_API_URL ?? "https://api.baraqapp.com/api/v1"
).replace(/\/+$/, "");
const backendHost = new URL(backendBase).host;
const configuredTimeoutMs = Number(process.env.BACKEND_API_TIMEOUT_MS ?? 15_000);
const backendTimeoutMs =
  Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0
    ? configuredTimeoutMs
    : 15_000;

export function getBackendUrl(path: string): string {
  if (!path || /[\\#\u0000-\u001f\u007f]/u.test(path))
    throw new Error("Invalid backend path");

  const queryIndex = path.indexOf("?");
  const pathname = queryIndex === -1 ? path : path.slice(0, queryIndex);
  const search = queryIndex === -1 ? "" : path.slice(queryIndex);
  const segments = pathname.split("/").filter(Boolean);
  if (
    (pathname.startsWith("//") && !pathname.startsWith("///")) ||
    /^[a-z][a-z\d+.-]*:/iu.test(pathname) ||
    segments.some((segment) => {
      try {
        const decoded = decodeURIComponent(segment);
        return (
          decoded === "." ||
          decoded === ".." ||
          decoded.includes("/") ||
          decoded.includes("\\")
        );
      } catch {
        return true;
      }
    })
  ) {
    throw new Error("Invalid backend path");
  }

  const normalizedPath = segments.join("/");
  return `${backendBase}/${normalizedPath ? `${normalizedPath}/` : ""}${search}`;
}

/** Server-side axios for upstream Admin API calls (auth routes + BFF). Uses the fetch adapter so it goes through the runtime's global fetch (Next.js/Node's native implementation, or a test's stubbed one) instead of opening raw sockets itself. */
export const backendHttp = axios.create({
  adapter: "fetch",
  timeout: backendTimeoutMs,
  // Mirror fetch: callers inspect status themselves.
  validateStatus: () => true,
  headers: {
    Accept: "application/json",
  },
  // Axios's fetch adapter passes fetchOptions into Request. Explicit manual
  // redirect handling keeps POST bodies and credentials from ever being
  // replayed to a redirect target; backendRequest then converts 3xx to 502.
  fetchOptions: { redirect: "manual" },
  maxRedirects: 0,
});

/** Thrown by backendRequest() when the backend responds with an unexpected 3xx, so every caller's existing catch block handles it instead of a raw redirect status leaking to a browser/API client. */
export class BackendRedirectError extends Error {
  constructor(
    public readonly status: number,
    public readonly location: string | undefined,
  ) {
    super(`Unexpected redirect from backend (status ${status})`);
    this.name = "BackendRedirectError";
  }
}

export class BackendResponseError extends Error {
  constructor(public readonly upstreamStatus: number) {
    super(`Unexpected backend response (status ${upstreamStatus})`);
    this.name = "BackendResponseError";
  }
}

function errorCodes(error: unknown): Set<string> {
  const codes = new Set<string>();
  const seen = new Set<object>();
  const pending: unknown[] = [error];
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    const record = current as { code?: unknown; cause?: unknown; errors?: unknown };
    if (typeof record.code === "string") codes.add(record.code);
    if (record.cause) pending.push(record.cause);
    if (Array.isArray(record.errors)) pending.push(...record.errors);
  }
  return codes;
}

export async function backendRequest<T = unknown>(
  path: string,
  config: AxiosRequestConfig = {},
): Promise<AxiosResponse<T>> {
  const url = getBackendUrl(path);
  const response = await backendHttp.request<T>({
    ...config,
    url,
    headers: {
      Accept: "application/json",
      // This call goes straight to the internal Django service over the
      // Docker network, bypassing the Caddy gateway that normally sets this
      // header for public traffic. Django trusts X-Forwarded-Proto
      // (SECURE_PROXY_SSL_HEADER) to decide whether a request is "secure";
      // without it, SECURE_SSL_REDIRECT=True 301-redirects this plain-HTTP
      // internal call to an HTTPS URL nothing internally serves.
      ...config.headers,
      "X-Forwarded-Proto": "https",
    },
  });
  if (response.status >= 300 && response.status < 400) {
    throw new BackendRedirectError(
      response.status,
      response.headers?.location as string | undefined,
    );
  }
  return response;
}

/**
 * Classifies a thrown backendRequest()/backendJson() error for an accurate
 * (but non-sensitive) HTTP status and error code — never the same flat
 * status for every failure kind.
 */
export function classifyBackendError(error: unknown): {
  status: number;
  code: string;
} {
  if (error instanceof BackendRedirectError) {
    return { status: 502, code: "upstream_redirect" };
  }
  if (error instanceof BackendResponseError) {
    return {
      status: error.upstreamStatus,
      code: "upstream_response_error",
    };
  }
  if (axios.isAxiosError(error)) {
    const codes = errorCodes(error);
    if (
      codes.has("ECONNABORTED") ||
      codes.has("ETIMEDOUT") ||
      codes.has("UND_ERR_CONNECT_TIMEOUT")
    ) {
      return { status: 504, code: "upstream_timeout" };
    }
    if (
      [
        "ERR_TLS_CERT_ALTNAME_INVALID",
        "DEPTH_ZERO_SELF_SIGNED_CERT",
        "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
        "EPROTO",
      ].some((code) => codes.has(code))
    ) {
      return { status: 502, code: "upstream_tls_error" };
    }
    if (
      [
        "ECONNREFUSED",
        "ECONNRESET",
        "ENETUNREACH",
        "EHOSTUNREACH",
        "ENOTFOUND",
        "EAI_AGAIN",
        "UND_ERR_SOCKET",
      ].some((code) => codes.has(code))
    ) {
      return { status: 502, code: "upstream_unreachable" };
    }
    return { status: 502, code: "upstream_error" };
  }
  return { status: 503, code: "unknown_error" };
}

/** Logs a safe, structured record of a backend-call failure (operation, error code/status, duration — never the request body, credentials, or tokens) and returns the status/code to respond with. */
export function logBackendFailure(
  operation: string,
  error: unknown,
  startedAt: number,
  requestId?: string | null,
): { status: number; code: string } {
  const classified = classifyBackendError(error);
  console.error(`[backend:${operation}] request failed`, {
    code: classified.code,
    status: classified.status,
    upstreamHost: backendHost,
    durationMs: Date.now() - startedAt,
    requestId: requestId || undefined,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  return classified;
}

/** Records a completed non-2xx upstream response without logging its payload. */
export function logBackendResponseFailure(
  operation: string,
  status: number,
  startedAt: number,
  requestId?: string | null,
): void {
  console.error(`[backend:${operation}] upstream response failed`, {
    status,
    upstreamHost: backendHost,
    durationMs: Date.now() - startedAt,
    requestId: requestId || undefined,
  });
}

export async function backendJson<T = unknown>(
  path: string,
  config: AxiosRequestConfig = {},
): Promise<AxiosResponse<T>> {
  return backendRequest<T>(path, {
    ...config,
    headers: {
      "Content-Type": "application/json",
      ...config.headers,
    },
  });
}
