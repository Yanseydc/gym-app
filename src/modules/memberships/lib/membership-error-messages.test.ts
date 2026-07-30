// Run with: npx tsx --test src/modules/memberships/lib/membership-error-messages.test.ts
// Pure module - no env vars needed.
import assert from "node:assert/strict";
import { test } from "node:test";

import en from "../../../../locales/en.json";
import es from "../../../../locales/es.json";
import { isExtendOverlapConflict, mapKnownMembershipError } from "./membership-error-messages";

// Mirrors registerMembershipPayment's exact fallback expression
// (membership-operations.ts):
//   mapKnownMembershipError(error) ?? t("memberships.operations.feedback.paymentFailed")
function resolvePaymentErrorMessage(rawMessage: string, locale: "en" | "es") {
  const fallback = (locale === "es" ? es : en).memberships.operations.feedback.paymentFailed;
  return mapKnownMembershipError(rawMessage) ?? fallback;
}

// Regression coverage: these are the exact messages
// assign-membership.ts's KNOWN_RPC_ERROR_MESSAGES dict + inline idempotency
// checks used to hardcode before being extracted into this shared module.
// assign-membership.ts falls back to the raw message when this returns
// null, so its behavior is unchanged as long as every one of these still
// maps the same way.
test("assign-membership regression: known assign_membership_with_payment messages map unchanged", () => {
  assert.equal(
    mapKnownMembershipError("This client already has a membership occupying that period."),
    "Este cliente ya tiene una membresía que ocupa ese período. Elige otra fecha de inicio o revisa la membresía actual.",
  );
  assert.equal(
    mapKnownMembershipError("Payment amount exceeds the plan price."),
    "El monto del pago supera el precio del plan. Verifica el monto ingresado.",
  );
  assert.equal(
    mapKnownMembershipError("Selected membership plan is not available."),
    "El plan de membresía seleccionado no está disponible.",
  );
  assert.equal(
    mapKnownMembershipError("Client not found or not accessible."),
    "El cliente no fue encontrado o no está disponible.",
  );
  assert.equal(
    mapKnownMembershipError("Client and membership plan belong to different gyms."),
    "El cliente y el plan de membresía pertenecen a gimnasios distintos.",
  );
});

test("assign-membership regression: the two idempotency substring checks still match", () => {
  assert.equal(
    mapKnownMembershipError("assign_membership_with_payment: idempotency_key reused with different membership parameters"),
    "Esta solicitud ya fue procesada con datos de membresía distintos. Recarga la página e inténtalo de nuevo.",
  );
  assert.equal(
    mapKnownMembershipError("assign_membership_with_payment: idempotency_key reused with different payment parameters"),
    "Esta solicitud ya fue procesada con datos de pago distintos. Recarga la página e inténtalo de nuevo.",
  );
});

test("assign-membership regression: an unmapped message returns null (caller falls back to the raw message, unchanged)", () => {
  assert.equal(mapKnownMembershipError("assign_membership_with_payment: idempotency key conflict could not be resolved"), null);
  assert.equal(mapKnownMembershipError("some totally new Postgres error"), null);
});

// New mappings needed for register_membership_payment specifically.
test("register_membership_payment: idempotency_key reused with different payment parameters", () => {
  assert.equal(
    mapKnownMembershipError("register_membership_payment: idempotency_key reused with different payment parameters"),
    "Esta solicitud ya fue procesada con datos de pago distintos. Recarga la página e inténtalo de nuevo.",
  );
});

test("register_membership_payment: membership lookup failures map to safe messages", () => {
  assert.equal(
    mapKnownMembershipError("Selected membership is not available."),
    "La membresía seleccionada no está disponible.",
  );
  assert.equal(
    mapKnownMembershipError("Selected membership does not belong to the selected client."),
    "La membresía seleccionada no pertenece al cliente seleccionado.",
  );
});

test("the payments_validate_amount trigger's raw overpay message never leaks - maps to a safe message", () => {
  assert.equal(
    mapKnownMembershipError("payments: amount 50.00 exceeds remaining balance 0.00 for membership 00000000-0000-0000-0000-000000000005"),
    "El monto ingresado supera el saldo pendiente de esta membresía. Actualiza la página para ver el saldo actual.",
  );
});

test("the payments_validate_gym trigger's raw messages never leak - map to safe messages", () => {
  assert.notEqual(
    mapKnownMembershipError("payments: client and client_membership belong to different gyms (client_gym=a, membership_gym=b)"),
    null,
  );
  assert.notEqual(mapKnownMembershipError("payments: client_membership_id xyz not found"), null);
  assert.notEqual(mapKnownMembershipError("payments: client_id xyz not found"), null);
});

