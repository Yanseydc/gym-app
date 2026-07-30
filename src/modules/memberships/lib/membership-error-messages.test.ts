// Run with: npx tsx --test src/modules/memberships/lib/membership-error-messages.test.ts
// Pure module - no env vars needed.
import assert from "node:assert/strict";
import { test } from "node:test";

import en from "../../../../locales/en.json";
import es from "../../../../locales/es.json";
import { mapKnownMembershipError } from "./membership-error-messages";

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
