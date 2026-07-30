// Run with: npx tsx --test src/modules/dashboard/lib/attention-required.test.ts
// Pure module - no env vars needed.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ATTENTION_LIST_LIMIT,
  daysBetweenCivilDates,
  selectExpiringMemberships,
  selectPendingPaymentMemberships,
  type AttentionMembershipCandidate,
  type PendingPaymentAttentionCandidate,
} from "./attention-required";

const TODAY = "2026-07-29";

function membership(overrides: Partial<AttentionMembershipCandidate> = {}): AttentionMembershipCandidate {
  return {
    id: "m-0",
    clientId: "c-0",
    membershipPlanId: "p-0",
    startDate: "2026-07-01",
    endDate: "2026-07-31",
    status: "active",
    ...overrides,
  };
}

function pending(overrides: Partial<PendingPaymentAttentionCandidate> = {}): PendingPaymentAttentionCandidate {
  return {
    id: "m-0",
    clientId: "c-0",
    membershipPlanId: "p-0",
    status: "pending_payment",
    remainingBalance: 100,
    ...overrides,
  };
}

test("expiring: a membership ending exactly today is included with 0 days remaining", () => {
  const result = selectExpiringMemberships([membership({ id: "m1", endDate: TODAY })], TODAY);
  assert.equal(result.total, 1);
  assert.equal(result.items[0].daysRemaining, 0);
});

test("expiring: lower boundary of the 6-day window - endDate === today", () => {
  const result = selectExpiringMemberships([membership({ id: "m1", startDate: "2026-07-01", endDate: TODAY })], TODAY);
  assert.equal(result.total, 1);
});

test("expiring: upper boundary of the 6-day window - endDate === today + 5 calendar days", () => {
  const result = selectExpiringMemberships([membership({ id: "m1", endDate: "2026-08-03" })], TODAY);
  assert.equal(result.total, 1);
  assert.equal(result.items[0].daysRemaining, 5);
});

test("expiring: one day past the window (today + 6) is excluded", () => {
  const result = selectExpiringMemberships([membership({ id: "m1", endDate: "2026-08-04" })], TODAY);
  assert.equal(result.total, 0);
});

test("expiring: cancelled is excluded even when its dates fall inside the window", () => {
  const result = selectExpiringMemberships(
    [membership({ id: "m1", endDate: "2026-08-01", status: "cancelled" })],
    TODAY,
  );
  assert.equal(result.total, 0);
});

test("expiring: pending_payment/partial rows are still classified by date like any other non-cancelled row", () => {
  const result = selectExpiringMemberships(
    [
      membership({ id: "m1", endDate: "2026-08-01", status: "pending_payment" }),
      membership({ id: "m2", endDate: "2026-08-01", status: "partial" }),
    ],
    TODAY,
  );
  assert.equal(result.total, 2);
});

test("expiring: stable order - endDate ascending, ties broken by id", () => {
  const a = membership({ id: "m-b", endDate: "2026-08-01" });
  const b = membership({ id: "m-a", endDate: "2026-08-01" });
  const c = membership({ id: "m-z", endDate: "2026-07-30" });

  const result = selectExpiringMemberships([a, b, c], TODAY);

  assert.deepEqual(
    result.items.map((item) => item.id),
    ["m-z", "m-a", "m-b"],
  );
});

test("expiring: caps at ATTENTION_LIST_LIMIT but reports the true total", () => {
  const candidates = Array.from({ length: 7 }, (_, index) =>
    membership({ id: `m${index}`, endDate: "2026-08-01" }),
  );

  const result = selectExpiringMemberships(candidates, TODAY);

  assert.equal(result.total, 7);
  assert.equal(result.items.length, ATTENTION_LIST_LIMIT);
});

test("expiring: month boundary - window crosses from July into August", () => {
  const result = selectExpiringMemberships([membership({ id: "m1", endDate: "2026-08-02" })], "2026-07-29");
  assert.equal(result.total, 1);
});

test("expiring: year boundary - window crosses from December into January", () => {
  const result = selectExpiringMemberships([membership({ id: "m1", endDate: "2027-01-02" })], "2026-12-29");
  assert.equal(result.total, 1);
  assert.equal(result.items[0].daysRemaining, 4);
});

test("expiring: today is taken exactly as given, never re-derived from the host clock (UTC/Tijuana-safe)", () => {
  // If this ever internally called `new Date()` or otherwise re-derived
  // "today" instead of using the injected value, running this suite at a
  // time where UTC and America/Tijuana disagree on the civil date could
  // flip the result. Using a fixed, explicit `today` sidesteps that
  // entirely, mirroring membership-operational-status.test.ts's own guard.
  const result = selectExpiringMemberships([membership({ id: "m1", endDate: "2026-08-03" })], "2026-07-29");
  assert.equal(result.total, 1);
});

test("daysBetweenCivilDates: crosses a year boundary correctly", () => {
  assert.equal(daysBetweenCivilDates("2026-12-29", "2027-01-02"), 4);
});

test("daysBetweenCivilDates: same date is 0", () => {
  assert.equal(daysBetweenCivilDates(TODAY, TODAY), 0);
});

test("pending payments: pending_payment is included", () => {
  const result = selectPendingPaymentMemberships([pending({ id: "m1", status: "pending_payment", remainingBalance: 50 })]);
  assert.equal(result.total, 1);
});

test("pending payments: partial is included", () => {
  const result = selectPendingPaymentMemberships([pending({ id: "m1", status: "partial", remainingBalance: 50 })]);
  assert.equal(result.total, 1);
});

test("pending payments: zero balance is excluded", () => {
  const result = selectPendingPaymentMemberships([pending({ id: "m1", remainingBalance: 0 })]);
  assert.equal(result.total, 0);
  assert.equal(result.items.length, 0);
});

test("pending payments: stable order - remainingBalance descending, ties broken by id", () => {
  const a = pending({ id: "m-b", remainingBalance: 200 });
  const b = pending({ id: "m-a", remainingBalance: 200 });
  const c = pending({ id: "m-z", remainingBalance: 500 });

  const result = selectPendingPaymentMemberships([a, b, c]);

  assert.deepEqual(
    result.items.map((item) => item.id),
    ["m-z", "m-a", "m-b"],
  );
});

test("pending payments: caps at ATTENTION_LIST_LIMIT but reports the true total", () => {
  const candidates = Array.from({ length: 8 }, (_, index) =>
    pending({ id: `m${index}`, remainingBalance: 10 + index }),
  );

  const result = selectPendingPaymentMemberships(candidates);

  assert.equal(result.total, 8);
  assert.equal(result.items.length, ATTENTION_LIST_LIMIT);
  // Highest balance (m7 -> 17) must come first.
  assert.equal(result.items[0].id, "m7");
});
