// Run with: node --env-file=.env.local $(which npx) tsx --test src/modules/memberships/services/membership-operational-status.test.ts
// Needs env vars because it imports membership-service.ts, which pulls in
// the Supabase server client transitively - same as membership-access.test.ts.
import assert from "node:assert/strict";
import { test } from "node:test";

import { getOperationalStatus } from "./membership-service";
import { getTodayInAppTimeZone } from "@/lib/date-format";

const TODAY = "2026-07-28";

test("cancelled is terminal regardless of dates", () => {
  assert.equal(getOperationalStatus("2020-01-01", "2099-01-01", "cancelled", TODAY), "cancelled");
});

test("future: start_date after today", () => {
  assert.equal(getOperationalStatus("2026-08-16", "2026-09-15", "active", TODAY), "future");
});

test("expired: end_date before today", () => {
  assert.equal(getOperationalStatus("2026-06-01", "2026-07-01", "active", TODAY), "expired");
});

test("expiring: end_date within the next 6 days", () => {
  assert.equal(getOperationalStatus("2026-07-01", "2026-08-01", "active", TODAY), "expiring");
});

test("active: end_date well beyond the expiring window", () => {
  assert.equal(getOperationalStatus("2026-07-01", "2026-09-01", "active", TODAY), "active");
});

test("boundary: starts exactly today is not future", () => {
  const status = getOperationalStatus(TODAY, "2026-08-15", "active", TODAY);
  assert.notEqual(status, "future");
  assert.equal(status, "active");
});

test("boundary: ends exactly today is expiring, not expired (inclusive, and 0 days out is within the soon window)", () => {
  const status = getOperationalStatus("2026-07-01", TODAY, "active", TODAY);
  assert.notEqual(status, "expired");
  assert.equal(status, "expiring");
});

test("boundary: expiring window edge - the 6-day soon cutoff (today + 5 calendar days) is expiring, one day past it is active", () => {
  // addDays(today, 6) counts today as day 1, so the cutoff lands on
  // today + 5 calendar days - matches the plan-duration math used elsewhere
  // in this module (start_date + duration_in_days - 1).
  assert.equal(getOperationalStatus("2026-07-01", "2026-08-02", "active", TODAY), "expiring");
  assert.equal(getOperationalStatus("2026-07-01", "2026-08-03", "active", TODAY), "active");
});

test("precedence: cancelled wins even when dates would otherwise say future or expired", () => {
  assert.equal(getOperationalStatus("2026-09-01", "2026-10-01", "cancelled", TODAY), "cancelled");
  assert.equal(getOperationalStatus("2026-01-01", "2026-02-01", "cancelled", TODAY), "cancelled");
});

test("a `today` injected from inside a real UTC/Tijuana day-mismatch window classifies correctly", () => {
  // Same reference instant used in membership-lifecycle.test.ts: UTC has
  // already flipped to the 29th while Tijuana is still on the 28th.
  const referenceDate = new Date("2026-07-29T06:00:00.000Z");
  const tijuanaToday = getTodayInAppTimeZone(referenceDate);
  assert.equal(tijuanaToday, "2026-07-28");

  // A membership ending exactly on the 28th must still read as "expiring"
  // (0 days out, inside the soon window) at this instant, never "expired" -
  // which naive UTC math (today already being the 29th) would say.
  const status = getOperationalStatus("2026-07-01", "2026-07-28", "active", tijuanaToday);
  assert.notEqual(status, "expired");
  assert.equal(status, "expiring");

  // A membership starting on the 29th must still be future at this instant,
  // not active (UTC would already consider the 29th "today").
  assert.equal(getOperationalStatus("2026-07-29", "2026-08-28", "active", tijuanaToday), "future");
});

test("omitting `today` defaults to getTodayInAppTimeZone (smoke test, not date-sensitive)", () => {
  assert.equal(getOperationalStatus("2020-01-01", "2099-01-01", "active"), "active");
});
