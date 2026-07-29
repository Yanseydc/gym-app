// Run with: npx tsx --test src/modules/memberships/services/membership-access.test.ts
// No test runner is wired into package.json yet (none existed in the project
// before this fix) - see the diagnosis report for why that decision was left
// for the team rather than made silently here.
//
// Only selectAccessRecord is exported from membership-service.ts. Its
// internals (hasActiveAccessNow, compareByRecency) are module-private -
// exercised indirectly here, through the same public entry point
// getClientMembershipAccessLookup itself uses, rather than widening the
// module's API for test-only access.
import assert from "node:assert/strict";
import { test } from "node:test";

import { selectAccessRecord } from "./membership-service";

const TODAY = "2026-07-28";

type FakeRecord = {
  id: string;
  status: "active" | "cancelled" | "pending_payment" | "partial" | "expired";
  start_date: string;
  end_date: string;
  created_at: string;
};

function record(overrides: Partial<FakeRecord> & { id: string }): FakeRecord {
  return {
    status: "active",
    start_date: "2026-07-17",
    end_date: "2026-08-15",
    created_at: "2026-07-17T10:00:00.000Z",
    ...overrides,
  };
}

test("active status within [start_date, end_date] is eligible", () => {
  const active = record({ id: "active" });
  const result = selectAccessRecord([active], TODAY);
  assert.equal(result.isEligible, true);
  assert.equal(result.record?.id, "active");
});

test("active status with an expired end_date is NOT eligible (the isCurrentActiveMembership gap)", () => {
  const staleActive = record({ id: "stale", status: "active", end_date: "2026-07-01" });
  const result = selectAccessRecord([staleActive], TODAY);
  assert.equal(result.isEligible, false);
});

test("membership starting today and ending today is eligible (inclusive boundaries)", () => {
  const sameDay = record({ id: "same-day", start_date: TODAY, end_date: TODAY });
  const result = selectAccessRecord([sameDay], TODAY);
  assert.equal(result.isEligible, true);
});

test("cancelled never grants access regardless of dates", () => {
  const cancelled = record({ id: "cancelled", status: "cancelled" });
  const result = selectAccessRecord([cancelled], TODAY);
  assert.equal(result.isEligible, false);
});

test("pending_payment and partial do not grant access (existing business rule, must not change)", () => {
  const pending = record({ id: "pending", status: "pending_payment" });
  const partial = record({ id: "partial", status: "partial" });
  assert.equal(selectAccessRecord([pending], TODAY).isEligible, false);
  assert.equal(selectAccessRecord([partial], TODAY).isEligible, false);
});

test("a not-yet-started membership (future start_date) is not eligible", () => {
  const future = record({ id: "future", start_date: "2026-08-16", end_date: "2026-09-15" });
  const result = selectAccessRecord([future], TODAY);
  assert.equal(result.isEligible, false);
});

test("active membership plus cancelled duplicates with the same or later start_date (the reported Jesus Dominguez case)", () => {
  const active = record({ id: "active", status: "active", start_date: "2026-07-17", end_date: "2026-08-15" });
  const cancelled1 = record({ id: "cancelled-1", status: "cancelled", start_date: "2026-07-17", end_date: "2026-08-15" });
  const cancelled2 = record({ id: "cancelled-2", status: "cancelled", start_date: "2026-07-17", end_date: "2026-08-15" });

  // Deliberately NOT in start_date order, to prove the result never depends
  // on array/query order.
  const result = selectAccessRecord([cancelled1, active, cancelled2], TODAY);

  assert.equal(result.isEligible, true);
  assert.equal(result.record?.id, "active");
});

test("active membership plus an already-created future renewal", () => {
  const active = record({ id: "active", start_date: "2026-07-17", end_date: "2026-08-15" });
  const futureRenewal = record({ id: "renewal", start_date: "2026-08-16", end_date: "2026-09-15" });

  const result = selectAccessRecord([futureRenewal, active], TODAY);

  assert.equal(result.isEligible, true);
  assert.equal(result.record?.id, "active", "the future renewal must not shadow the currently active membership");
});

test("only cancelled/expired rows -> not eligible, but still returns a row for the label", () => {
  const cancelled = record({ id: "cancelled", status: "cancelled", start_date: "2026-06-01", end_date: "2026-06-30" });
  const expiredActive = record({ id: "expired-active", status: "active", start_date: "2026-05-01", end_date: "2026-05-31" });

  const result = selectAccessRecord([cancelled, expiredActive], TODAY);

  assert.equal(result.isEligible, false);
  assert.ok(result.record, "must still return a record for display purposes");
});

test("no memberships at all", () => {
  const result = selectAccessRecord([], TODAY);
  assert.equal(result.isEligible, false);
  assert.equal(result.record, null);
});

test("multiple eligible candidates use a deterministic tie-break, not array order", () => {
  // Two rows that (in theory, edge case) are both eligible at once: same
  // status/dates, only id/created_at differ.
  const a = record({ id: "aaa", created_at: "2026-07-17T10:00:00.000Z" });
  const b = record({ id: "bbb", created_at: "2026-07-17T09:00:00.000Z" });

  const forward = selectAccessRecord([a, b], TODAY);
  const reversed = selectAccessRecord([b, a], TODAY);

  assert.equal(forward.record?.id, reversed.record?.id, "the winner must not depend on input order");
  // Tie-break precedence: end_date, then start_date, then created_at -> "aaa"
  // was created later, so it wins.
  assert.equal(forward.record?.id, "aaa");
});

test("tie-break: later end_date wins first", () => {
  const sooner = record({ id: "sooner", end_date: "2026-08-01" });
  const later = record({ id: "later", end_date: "2026-09-01" });
  const result = selectAccessRecord([sooner, later], TODAY);
  assert.equal(result.record?.id, "later");
});

test("tie-break: id is the final deterministic fallback when every other field is equal", () => {
  const a = record({ id: "a", start_date: TODAY, end_date: TODAY, created_at: "2026-07-28T00:00:00.000Z" });
  const b = record({ id: "b", start_date: TODAY, end_date: TODAY, created_at: "2026-07-28T00:00:00.000Z" });

  const forward = selectAccessRecord([a, b], TODAY);
  const reversed = selectAccessRecord([b, a], TODAY);

  assert.equal(forward.record?.id, "b");
  assert.equal(reversed.record?.id, "b", "must not depend on input order");
});
