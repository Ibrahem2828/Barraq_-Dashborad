import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const ENV_KEYS = ["NODE_ENV", "NEXT_PUBLIC_API_BINDING_ENABLED", "API_BINDING_ENABLED"] as const;
type EnvSnapshot = Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>;

// NODE_ENV is typed read-only by @types/node; vi.stubEnv/unstubAllEnvs is
// the sanctioned way to override it (and any other env var) per-test.
function setEnv(values: EnvSnapshot) {
  for (const key of ENV_KEYS) {
    if (values[key] !== undefined) vi.stubEnv(key, values[key]);
  }
}

function loginRequest() {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "someone@example.com", password: "whatever" })
  });
}

describe("POST /api/auth/login — offline-bypass safety", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("refuses to mint an unauthenticated session in production, even with binding explicitly disabled", async () => {
    setEnv({ NODE_ENV: "production", NEXT_PUBLIC_API_BINDING_ENABLED: "false" });
    const response = await POST(loginRequest());
    const body = (await response.json()) as { success: boolean };

    expect(response.status).toBe(503);
    expect(body.success).toBe(false);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("refuses to mint an unauthenticated session in production when the binding flag is simply unset", async () => {
    setEnv({ NODE_ENV: "production" });
    // With no flag set, isApiBindingEnabled() now defaults to true in
    // production, so this attempts a real backend call. Stub fetch to fail
    // fast instead of actually hitting the network — the point of this test
    // is only that the outcome is never a 200 with offline auth cookies.
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unreachable")));

    const response = await POST(loginRequest());
    const body = (await response.json()) as { success: boolean };

    expect(response.status).toBe(503);
    expect(body.success).toBe(false);
    expect(response.headers.get("set-cookie")).toBeNull();

    vi.unstubAllGlobals();
  });

  it("still allows the offline bypass outside production, for local dev without a backend", async () => {
    setEnv({ NODE_ENV: "development", NEXT_PUBLIC_API_BINDING_ENABLED: "false" });
    const response = await POST(loginRequest());
    const body = (await response.json()) as { success: boolean; data: { offline: boolean } };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.offline).toBe(true);
    expect(response.headers.get("set-cookie")).toBeTruthy();
  });
});