// registerMembershipPayment must never forward a raw/unknown Postgres,
// PostgREST or RPC message to the user - unlike assign-membership.ts, which
// intentionally keeps its old raw-message fallback (see the "regression"
// test above). Every message here is realistic: a mix of genuinely
// unexpected Postgres/PostgREST errors, and
// "register_membership_payment: idempotency key conflict could not be
// resolved" - the RPC's own internal message for the pathological
// cross-tenant idempotency-key-collision case, confirmed to actually occur
// against a real (disposable, RLS-enabled) Postgres instance while
// verifying gym isolation for this change.
const unknownRawMessages = [
  "register_membership_payment: idempotency key conflict could not be resolved",
  'duplicate key value violates unique constraint "payments_pkey"',
  'relation "public.client_memberships" does not exist',
  "permission denied for table payments",
  'insert or update on table "payments" violates foreign key constraint "payments_client_membership_id_fkey"',
  "PGRST202: Could not find the function public.register_membership_payment in the schema cache",
  "canceling statement due to statement timeout",
];

test("registerMembershipPayment: unknown/unexpected internal messages never reach the user - only the generic, localized fallback does", () => {
  for (const raw of unknownRawMessages) {
    // The mapper itself must not recognize these as known cases.
    assert.equal(mapKnownMembershipError(raw), null, `expected no mapping for: ${raw}`);

    for (const locale of ["en", "es"] as const) {
      const shown = resolvePaymentErrorMessage(raw, locale);
      const fallback = (locale === "es" ? es : en).memberships.operations.feedback.paymentFailed;

      assert.equal(shown, fallback, `${locale}: expected the generic fallback for: ${raw}`);
      // Extra safety: the resolved message must not contain any fragment
      // (table/constraint name, SQLSTATE-style text) of the raw message.
      assert.equal(shown.includes("payments"), false);
      assert.equal(shown.includes("constraint"), false);
      assert.equal(shown.includes("relation"), false);
    }
  }
});

test("registerMembershipPayment: a known business error (exceeds balance) still resolves to its specific, useful message - not the generic fallback", () => {
  const raw = "payments: amount 50.00 exceeds remaining balance 0.00 for membership 00000000-0000-0000-0000-000000000005";
  const shownEs = resolvePaymentErrorMessage(raw, "es");
  const shownEn = resolvePaymentErrorMessage(raw, "en");

  assert.notEqual(shownEs, es.memberships.operations.feedback.paymentFailed);
  assert.notEqual(shownEn, en.memberships.operations.feedback.paymentFailed);
  assert.equal(shownEs, "El monto ingresado supera el saldo pendiente de esta membresía. Actualiza la página para ver el saldo actual.");
  assert.equal(shownEn, "El monto ingresado supera el saldo pendiente de esta membresía. Actualiza la página para ver el saldo actual.");
});

// Mirrors extendMembership's exact fallback expression (membership-operations.ts):
//   mapKnownMembershipError(error) ?? t("memberships.operations.feedback.extendFailed")
function resolveExtendErrorMessage(rawMessage: string, locale: "en" | "es") {
  const fallback = (locale === "es" ? es : en).memberships.operations.feedback.extendFailed;
  return mapKnownMembershipError(rawMessage) ?? fallback;
}

test("extend_membership: idempotency_key reused with different parameters", () => {
  assert.equal(
    mapKnownMembershipError("extend_membership: idempotency_key reused with different parameters"),
    "Esta solicitud ya fue procesada con datos distintos de extensión. Recarga la página e inténtalo de nuevo.",
  );
});

test("extend_membership: cancelled/future/expired all map to their own specific, safe message", () => {
  assert.equal(mapKnownMembershipError("Membership not found."), "No se encontró la membresía.");
  assert.equal(
    mapKnownMembershipError("Cancelled memberships cannot be extended."),
    "Una membresía cancelada no se puede extender.",
  );
  assert.equal(
    mapKnownMembershipError("This membership has not started yet."),
    "Esta membresía todavía no comienza.",
  );
  assert.equal(
    mapKnownMembershipError("Expired memberships cannot be extended. Renew instead."),
    "Una membresía vencida no se puede extender. Usa renovar en su lugar.",
  );
});

