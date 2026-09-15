import { describe, expect, it } from "vitest";
import { getBackendUrl } from "@/lib/api/backend-http";

describe("getBackendUrl", () => {
  it("normalizes slashes and adds exactly one Django trailing slash", () => {
    expect(getBackendUrl("///auth/login///")).toBe(
      "https://api.baraqapp.com/api/v1/auth/login/",
    );
    expect(getBackendUrl("admin/me")).toBe(
      "https://api.baraqapp.com/api/v1/admin/me/",
    );
    expect(getBackendUrl("//evil.example/path")).toBe(
      "https://api.baraqapp.com/api/v1/evil.example/path/",
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
    "/../admin",
    "/%2e%2e/admin",
    "/safe%2fescape",
    "/safe\\escape",
    "/path#fragment",
    "/bad%encoding",
  ])("rejects unsafe or externally-routable path %s", (path) => {
    expect(() => getBackendUrl(path)).toThrow("Invalid backend path");
  });
});
