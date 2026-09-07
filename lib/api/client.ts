"use client";

import { isApiBindingEnabled, offlineStubForPath } from "@/lib/api/binding";
import { getErrorMessage, normalizeEnvelope } from "@/lib/api/normalize";
import type { ApiEnvelope } from "@/types/api";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const part = document.cookie.split("; ").find((item) => item.startsWith(prefix));
  return part ? decodeURIComponent(part.slice(prefix.length)) : null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const method = (init.method ?? "GET").toUpperCase();

  // Binding paused: keep call sites intact, skip network.
  if (!isApiBindingEnabled()) {
    return normalizeEnvelope<T>(offlineStubForPath(path, method));
  }

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrf = readCookie("baraq_csrf");
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }

  const response = await fetch(`/api/bff/${path.replace(/^\/+/, "")}`, {
    ...init,
    method,
    headers,
    credentials: "same-origin",
    cache: "no-store"
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload: unknown = contentType.includes("application/json")
    ? await response.json()
    : { message: await response.text() };

  if (!response.ok) throw new Error(getErrorMessage(payload, `HTTP ${response.status}`));
  return normalizeEnvelope<T>(payload);
}

export const api = {
  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>) {
    const query = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== "") query.set(key, String(value));
    });
    const suffix = query.size ? `?${query.toString()}` : "";
    return request<T>(`${path}${suffix}`);
  },
  post<T>(path: string, body?: unknown) {
    return request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
  },
  patch<T>(path: string, body: unknown) {
    return request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
  },
  delete<T>(path: string) {
    return request<T>(path, { method: "DELETE" });
  }
};
