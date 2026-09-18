import { describe, expect, it } from "vitest";
import axios from "axios";
import {
  BackendResponseError,
  classifyBackendError,
  getBackendUrl,
} from "@/lib/api/backend-http";

describe("getBackendUrl", () => {
  it("normalizes slashes and adds exactly one Django trailing slash", () => {
    expect(getBackendUrl("///auth/login///")).toBe(
      "https://api.baraqapp.com/api/v1/auth/login/",
    );
    expect(getBackendUrl("admin/me")).toBe(
      "https://api.baraqapp.com/api/v1/admin/me/",
    );
  });

  it("preserves an encoded query without re-encoding it", () => {
    expect(
      getBackendUrl("subjects/?search=%D8%B9%D9%84%D9%88%D9%85&page=2"),
    ).toBe(
      "https://api.baraqapp.com/api/v1/subjects/?search=%D8%B9%D9%84%D9%88%D9%85&page=2",
    );
  });

  it.each([
    "https://evil.example/path",
    "//evil.example/path",
    "/../admin",
    "/%2e%2e/admin",
    "/safe%2fescape",
    "/safe\\escape",
    "/path#fragment",
    "/bad%encoding",
  ])("rejects unsafe or externally-routable path %s", (path) => {
    expect(() => getBackendUrl(path)).toThrow("Invalid backend path");
  });

  it("classifies nested fetch-adapter connection failures", () => {
    const cause = new AggregateError([
      Object.assign(new Error("connect refused"), { code: "ECONNREFUSED" }),
    ]);
    const error = new axios.AxiosError("Network Error", "ERR_NETWORK");
    Object.defineProperty(error, "cause", { value: cause });

    expect(classifyBackendError(error)).toEqual({
      status: 502,
      code: "upstream_unreachable",
    });
    expect(classifyBackendError(new BackendResponseError(503))).toEqual({
      status: 503,
      code: "upstream_response_error",
    });
  });
});
