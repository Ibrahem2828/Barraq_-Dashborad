import { describe, expect, it } from "vitest";

import { apiErrorMessage } from "@/lib/api/error-messages";
import { ApiError } from "@/lib/api/normalize";
import { getDictionary } from "@/lib/i18n/dictionaries";
import {
  ActivationFormError,
  buildActivationBody,
  looksLikeCardNumber,
  paidPlanOptions,
  parseActivationDays,
  paymentReferenceProblem
} from "@/lib/subscriptions/activation";

const messages = {
  planRequired: "plan",
  methodRequired: "method",
  referenceInvalid: "reference",
  referenceCard: "card",
  periodInvalid: "period"
};
const NOW = new Date("2026-10-27T10:00:00.000Z");

const valid = {
  plan_code: "premium",
  payment_method: "bank_transfer",
  payment_reference: "TRX-2026/10/00123",
  days: "",
  note: ""
};

describe("paymentReferenceProblem", () => {
  it("accepts ordinary transfer and receipt references", () => {
    for (const reference of ["TRX-2026/10/00123", "BANK:998877665544", "receipt #4471", "حوالة 4471"]) {
      expect(paymentReferenceProblem(reference), reference).toBeNull();
    }
  });

  it("refuses references that are too short, too long or use other characters", () => {
    for (const reference of ["", "   ", "ab", "x".repeat(121), "<script>1</script>", "ref;DROP"]) {
      expect(paymentReferenceProblem(reference), reference).toBe("invalid");
    }
  });

  it("refuses a reference that is only separators or has too few letters and digits", () => {
    for (const reference of ["----", ". . . .", "ab--", "#-/-"]) {
      expect(paymentReferenceProblem(reference), reference).toBe("invalid");
    }
  });

  it("refuses a valid card number, with or without separators", () => {
    expect(paymentReferenceProblem("4111111111111111")).toBe("card");
    expect(paymentReferenceProblem("4111 1111 1111 1111")).toBe("card");
    expect(paymentReferenceProblem("4111-1111-1111-1111")).toBe("card");
  });

  it("does not mistake a long receipt number that fails the card check for a card", () => {
    expect(looksLikeCardNumber("1234567890123456")).toBe(false);
    expect(paymentReferenceProblem("1234567890123456")).toBeNull();
  });
});

describe("parseActivationDays", () => {
  it("treats an empty box as the plan's own length", () => {
    expect(parseActivationDays("")).toBeNull();
    expect(parseActivationDays("  ")).toBeNull();
  });

  it("accepts whole days from 1 to 1825", () => {
    expect(parseActivationDays("30")).toBe(30);
    expect(parseActivationDays("1825")).toBe(1825);
  });

  it("rejects zero, negatives, fractions, text and anything past five years", () => {
    for (const raw of ["0", "-5", "1.5", "abc", "1826", "30 days"]) {
      expect(parseActivationDays(raw), raw).toBe("invalid");
    }
  });
});

describe("buildActivationBody", () => {
  it("builds the request the backend expects", () => {
    expect(buildActivationBody(valid, messages, NOW)).toEqual({
      plan_code: "premium",
      payment_method: "bank_transfer",
      payment_reference: "TRX-2026/10/00123"
    });
  });

  it("normalises the reference and trims the note", () => {
    const body = buildActivationBody(
      { ...valid, payment_reference: "  TRX   9001 ", note: "  checked  " },
      messages,
      NOW
    );
    expect(body.payment_reference).toBe("TRX 9001");
    expect(body.note).toBe("checked");
  });

  it("turns a number of days into an absolute end", () => {
    const body = buildActivationBody({ ...valid, days: "90" }, messages, NOW);
    expect(body.current_period_end).toBe("2027-01-25T10:00:00.000Z");
  });

  it("names the first problem in the operator's words", () => {
    const failure = (values: Record<string, string>) => {
      try {
        buildActivationBody({ ...valid, ...values }, messages, NOW);
      } catch (error) {
        expect(error).toBeInstanceOf(ActivationFormError);
        return (error as Error).message;
      }
      return null;
    };
    expect(failure({ plan_code: "" })).toBe("plan");
    expect(failure({ payment_method: "" })).toBe("method");
    expect(failure({ payment_method: "crypto" })).toBe("method");
    expect(failure({ payment_reference: "ab" })).toBe("reference");
    expect(failure({ payment_reference: "4111111111111111" })).toBe("card");
    expect(failure({ days: "0" })).toBe("period");
  });
});

describe("paidPlanOptions", () => {
  it("offers only active, non-free plans in the catalogue's order", () => {
    const options = paidPlanOptions([
      { code: "pro", name: "Pro", billing_interval: "monthly", is_active: true, sort_order: 30 },
      { code: "free", name: "Free", billing_interval: "free", is_active: true, sort_order: 10 },
      { code: "old", name: "Old", billing_interval: "monthly", is_active: false, sort_order: 5 },
      { code: "premium", name: "Premium", billing_interval: "monthly", is_active: true, sort_order: 20 }
    ]);
    expect(options).toEqual([
      { label: "Premium (premium)", value: "premium" },
      { label: "Pro (pro)", value: "pro" }
    ]);
  });
});

describe("apiErrorMessage", () => {
  const dictionary = getDictionary("ar");

  it("replaces a known domain code with the operator's sentence", () => {
    const reason = new ApiError("Generic English", { status: 409, code: "payment_reference_already_used" });
    expect(apiErrorMessage(reason, dictionary, "x")).toBe(dictionary.errPaymentReferenceUsed);
  });

  it("maps the old grant path's refusal to the instruction to use activation", () => {
    const reason = new ApiError("A paid plan can only be granted", {
      status: 400,
      code: "payment_activation_required"
    });
    expect(apiErrorMessage(reason, dictionary, "x")).toBe(dictionary.errPaymentActivationRequired);
  });

  it("keeps the backend's own text for every other error", () => {
    expect(
      apiErrorMessage(new ApiError("Forbidden", { status: 403, code: "permission_denied" }), dictionary, "x")
    ).toBe("Forbidden");
    expect(apiErrorMessage(new Error("boom"), dictionary, "x")).toBe("boom");
    expect(apiErrorMessage("weird", dictionary, "fallback")).toBe("fallback");
  });
});
