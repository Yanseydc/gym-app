// rest_seconds is the single stored contract (integer seconds, DB column
// client_routine_exercises.rest_seconds). formatRestTime (minutes-oriented)
// stays exactly as-is: it's used by the client portal view, which Entrega A0
// deliberately does not touch. formatRestSeconds is the new, coach-facing
// display used by the builder/template/detail views so what the coach types
// and what they read back are always the same unit.

export function formatRestTime(restSeconds: number | null | undefined, fallback = "N/D") {
  if (restSeconds == null) {
    return fallback;
  }

  if (restSeconds < 60) {
    return `${restSeconds} sec`;
  }

  const minutes = restSeconds / 60;

  if (Number.isInteger(minutes)) {
    return `${minutes} min`;
  }

  return `${Number(minutes.toFixed(1))} min`;
}

export function formatRestSeconds(restSeconds: number | null | undefined, fallback: string) {
  if (restSeconds == null) {
    return fallback;
  }

  return `${restSeconds} s`;
}

export const REST_SECONDS_QUICK_PICKS = [30, 45, 60, 90, 120] as const;

export const REST_SECONDS_MAX = 3600;

export type RestSecondsInvalidReason = "not_integer" | "negative" | "too_large";

export type RestSecondsValidation =
  | { valid: true; value: number | null }
  | { valid: false; reason: RestSecondsInvalidReason };

/** Pure validation for a raw rest-seconds form value (already-trimmed
 * string). Empty string is valid and means "no rest specified" (null). */
export function validateRestSeconds(rawValue: string): RestSecondsValidation {
  if (rawValue.trim() === "") {
    return { valid: true, value: null };
  }

  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return { valid: false, reason: "not_integer" };
  }

  if (parsed < 0) {
    return { valid: false, reason: "negative" };
  }

  if (parsed > REST_SECONDS_MAX) {
    return { valid: false, reason: "too_large" };
  }

  return { valid: true, value: parsed };
}

// Stable English messages produced by the Zod schema in validators/routine.ts
// (restSecondsFieldSchema) -- kept here, not there, so this file has no
// dependency on the validators module. classifyRestSecondsFieldError maps
// them back to the same "reason" keys validateRestSeconds produces, so a
// caller can localize either source of truth (client-side pre-validation or
// server-side Zod parse) through one t() lookup.
export const REST_SECONDS_NOT_INTEGER_MESSAGE = "Rest must be a whole number of seconds.";
export const REST_SECONDS_NEGATIVE_MESSAGE = "Rest must be zero or greater.";
export const REST_SECONDS_TOO_LARGE_MESSAGE = `Rest must be ${REST_SECONDS_MAX} seconds or less.`;

export function classifyRestSecondsFieldError(
  rawMessage: string | null | undefined,
): RestSecondsInvalidReason | null {
  switch (rawMessage) {
    case REST_SECONDS_NOT_INTEGER_MESSAGE:
      return "not_integer";
    case REST_SECONDS_NEGATIVE_MESSAGE:
      return "negative";
    case REST_SECONDS_TOO_LARGE_MESSAGE:
      return "too_large";
    default:
      return null;
  }
}
