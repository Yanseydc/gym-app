// Run with: npx tsx --test src/modules/memberships/lib/membership-list-filter.test.ts
// Pure module - no env vars needed.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildMembershipListHref,
  buildPendingPaymentsHref,
  parseMembershipListFilter,
  parseMembershipPaymentFilter,
} from "./membership-list-filter";

test("buildMembershipListHref: correct destination for each of the four category cards", () => {
  assert.equal(buildMembershipListHref("active"), "/dashboard/memberships?filter=active");
  assert.equal(buildMembershipListHref("future"), "/dashboard/memberships?filter=future");
  assert.equal(buildMembershipListHref("expiring"), "/dashboard/memberships?filter=expiring");
  assert.equal(buildMembershipListHref("expired"), "/dashboard/memberships?filter=expired");
});

test("parseMembershipListFilter: reads each known value back correctly", () => {
  assert.equal(parseMembershipListFilter("active"), "active");
  assert.equal(parseMembershipListFilter("future"), "future");
  assert.equal(parseMembershipListFilter("expiring"), "expiring");
  assert.equal(parseMembershipListFilter("expired"), "expired");
  assert.equal(parseMembershipListFilter("all"), "all");
});

test("parseMembershipListFilter: missing value defaults to 'all'", () => {
  assert.equal(parseMembershipListFilter(null), "all");
  assert.equal(parseMembershipListFilter(undefined), "all");
  assert.equal(parseMembershipListFilter(""), "all");
});

test("parseMembershipListFilter: unknown/invalid values default to 'all' instead of crashing or showing nothing", () => {
  assert.equal(parseMembershipListFilter("cancelled"), "all", "cancelled has no card/filter and must not leak through");
  assert.equal(parseMembershipListFilter("bogus"), "all");
  assert.equal(parseMembershipListFilter("ACTIVE"), "all", "case-sensitive - not a silent alias for 'active'");
  assert.equal(parseMembershipListFilter("active; DROP TABLE"), "all");
});

test("round-trip: every href built by buildMembershipListHref parses back to the same filter", () => {
  for (const category of ["active", "future", "expiring", "expired"] as const) {
    const href = buildMembershipListHref(category);
    const query = new URL(href, "http://localhost").searchParams.get("filter");
    assert.equal(parseMembershipListFilter(query), category);
  }
});

test("buildPendingPaymentsHref: correct destination for the 'View all' link", () => {
  assert.equal(buildPendingPaymentsHref(), "/dashboard/memberships?paymentStatus=pending");
});

test("parseMembershipPaymentFilter: reads the known value back correctly", () => {
  assert.equal(parseMembershipPaymentFilter("pending"), "pending");
  assert.equal(parseMembershipPaymentFilter("all"), "all");
});

test("parseMembershipPaymentFilter: missing value defaults to 'all' (no payment filter)", () => {
  assert.equal(parseMembershipPaymentFilter(null), "all");
  assert.equal(parseMembershipPaymentFilter(undefined), "all");
  assert.equal(parseMembershipPaymentFilter(""), "all");
});

test("parseMembershipPaymentFilter: unknown/invalid values default to 'all' instead of crashing or showing nothing", () => {
  assert.equal(parseMembershipPaymentFilter("bogus"), "all");
  assert.equal(parseMembershipPaymentFilter("PENDING"), "all", "case-sensitive - not a silent alias for 'pending'");
  assert.equal(parseMembershipPaymentFilter("pending; DROP TABLE"), "all");
});

test("round-trip: the href built by buildPendingPaymentsHref parses back to 'pending'", () => {
  const href = buildPendingPaymentsHref();
  const query = new URL(href, "http://localhost").searchParams.get("paymentStatus");
  assert.equal(parseMembershipPaymentFilter(query), "pending");
});

test("filter and paymentStatus coexist independently in the same URL, each parsed from its own key", () => {
  const url = new URL("/dashboard/memberships?filter=future&paymentStatus=pending", "http://localhost");
  assert.equal(parseMembershipListFilter(url.searchParams.get("filter")), "future");
  assert.equal(parseMembershipPaymentFilter(url.searchParams.get("paymentStatus")), "pending");
});
