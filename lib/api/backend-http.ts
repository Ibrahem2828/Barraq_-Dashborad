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
  maxRedirects: 0
});

export async function backendRequest<T = unknown>(
  path: string,
  config: AxiosRequestConfig = {}
): Promise<AxiosResponse<T>> {
  const url = path.startsWith("http") ? path : getBackendUrl(path);
  return backendHttp.request<T>({
    ...config,
    url,
    headers: {
      Accept: "application/json",
      ...config.headers
    }
  });
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
