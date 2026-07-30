// Run with: npx tsx --test src/modules/memberships/lib/register-membership-payment-idempotency-key.test.ts
// Pure module - no env vars needed.
//
// registerMembershipPayment (membership-operations.ts) can't be exercised
// directly in a plain `node --test` run: it transitively imports
// next/headers (via createSupabaseClient/getAdminText), which requires a
// real Next.js request context. This test instead validates, in isolation,
// the exact z.string().uuid().safeParse(...) expression that action uses
// to reject a missing/invalid idempotencyKey BEFORE calling the RPC - the
// same schema, applied to the same shape of input FormData.get() can
// return (string | null).
import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";

const idempotencyKeySchema = z.string().uuid();

test("missing idempotencyKey (FormData.get returns null) is rejected", () => {
  assert.equal(idempotencyKeySchema.safeParse(null).success, false);
});

test("empty string is rejected", () => {
  assert.equal(idempotencyKeySchema.safeParse("").success, false);
});

test("a non-UUID string is rejected", () => {
  assert.equal(idempotencyKeySchema.safeParse("not-a-uuid").success, false);
});

test("a well-formed UUID is accepted", () => {
  const result = idempotencyKeySchema.safeParse("11111111-1111-1111-1111-111111111111");
  assert.equal(result.success, true);
});
