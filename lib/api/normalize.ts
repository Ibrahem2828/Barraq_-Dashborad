import type { ApiEnvelope, ListPayload, Paginated } from "@/types/api";

export function normalizeEnvelope<T>(payload: unknown): ApiEnvelope<T> {
  if (payload && typeof payload === "object" && "success" in payload && "data" in payload) {
    return payload as ApiEnvelope<T>;
  }
  return {
    success: true,
    data: payload as T,
    meta: {},
    error: null
  };
}

export function normalizeList<T>(payload: ListPayload<T>): Paginated<T> {
  if (Array.isArray(payload)) {
    return { count: payload.length, next: null, previous: null, results: payload };
  }
  return payload;
}

export function getErrorMessage(payload: unknown, fallback = "تعذر تنفيذ الطلب"): string {
  if (!payload || typeof payload !== "object") return fallback;
  const value = payload as Record<string, unknown>;
  if (typeof value.message === "string") return value.message;
  if (value.error && typeof value.error === "object") {
    const error = value.error as Record<string, unknown>;
    if (typeof error.message === "string") return error.message;
  }
  if (typeof value.detail === "string") return value.detail;
  if (value.errors && typeof value.errors === "object") {
    const first = Object.values(value.errors as Record<string, unknown>)[0];
    if (typeof first === "string") return first;
    if (Array.isArray(first) && typeof first[0] === "string") return first[0];
  }
  return fallback;
}
