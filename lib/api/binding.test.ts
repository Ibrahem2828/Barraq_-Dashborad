import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isApiBindingEnabled, offlineStubForPath } from "./binding";

const ENV_KEYS = ["NEXT_PUBLIC_API_BINDING_ENABLED", "API_BINDING_ENABLED"] as const;
type EnvSnapshot = Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>;

function setEnv(values: EnvSnapshot) {
  for (const key of ENV_KEYS) {
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
}

describe("isApiBindingEnabled", () => {
  let original: EnvSnapshot;

  beforeEach(() => {
    original = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]])) as EnvSnapshot;
  });

  afterEach(() => {
    setEnv(original);
  });

  it("is disabled when neither flag is set", () => {
    setEnv({});
    expect(isApiBindingEnabled()).toBe(false);
  });

  it("is enabled when the public flag is 'true'", () => {
    setEnv({ NEXT_PUBLIC_API_BINDING_ENABLED: "true" });
    expect(isApiBindingEnabled()).toBe(true);
  });

  it("is case-insensitive", () => {
    setEnv({ NEXT_PUBLIC_API_BINDING_ENABLED: "TRUE" });
    expect(isApiBindingEnabled()).toBe(true);
  });

  it("falls back to the server-only flag when the public one is unset", () => {
    setEnv({ API_BINDING_ENABLED: "true" });
    expect(isApiBindingEnabled()).toBe(true);
  });

  it("prefers the public flag over the server flag when both are set", () => {
    setEnv({ NEXT_PUBLIC_API_BINDING_ENABLED: "false", API_BINDING_ENABLED: "true" });
    expect(isApiBindingEnabled()).toBe(false);
  });

  it("treats any non-'true' value as disabled", () => {
    setEnv({ NEXT_PUBLIC_API_BINDING_ENABLED: "1" });
    expect(isApiBindingEnabled()).toBe(false);
  });
});

describe("offlineStubForPath", () => {
  it("returns a fixed offline admin identity for admin/me/", () => {
    const stub = offlineStubForPath("admin/me/");
    expect(stub.success).toBe(true);
    expect((stub.data as { role: string }).role).toBe("offline");
  });

  it("normalizes leading slashes, trailing slashes, and query strings to the same key", () => {
    const a = offlineStubForPath("admin/me/");
    const b = offlineStubForPath("/admin/me");
    const c = offlineStubForPath("admin/me?foo=bar");
    expect(a).toEqual(b);
    expect(a).toEqual(c);
  });

  it("returns the shared empty-list stub for an unrecognized read path", () => {
    const stub = offlineStubForPath("some/unknown/list/");
    expect(stub.data).toEqual({ count: 0, next: null, previous: null, results: [] });
  });

  it("returns a generic 'paused' stub for any mutation, regardless of path", () => {
    const stub = offlineStubForPath("admin/users/1/suspend/", "POST");
    expect(stub.success).toBe(true);
    expect(stub.data).toEqual({ paused: true, path: "admin/users/1/suspend/" });
  });

  it("treats HEAD like GET (a real read), not like a mutation", () => {
    const stub = offlineStubForPath("admin/overview/", "HEAD");
    expect((stub.data as { system_health: unknown }).system_health).toBeDefined();
  });

  it("returns the AI usage stub shape with the fields the AIUsageDashboard component reads", () => {
    const stub = offlineStubForPath("admin/ai-usage/");
    const data = stub.data as { totals: { cost_usd: number }; daily: unknown[]; by_character: unknown[] };
    expect(data.totals.cost_usd).toBe(0);
    expect(Array.isArray(data.daily)).toBe(true);
    expect(Array.isArray(data.by_character)).toBe(true);
  });
});
