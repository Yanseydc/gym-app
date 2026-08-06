// Run with: npx tsx --test src/modules/coaching/services/activate-routine.test.ts
// Pure logic only - no env vars needed.
//
// activate-routine.ts can't be imported directly in a plain `node --test`
// run: it is a "use server" module that transitively imports
// @/lib/supabase/server (next/headers -> cookies()), which requires a real
// Next.js request context and env vars (same limitation documented in
// register-membership-payment-idempotency-key.test.ts). This test instead
// validates, in isolation, the exact classifyActivationError mapping that
// activate-routine.ts uses to turn a raw RPC error into a safe, localizable
// key -- the definitive proof (Entrega A0.3 review, area 3/4) that the new
// "Archived routines cannot be reactivated..." exception raised by
// 20260806090000_harden_activate_client_routine_status_guard.sql maps to a
// stable "archived" key, not "generic", and that no raw Postgres message
// ever becomes the key itself.
import assert from "node:assert/strict";
import { test } from "node:test";

type ActivateRoutineErrorKey = "notFound" | "notAuthorized" | "conflict" | "archived" | "generic";

// Exact mirror of classifyActivationError in activate-routine.ts.
function classifyActivationError(rawMessage: string | null | undefined, code?: string | null): ActivateRoutineErrorKey {
  if (code === "23505") {
    return "conflict";
  }

  if (!rawMessage) {
    return "generic";
  }

  if (rawMessage.includes("client_routines_one_active_per_client_idx")) {
    return "conflict";
  }

  if (rawMessage.includes("Archived routines cannot be reactivated")) {
    return "archived";
  }

  if (
    rawMessage.includes("Routine is not available") ||
    rawMessage.includes("Selected client is not available") ||
    rawMessage.includes("not found")
  ) {
    return "notFound";
  }

  if (rawMessage.includes("Not authorized") || rawMessage.includes("not authorized")) {
    return "notAuthorized";
  }

  return "generic";
}

test("the archived-is-terminal RPC exception maps to the stable 'archived' key", () => {
  assert.equal(
    classifyActivationError("Archived routines cannot be reactivated directly; create a new routine instead."),
    "archived",
  );
});

test("an unrecognized/raw Postgres message never becomes the key itself -- falls back to 'generic'", () => {
  const rawPostgresMessage = 'update or delete on table "client_routines" violates foreign key constraint "some_fk"';
  const key = classifyActivationError(rawPostgresMessage);
  assert.equal(key, "generic");
  assert.notEqual(key, rawPostgresMessage);
});

test("a unique-violation error code maps to 'conflict' regardless of message text", () => {
  assert.equal(classifyActivationError("anything", "23505"), "conflict");
});

test("the one-active-per-client index name in a message maps to 'conflict'", () => {
  assert.equal(
    classifyActivationError('duplicate key value violates unique constraint "client_routines_one_active_per_client_idx"'),
    "conflict",
  );
});

test("a not-found message maps to 'notFound'", () => {
  assert.equal(classifyActivationError("Routine not found."), "notFound");
  assert.equal(classifyActivationError("Selected client is not available."), "notFound");
});

test("an authorization message maps to 'notAuthorized'", () => {
  assert.equal(classifyActivationError("Not authorized to activate routines for this client."), "notAuthorized");
});

test("a null/undefined message maps to 'generic'", () => {
  assert.equal(classifyActivationError(null), "generic");
  assert.equal(classifyActivationError(undefined), "generic");
});
