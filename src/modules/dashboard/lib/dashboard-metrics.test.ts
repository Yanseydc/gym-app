// Run with: npx tsx --test src/modules/dashboard/lib/dashboard-metrics.test.ts
// Pure module - no env vars needed.
import assert from "node:assert/strict";
import { test } from "node:test";

import { countMembershipMetrics, getMonthStartFromCivilDate } from "./dashboard-metrics";
import { getTodayInAppTimeZone } from "@/lib/date-format";

const TODAY = "2026-07-29";

function record(overrides: Partial<{ status: string; startDate: string; endDate: string }> = {}) {
  return {
    status: "active" as const,
    startDate: "2026-07-17",
    endDate: "2026-08-15",
    ...overrides,
  } as { status: "active" | "cancelled" | "pending_payment" | "partial" | "expired"; startDate: string; endDate: string };
}

test("active membership plus a future one for the same client -> 1 active, 1 future (the real Jesus Dominguez data)", () => {
  const current = record({ startDate: "2026-07-17", endDate: "2026-08-15" });
  const future = record({ startDate: "2026-08-16", endDate: "2026-09-14" });

  const counts = countMembershipMetrics([current, future], TODAY);

  assert.deepEqual(counts, {
    activeMemberships: 1,
    futureMemberships: 1,
    expiredMemberships: 0,
    membershipsExpiringSoon: 0,
  });
});

test("boundary: membership starting today counts as active, not future", () => {
  const startsToday = record({ startDate: TODAY, endDate: "2026-08-28" });
  const counts = countMembershipMetrics([startsToday], TODAY);
  assert.equal(counts.activeMemberships, 1);
  assert.equal(counts.futureMemberships, 0);
});

test("boundary: membership ending today counts as active AND as expiring soon", () => {
  const endsToday = record({ startDate: "2026-07-01", endDate: TODAY });
  const counts = countMembershipMetrics([endsToday], TODAY);
  assert.equal(counts.activeMemberships, 1, "still active today - expiring is a subset of active, not a subtraction");
  assert.equal(counts.membershipsExpiringSoon, 1);
  assert.equal(counts.expiredMemberships, 0);
});

test("expired membership counts only as expired, not active", () => {
  const expired = record({ startDate: "2026-06-01", endDate: "2026-06-30" });
  const counts = countMembershipMetrics([expired], TODAY);
  assert.equal(counts.expiredMemberships, 1);
  assert.equal(counts.activeMemberships, 0);
});

test("expiring soon: both exact edges of the 6-day window, and just outside it", () => {
  // Window for TODAY=2026-07-29 is [2026-07-29, 2026-08-03] inclusive.
  const lowerEdge = record({ startDate: "2026-07-01", endDate: TODAY });
  const upperEdge = record({ startDate: "2026-07-01", endDate: "2026-08-03" });
  const justOutside = record({ startDate: "2026-07-01", endDate: "2026-08-04" });

  const counts = countMembershipMetrics([lowerEdge, upperEdge, justOutside], TODAY);

  assert.equal(counts.membershipsExpiringSoon, 2, "only the two edge rows fall inside the window");
  assert.equal(counts.activeMemberships, 3, "all three are still currently active regardless of the soon window");
});

test("pending_payment, partial and cancelled never enter any of the four counts", () => {
  const pending = record({ status: "pending_payment", startDate: "2026-07-01", endDate: "2026-08-15" });
  const partial = record({ status: "partial", startDate: "2026-07-01", endDate: "2026-08-15" });
  const cancelled = record({ status: "cancelled", startDate: "2026-07-01", endDate: "2026-08-15" });
  // Also verify a future-dated pending/partial row doesn't leak into "future" either.
  const futurePending = record({ status: "pending_payment", startDate: "2026-09-01", endDate: "2026-10-01" });

  const counts = countMembershipMetrics([pending, partial, cancelled, futurePending], TODAY);

  assert.deepEqual(counts, {
    activeMemberships: 0,
    futureMemberships: 0,
    expiredMemberships: 0,
    membershipsExpiringSoon: 0,
  });
});

test("a `today` from inside a real UTC/Tijuana day-mismatch window classifies correctly", () => {
  const referenceDate = new Date("2026-07-29T06:00:00.000Z");
  const tijuanaToday = getTodayInAppTimeZone(referenceDate);
  assert.equal(tijuanaToday, "2026-07-28");

  const endsOnTheBoundaryDay = record({ startDate: "2026-07-01", endDate: "2026-07-28" });
  const startsTheNextDay = record({ startDate: "2026-07-29", endDate: "2026-08-28" });

  const counts = countMembershipMetrics([endsOnTheBoundaryDay, startsTheNextDay], tijuanaToday);

  assert.equal(counts.activeMemberships, 1, "the row ending on the 28th is still active in Tijuana at this instant");
  assert.equal(counts.futureMemberships, 1, "the row starting on the 29th hasn't begun yet in Tijuana at this instant");
});

test("getMonthStartFromCivilDate: plain mid-month date", () => {
  assert.equal(getMonthStartFromCivilDate("2026-07-29"), "2026-07-01");
});

test("getMonthStartFromCivilDate: month change (last day of the month)", () => {
  assert.equal(getMonthStartFromCivilDate("2026-07-31"), "2026-07-01");
  assert.equal(getMonthStartFromCivilDate("2026-08-01"), "2026-08-01");
});

test("getMonthStartFromCivilDate: year change (last day of the year)", () => {
  assert.equal(getMonthStartFromCivilDate("2026-12-31"), "2026-12-01");
  assert.equal(getMonthStartFromCivilDate("2027-01-01"), "2027-01-01");
});
