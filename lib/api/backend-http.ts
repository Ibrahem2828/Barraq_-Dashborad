import "server-only";

import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";

const backendBase = (process.env.BACKEND_API_URL ?? "https://api.barraq.xn--mgbaab0cxheq.tech/api/v1").replace(/\/$/, "");

export function getBackendUrl(path: string): string {
  const clean = path.replace(/^\/+/, "");
  return `${backendBase}/${clean}`;
}

/** Server-side axios for upstream Admin API calls (auth routes + BFF). */
export const backendHttp = axios.create({
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
