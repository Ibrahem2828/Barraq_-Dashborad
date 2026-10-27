/**
 * Pure rules behind the "activate paid subscription" form.
 *
 * The backend is authoritative (apps/subscriptions/activation.py); these
 * checks mirror it only so an operator hears what is wrong in their own
 * language before a request is sent. Anything they let through, the backend
 * still refuses.
 */

export const PAYMENT_METHODS = [
  "bank_transfer",
  "cash",
  "mobile_wallet",
  "external_gateway",
  "other"
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Longest explicit length the form offers: the backend refuses anything past 5 years. */
export const MAX_ACTIVATION_DAYS = 1825;

const REFERENCE_PATTERN = /^[\p{L}\p{N}_\-./:# ]{4,120}$/u;

export function normalizePaymentReference(raw: string): string {
  return raw.normalize("NFKC").replace(/\s+/gu, " ").trim();
}

function luhnValid(digits: string): boolean {
  let total = 0;
  for (let index = 0; index < digits.length; index += 1) {
    let digit = Number(digits[digits.length - 1 - index]);
    if (index % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    total += digit;
  }
  return total % 10 === 0;
}

/** A valid card number is never a payment reference: it would put card data in Baraq's records. */
export function looksLikeCardNumber(value: string): boolean {
  const digits = value.replace(/[\s-]/gu, "");
  return /^\d{13,19}$/u.test(digits) && luhnValid(digits);
}

export type ReferenceProblem = "invalid" | "card";

export function paymentReferenceProblem(raw: string): ReferenceProblem | null {
  const reference = normalizePaymentReference(raw);
  if (!REFERENCE_PATTERN.test(reference)) return "invalid";
  if (looksLikeCardNumber(reference)) return "card";
  return null;
}

/** Empty means "use the plan's own length"; otherwise a whole number of days in range. */
export function parseActivationDays(raw: string): number | null | "invalid" {
  const text = raw.trim();
  if (!text) return null;
  if (!/^\d+$/u.test(text)) return "invalid";
  const days = Number(text);
  return days >= 1 && days <= MAX_ACTIVATION_DAYS ? days : "invalid";
}

export function periodEndAfterDays(days: number, now: Date): string {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

export interface ActivationMessages {
  planRequired: string;
  methodRequired: string;
  referenceInvalid: string;
  referenceCard: string;
  periodInvalid: string;
}

export interface ActivationBody {
  plan_code: string;
  payment_method: PaymentMethod;
  payment_reference: string;
  note?: string;
  current_period_end?: string;
}

/** Thrown with text meant for the operator; the form shows it inline. */
export class ActivationFormError extends Error {}

export function buildActivationBody(
  values: Record<string, string | number | boolean>,
  messages: ActivationMessages,
  now: Date
): ActivationBody {
  const planCode = String(values.plan_code ?? "").trim();
  if (!planCode) throw new ActivationFormError(messages.planRequired);

  const method = String(values.payment_method ?? "");
  if (!(PAYMENT_METHODS as readonly string[]).includes(method)) {
    throw new ActivationFormError(messages.methodRequired);
  }

  const problem = paymentReferenceProblem(String(values.payment_reference ?? ""));
  if (problem === "invalid") throw new ActivationFormError(messages.referenceInvalid);
  if (problem === "card") throw new ActivationFormError(messages.referenceCard);

  const days = parseActivationDays(String(values.days ?? ""));
  if (days === "invalid") throw new ActivationFormError(messages.periodInvalid);

  const body: ActivationBody = {
    plan_code: planCode,
    payment_method: method as PaymentMethod,
    payment_reference: normalizePaymentReference(String(values.payment_reference))
  };
  const note = String(values.note ?? "").trim();
  if (note) body.note = note.slice(0, 500);
  if (days !== null) body.current_period_end = periodEndAfterDays(days, now);
  return body;
}

export interface PlanOption {
  label: string;
  value: string;
}

interface PlanRow {
  code?: unknown;
  name?: unknown;
  billing_interval?: unknown;
  is_active?: unknown;
  sort_order?: unknown;
}

/** Only an active plan that is not the free one can be activated against a payment. */
export function paidPlanOptions(rows: PlanRow[]): PlanOption[] {
  return rows
    .filter((row) => row.is_active !== false && row.billing_interval !== "free" && row.code)
    .sort((left, right) => Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0))
    .map((row) => ({
      label: row.name ? `${String(row.name)} (${String(row.code)})` : String(row.code),
      value: String(row.code)
    }));
}
