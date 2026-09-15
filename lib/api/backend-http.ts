import "server-only";

import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";

const backendBase = (process.env.BACKEND_API_URL ?? "https://api.barraq.xn--mgbaab0cxheq.tech/api/v1").replace(/\/$/, "");

export function getBackendUrl(path: string): string {
  const clean = path.replace(/^\/+/, "");
  return `${backendBase}/${clean}`;
}

/** Server-side axios for upstream Admin API calls (auth routes + BFF). Uses the fetch adapter so it goes through the runtime's global fetch (Next.js/Node's native implementation, or a test's stubbed one) instead of opening raw sockets itself. */
export const backendHttp = axios.create({
  adapter: "fetch",
  timeout: 45_000,
  // Mirror fetch: callers inspect status themselves.
  validateStatus: () => true,
  headers: {
    Accept: "application/json"
  },
  // NOTE: inert with the "fetch" adapter (axios's fetch adapter never reads
  // maxRedirects/passes redirect:'manual' to the underlying fetch — verified
  // against node_modules/axios/lib/adapters/fetch.js), so Node's fetch
  // silently follows any redirect Django sends. Real redirect suppression
  // is a fail-closed check in backendRequest() below instead.
  maxRedirects: 0
});

/** Thrown by backendRequest() when the backend responds with an unexpected 3xx, so every caller's existing catch block handles it instead of a raw redirect status leaking to a browser/API client. */
export class BackendRedirectError extends Error {
  constructor(
    public readonly status: number,
    public readonly location: string | undefined
  ) {
    super(`Unexpected redirect from backend (status ${status}, location ${location ?? "unknown"})`);
    this.name = "BackendRedirectError";
  }
}

export async function backendRequest<T = unknown>(
  path: string,
  config: AxiosRequestConfig = {}
): Promise<AxiosResponse<T>> {
  const url = path.startsWith("http") ? path : getBackendUrl(path);
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
      "X-Forwarded-Proto": "https",
      ...config.headers
    }
  });
  if (response.status >= 300 && response.status < 400) {
    throw new BackendRedirectError(response.status, response.headers?.location as string | undefined);
  }
  return response;
}

/**
 * Classifies a thrown backendRequest()/backendJson() error for an accurate
 * (but non-sensitive) HTTP status and error code — never the same flat
 * status for every failure kind.
 */
export function classifyBackendError(error: unknown): { status: number; code: string } {
  if (error instanceof BackendRedirectError) {
    return { status: 502, code: "upstream_redirect" };
  }
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") {
      return { status: 504, code: "upstream_timeout" };
    }
    const causeCode = (error.cause as { code?: string } | undefined)?.code;
    if (causeCode === "ECONNREFUSED" || causeCode === "ENOTFOUND" || causeCode === "EAI_AGAIN") {
      return { status: 502, code: "upstream_unreachable" };
    }
    return { status: 502, code: "upstream_error" };
  }
  return { status: 503, code: "unknown_error" };
}

/** Logs a safe, structured record of a backend-call failure (operation, error code/status, duration — never the request body, credentials, or tokens) and returns the status/code to respond with. */
export function logBackendFailure(operation: string, error: unknown, startedAt: number): { status: number; code: string } {
  const classified = classifyBackendError(error);
  console.error(`[backend:${operation}] request failed`, {
    code: classified.code,
    status: classified.status,
    durationMs: Date.now() - startedAt,
    message: error instanceof Error ? error.message : String(error)
  });
  return classified;
}

export async function backendJson<T = unknown>(
  path: string,
  config: AxiosRequestConfig = {}
): Promise<AxiosResponse<T>> {
  return backendRequest<T>(path, {
    ...config,
    headers: {
      "Content-Type": "application/json",
      ...config.headers
    }
  });
}
