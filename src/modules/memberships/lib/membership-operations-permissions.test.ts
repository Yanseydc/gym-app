// Run with: npx tsx --test src/modules/memberships/lib/membership-operations-permissions.test.ts
// Pure module - no env vars needed.
import assert from "node:assert/strict";
import { test } from "node:test";

import { canExtendMembership, canRenewMembership } from "./membership-operations-permissions";

const TODAY = "2026-07-29";

function membership(overrides: Partial<{ status: string; startDate: string; endDate: string }> = {}) {
  return {
    status: "active" as const,
    startDate: "2026-07-17",
    endDate: "2026-08-15",
    ...overrides,
  } as { status: "active" | "cancelled" | "pending_payment" | "partial" | "expired"; startDate: string; endDate: string };
}

test("future membership offers neither Renovar nor Extender", () => {
  const future = membership({ startDate: "2026-08-16", endDate: "2026-09-14" });
  assert.equal(canRenewMembership(future, [], TODAY), false);
  assert.equal(canExtendMembership(future, TODAY), false);
});

test("currently running membership can be extended", () => {
  const current = membership();
  assert.equal(canExtendMembership(current, TODAY), true);
});

test("expired membership cannot be extended", () => {
  const expired = membership({ startDate: "2026-06-01", endDate: "2026-06-30" });
  assert.equal(canExtendMembership(expired, TODAY), false);
});

test("cancelled membership can be neither renewed nor extended", () => {
  const cancelled = membership({ status: "cancelled" });
  assert.equal(canRenewMembership(cancelled, [], TODAY), false);
  assert.equal(canExtendMembership(cancelled, TODAY), false);
});

test("currently running membership can be renewed when there is no future sibling yet", () => {
  const current = membership();
  assert.equal(canRenewMembership(current, [], TODAY), true);
});

test("the Jesus Dominguez incident: a current membership with its next period already created cannot be renewed again", () => {
  const current = membership({ startDate: "2026-07-17", endDate: "2026-08-15" });
  const alreadyRenewed = membership({ startDate: "2026-08-16", endDate: "2026-09-14" });
  assert.equal(canRenewMembership(current, [alreadyRenewed], TODAY), false);
});

test("a cancelled sibling does not block renewal", () => {
  const current = membership();
  const cancelledSibling = membership({ status: "cancelled", startDate: "2026-08-16", endDate: "2026-09-14" });
  assert.equal(canRenewMembership(current, [cancelledSibling], TODAY), true);
});

test("expired membership can be renewed when the client has no other current membership", () => {
  const expired = membership({ startDate: "2026-06-01", endDate: "2026-06-30" });
  assert.equal(canRenewMembership(expired, [], TODAY), true);
});

test("expired membership cannot be renewed when the client already has a current membership", () => {
  const expired = membership({ startDate: "2026-06-01", endDate: "2026-06-30" });
  const currentSibling = membership({ startDate: "2026-07-01", endDate: "2026-08-01" });
  assert.equal(canRenewMembership(expired, [currentSibling], TODAY), false);
});

test("boundary: membership ending today can still be renewed and extended", () => {
  const endsToday = membership({ startDate: "2026-07-01", endDate: TODAY });
  assert.equal(canExtendMembership(endsToday, TODAY), true);
  assert.equal(canRenewMembership(endsToday, [], TODAY), true);
});

test("boundary: membership starting today is not future", () => {
  const startsToday = membership({ startDate: TODAY, endDate: "2026-08-28" });
  assert.equal(canExtendMembership(startsToday, TODAY), true);
  assert.equal(canRenewMembership(startsToday, [], TODAY), true);
});
