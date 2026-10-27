import { ApiError } from "@/lib/api/normalize";
import type { Dictionary } from "@/lib/i18n/dictionaries";

/**
 * Backend failures that have a stable, branchable `code` and a sentence an
 * operator can act on. The backend's own text is English and generic; these
 * say what to do, in the dashboard's language.
 */
const MESSAGE_KEYS = {
  payment_activation_required: "errPaymentActivationRequired",
  payment_reference_already_used: "errPaymentReferenceUsed",
  payment_reference_looks_like_card: "errPaymentReferenceCard",
  invalid_payment_reference: "errPaymentReferenceInvalid",
  plan_not_paid: "errPlanNotPaid",
  period_end_required: "errPeriodRequired",
  period_end_in_past: "errPeriodInvalid",
  period_end_too_far: "errPeriodInvalid",
  period_end_before_existing: "errPeriodInvalid",
  period_end_not_allowed: "errPeriodNotAllowed"
} as const satisfies Record<string, keyof Dictionary>;

export function apiErrorMessage(reason: unknown, dictionary: Dictionary, fallback: string): string {
  if (reason instanceof ApiError && reason.code && reason.code in MESSAGE_KEYS) {
    return dictionary[MESSAGE_KEYS[reason.code as keyof typeof MESSAGE_KEYS]];
  }
  return reason instanceof Error ? reason.message : fallback;
}
