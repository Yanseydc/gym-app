// Run with: node --env-file=.env.local $(which npx) tsx --test src/modules/memberships/services/membership-renewal-overlap.test.ts
// Needs env vars because it imports membership-service.ts, which pulls in
// the Supabase server client transitively.
import assert from "node:assert/strict";
import { test } from "node:test";

import { isMembershipPeriodConflictError, overlapsExistingPeriod } from "./membership-service";

type FixtureStatus = "active" | "cancelled" | "pending_payment" | "partial" | "expired";

function row(overrides: Partial<{ status: FixtureStatus; start_date: string; end_date: string }> = {}) {
  return {
    status: "active" as FixtureStatus,
    start_date: "2026-07-17",
    end_date: "2026-08-15",
    ...overrides,
  };
}

test("normal renewal: a fresh, non-overlapping computed period is not blocked", () => {
  // Mirrors renewing the real "Oferta Julio" membership: source ends
  // 2026-08-15, new period computed as 2026-08-16..2026-09-14.
  const existing = [row({ status: "active", start_date: "2026-07-17", end_date: "2026-08-15" })];
  assert.equal(overlapsExistingPeriod("2026-08-16", "2026-09-14", existing), false);
});

test("second attempt on the same source: recomputing the identical period is blocked", () => {
  // The exact incident: a prior renewal already created 2026-08-16..2026-09-14.
  const existing = [
    row({ status: "active", start_date: "2026-07-17", end_date: "2026-08-15" }),
    row({ status: "active", start_date: "2026-08-16", end_date: "2026-09-14" }),
  ];
  assert.equal(overlapsExistingPeriod("2026-08-16", "2026-09-14", existing), true);
});

test("cancelled rows never block, regardless of how much their dates overlap", () => {
  const existing = [row({ status: "cancelled", start_date: "2026-08-16", end_date: "2026-09-14" })];
  assert.equal(overlapsExistingPeriod("2026-08-16", "2026-09-14", existing), false);
});

test("active, pending_payment and partial rows all block when their period overlaps", () => {
  for (const status of ["active", "pending_payment", "partial"] as const) {
    const existing = [row({ status, start_date: "2026-08-10", end_date: "2026-08-20" })];
    assert.equal(
      overlapsExistingPeriod("2026-08-16", "2026-09-14", existing),
      true,
      `status=${status} should block`,
    );
  }
});

test("intervals are inclusive on both ends (touching, not just crossing, counts as overlap)", () => {
  // New period starts exactly the day the existing one ends.
  const existing = [row({ start_date: "2026-07-17", end_date: "2026-08-16" })];
  assert.equal(overlapsExistingPeriod("2026-08-16", "2026-09-14", existing), true);

  // Adjacent, non-touching periods (one day apart) do not overlap.
  const adjacent = [row({ start_date: "2026-07-17", end_date: "2026-08-15" })];
  assert.equal(overlapsExistingPeriod("2026-08-16", "2026-09-14", adjacent), false);
});

test("isMembershipPeriodConflictError only matches the exclusion-violation SQLSTATE", () => {
  assert.equal(isMembershipPeriodConflictError({ code: "23P01" }), true);
  assert.equal(isMembershipPeriodConflictError({ code: "23505" }), false);
  assert.equal(isMembershipPeriodConflictError(null), false);
  assert.equal(isMembershipPeriodConflictError(undefined), false);
  assert.equal(isMembershipPeriodConflictError({}), false);
});

test("Jesus Dominguez incident, represented as a safe fixture (not a live query)", () => {
  // Snapshot of the real client_memberships rows read during the read-only
  // diagnosis (2026-07-29), reproduced here as literals - not fetched from
  // the real database, and never written back to it.
  const jesusMemberships = [
    row({ status: "cancelled", start_date: "2026-07-17", end_date: "2026-08-15" }),
    row({ status: "cancelled", start_date: "2026-07-17", end_date: "2026-08-15" }),
    row({ status: "active", start_date: "2026-07-17", end_date: "2026-08-15" }), // 3549e509, the real current one
    row({ status: "active", start_date: "2026-08-16", end_date: "2026-09-14" }), // 23a66cf9, the renewal that succeeded
  ];

  // A second renewal attempt on the original active row recomputes the
  // exact same period as the one that already exists - must be rejected
  // before insert, matching the reported "23P01" error's root cause.
  assert.equal(overlapsExistingPeriod("2026-08-16", "2026-09-14", jesusMemberships), true);
});
