// Run with: npx tsx --test src/modules/memberships/lib/membership-lifecycle.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { getDisplayLifecycleStatus } from "./membership-lifecycle";
import { getTodayInAppTimeZone } from "@/lib/date-format";

const TODAY = "2026-07-28";

function membership(overrides: Partial<{ status: string; startDate: string; endDate: string }> = {}) {
  return {
    status: "active" as const,
    startDate: "2026-07-17",
    endDate: "2026-08-15",
    ...overrides,
  } as { status: "active" | "cancelled" | "pending_payment" | "partial" | "expired"; startDate: string; endDate: string };
}

test("cancelled is terminal regardless of dates", () => {
  const m = membership({ status: "cancelled", startDate: "2020-01-01", endDate: "2099-01-01" });
  assert.equal(getDisplayLifecycleStatus(m, TODAY), "cancelled");
});

test("pending_payment is shown as-is, not hidden by future or expired", () => {
  const currentPeriod = membership({ status: "pending_payment" });
  assert.equal(getDisplayLifecycleStatus(currentPeriod, TODAY), "pending_payment");

  const futurePeriod = membership({ status: "pending_payment", startDate: "2026-09-01", endDate: "2026-10-01" });
  assert.equal(
    getDisplayLifecycleStatus(futurePeriod, TODAY),
    "pending_payment",
    "a not-yet-started, unpaid membership must show as pending_payment, not future",
  );
});

test("partial is shown as-is, not hidden by future or expired", () => {
  const currentPeriod = membership({ status: "partial" });
  assert.equal(getDisplayLifecycleStatus(currentPeriod, TODAY), "partial");

  const futurePeriod = membership({ status: "partial", startDate: "2026-09-01", endDate: "2026-10-01" });
  assert.equal(getDisplayLifecycleStatus(futurePeriod, TODAY), "partial");
});

test("active with a future start_date is classified as future", () => {
  const m = membership({ status: "active", startDate: "2026-08-16", endDate: "2026-09-15" });
  assert.equal(getDisplayLifecycleStatus(m, TODAY), "future");
});

test("active within [start_date, end_date] is active", () => {
  const m = membership({ status: "active" });
  assert.equal(getDisplayLifecycleStatus(m, TODAY), "active");
});

test("active past its end_date is expired", () => {
  const m = membership({ status: "active", startDate: "2026-06-01", endDate: "2026-07-01" });
  assert.equal(getDisplayLifecycleStatus(m, TODAY), "expired");
});

test("membership starting today is active, not future (inclusive lower boundary)", () => {
  const m = membership({ status: "active", startDate: TODAY, endDate: "2026-08-15" });
  assert.equal(getDisplayLifecycleStatus(m, TODAY), "active");
});

test("membership ending today is active, not expired (inclusive upper boundary)", () => {
  const m = membership({ status: "active", startDate: "2026-07-01", endDate: TODAY });
  assert.equal(getDisplayLifecycleStatus(m, TODAY), "active");
});

test("a raw 'expired' status is re-derived from dates, not trusted as-is", () => {
  // The DB check constraint allows "expired" even though the app never
  // writes it. If it ever showed up with a start_date still in the future,
  // this function must still classify it as future - it never trusts the
  // incoming active/expired label for this branch.
  const m = membership({ status: "expired" as never, startDate: "2026-08-16", endDate: "2026-09-15" });
  assert.equal(getDisplayLifecycleStatus(m, TODAY), "future");
});

test("omitting `today` defaults to getTodayInAppTimeZone (smoke test, not date-sensitive)", () => {
  const m = membership({ status: "active", startDate: "2020-01-01", endDate: "2099-01-01" });
  assert.equal(getDisplayLifecycleStatus(m), "active");
});

test("a `today` injected from inside a real UTC/Tijuana day-mismatch window classifies correctly", () => {
  // 2026-07-29T06:00:00Z is 2026-07-28 23:00 in America/Tijuana (UTC-7 in
  // July) - UTC has already flipped to the 29th while Tijuana is still on
  // the 28th. A membership ending exactly on the 28th must still read as
  // active at this instant, not expired (which naive UTC math would say).
  const referenceDate = new Date("2026-07-29T06:00:00.000Z");
  const tijuanaToday = getTodayInAppTimeZone(referenceDate);
  assert.equal(tijuanaToday, "2026-07-28", "sanity check: confirms this instant is inside the mismatch window");

  const m = membership({ status: "active", startDate: "2026-07-01", endDate: "2026-07-28" });
  assert.equal(getDisplayLifecycleStatus(m, tijuanaToday), "active");
});
