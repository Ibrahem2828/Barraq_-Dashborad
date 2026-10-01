import { describe, expect, it } from "vitest";
import { getErrorMessage } from "@/lib/api/normalize";

/**
 * Django's 400 envelope says only "Validation error"; the reason an operator
 * can act on lives in `errors`. The create-user form showed the former.
 */
describe("getErrorMessage", () => {
  it("prefers the field message of a validation error", () => {
    const payload = {
      success: false,
      message: "Validation error",
      code: "validation_error",
      errors: { organization: ["Choose the organization this account belongs to."] }
    };

    expect(getErrorMessage(payload)).toBe("Choose the organization this account belongs to.");
  });

  it("keeps the envelope message for other errors", () => {
    const payload = {
      success: false,
      message: "You do not have permission to perform this admin action.",
      code: "permission_denied",
      errors: { detail: "You do not have permission to perform this admin action." }
    };

    expect(getErrorMessage(payload)).toBe("You do not have permission to perform this admin action.");
  });

  it("falls back to the envelope message when a validation error has no field detail", () => {
    expect(getErrorMessage({ message: "Validation error", code: "validation_error", errors: {} })).toBe(
      "Validation error"
    );
  });
});
