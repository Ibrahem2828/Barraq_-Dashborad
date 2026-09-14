/**
 * API binding switch.
 *
 * Set API_BINDING_FORCE_PAUSED = true to hard-disable backend traffic,
 * regardless of env flags. When paused/disabled, auth and BFF refuse
 * access — no offline login cookies and no privileged stubs.
 *
 * Live binding requires:
 * 1) API_BINDING_FORCE_PAUSED = false
 * 2) API_BINDING_ENABLED=true
 * 3) NEXT_PUBLIC_API_BINDING_ENABLED=true (baked at build for the browser)
 * 4) BACKEND_API_URL ending with /api/v1 (see dashboard_api_contract.json)
 */
const API_BINDING_FORCE_PAUSED = false;

function flagTrue(value: string | undefined): boolean {
  return (value ?? "false").toLowerCase() === "true";
}

/**
 * Binding is enabled only when every relevant flag says so.
 * Server: both API_BINDING_ENABLED and NEXT_PUBLIC_API_BINDING_ENABLED must be true
 * so a false public bake cannot produce a half-live privileged mode.
 * Browser: only NEXT_PUBLIC_API_BINDING_ENABLED is available (inlined at build).
 */
export function isApiBindingEnabled(): boolean {
  if (API_BINDING_FORCE_PAUSED) return false;

  const publicOn = flagTrue(process.env.NEXT_PUBLIC_API_BINDING_ENABLED);
  if (typeof window !== "undefined") return publicOn;

  const serverOn = flagTrue(process.env.API_BINDING_ENABLED);
  return serverOn && publicOn;
}

export function bindingDisabledPayload() {
  return {
    success: false as const,
    message: "API binding is disabled. Live backend authentication is required.",
    code: "api_binding_disabled",
    data: { authenticated: false, verified: false }
  };
}