test("extendMembership: a known business error (cancelled) resolves to its specific message, not the generic fallback", () => {
  const raw = "Cancelled memberships cannot be extended.";
  const shownEs = resolveExtendErrorMessage(raw, "es");
  const shownEn = resolveExtendErrorMessage(raw, "en");

  assert.notEqual(shownEs, es.memberships.operations.feedback.extendFailed);
  assert.notEqual(shownEn, en.memberships.operations.feedback.extendFailed);
  assert.equal(shownEs, "Una membresía cancelada no se puede extender.");
  assert.equal(shownEn, "Una membresía cancelada no se puede extender.");
});

test("extendMembership: unknown/unexpected internal messages never reach the user - only the generic, localized fallback does", () => {
  const unknownRawMessagesForExtend = [
    "extend_membership: idempotency key conflict could not be resolved",
    "extend_membership: p_idempotency_key is required",
    "extend_membership: p_days must be greater than zero",
    'duplicate key value violates unique constraint "idempotent_operations_idempotency_key_key"',
    "permission denied for table idempotent_operations",
    "invalid input syntax for type integer: \"7.5\"",
  ];

  for (const raw of unknownRawMessagesForExtend) {
    assert.equal(mapKnownMembershipError(raw), null, `expected no mapping for: ${raw}`);

    for (const locale of ["en", "es"] as const) {
      const shown = resolveExtendErrorMessage(raw, locale);
      const fallback = (locale === "es" ? es : en).memberships.operations.feedback.extendFailed;

      assert.equal(shown, fallback, `${locale}: expected the generic fallback for: ${raw}`);
      assert.equal(shown.includes("idempotent_operations"), false);
      assert.equal(shown.includes("constraint"), false);
      assert.equal(shown.includes("extend_membership:"), false);
    }
  }
});

// Regression coverage for the real Jesus Dominguez extension incident
// (2026-07-30): extending his current membership by 7 days computed a new
// end_date that overlapped his existing future membership by exactly 7
// days. The RPC's pre-check (20260730150000_extend_membership_overlap_check.sql)
// now rejects this before the UPDATE with a stable, authored message; a
// residual concurrent race would instead surface as the
// client_memberships_no_overlapping_active_periods exclusion constraint
// firing (SQLSTATE 23P01). Both must resolve to the exact same friendly
// message.
test("isExtendOverlapConflict: the RPC pre-check's own message is recognized", () => {
  assert.equal(
    isExtendOverlapConflict({ message: "This extension would overlap with an upcoming membership." }),
    true,
  );
});

test("isExtendOverlapConflict: SQLSTATE 23P01 is recognized regardless of the raw message text", () => {
  assert.equal(
    isExtendOverlapConflict({
      message: 'conflicting key value violates exclusion constraint "client_memberships_no_overlapping_active_periods"',
      code: "23P01",
    }),
    true,
  );
  // Even a completely different/localized wording must still be caught,
  // because the check is code-first - this is exactly what "no dependas
  // únicamente del texto crudo si el código está disponible" means.
  assert.equal(isExtendOverlapConflict({ message: "some unrelated wording", code: "23P01" }), true);
});

test("isExtendOverlapConflict: an unrelated error is not misclassified as an overlap conflict", () => {
  assert.equal(isExtendOverlapConflict({ message: "Cancelled memberships cannot be extended." }), false);
  assert.equal(isExtendOverlapConflict({ message: "permission denied for table idempotent_operations", code: "42501" }), false);
  assert.equal(isExtendOverlapConflict({ message: "extend_membership: idempotency key conflict could not be resolved" }), false);
});

test("both the pre-check and the residual-race 23P01 resolve to the exact same localized, friendly message - never the generic fallback", () => {
  const preCheckError = { message: "This extension would overlap with an upcoming membership.", code: undefined };
  const residualRaceError = {
    message: 'conflicting key value violates exclusion constraint "client_memberships_no_overlapping_active_periods"',
    code: "23P01",
  };

  for (const locale of ["en", "es"] as const) {
    const dict = locale === "es" ? es : en;
    const expected = dict.memberships.operations.feedback.extendOverlap;
    const fallback = dict.memberships.operations.feedback.extendFailed;

    assert.notEqual(expected, fallback);

    // Mirrors extendMembership's exact branch (membership-operations.ts):
    //   if (isExtendOverlapConflict({ message: error, code: errorCode })) return { error: t("...extendOverlap") };
    for (const raw of [preCheckError, residualRaceError]) {
      const shown = isExtendOverlapConflict(raw) ? expected : (mapKnownMembershipError(raw.message) ?? fallback);
      assert.equal(shown, expected, `${locale}: ${raw.message}`);
      assert.equal(shown.includes("constraint"), false);
      assert.equal(shown.includes("23P01"), false);
    }
  }
});
