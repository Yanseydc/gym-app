/**
 * The operational memberships list's filter values. Deliberately the same
 * vocabulary as MembershipOperationalStatus (minus "cancelled", which has
 * no dedicated filter/KPI card) plus "all", so the dashboard KPI cards, the
 * list's own filter buttons, and the URL query string never need a
 * translation layer between them.
 */
export type MembershipListFilter = "all" | "active" | "expired" | "expiring" | "future";

const MEMBERSHIP_LIST_FILTERS: readonly MembershipListFilter[] = [
  "all",
  "active",
  "expired",
  "expiring",
  "future",
];

/**
 * Category-specific filters a dashboard KPI card can deep-link to. Excludes
 * "all" - that's the list's default (no `filter` param at all), not a
 * distinct category a card represents.
 */
export type MembershipListCategoryFilter = Exclude<MembershipListFilter, "all">;

/**
 * Validates a raw `?filter=` query value against the known filters,
 * defaulting to "all" for anything missing, unknown, or otherwise invalid
 * (e.g. a stale bookmark from before a filter existed, or a hand-edited
 * URL) - the list must never crash or silently show nothing for a bad
 * value, it must fall back to showing everything.
 */
export function parseMembershipListFilter(value: string | null | undefined): MembershipListFilter {
  if (value && (MEMBERSHIP_LIST_FILTERS as readonly string[]).includes(value)) {
    return value as MembershipListFilter;
  }

  return "all";
}

/**
 * The operational memberships list's URL for a given category, used by the
 * dashboard KPI cards. Matches operationalStatus (from getOperationalStatus)
 * one-to-one: "active" | "future" | "expiring" | "expired".
 */
export function buildMembershipListHref(filter: MembershipListCategoryFilter): string {
  return `/dashboard/memberships?filter=${filter}`;
}

/**
 * The payment-status dimension of the same list, independent of and
 * combinable with MembershipListFilter (the temporal dimension) - separate
 * query param (`paymentStatus`), separate URL state, separate control in the
 * UI. "all" means no payment filter is applied and is never written to the
 * URL (same convention as MembershipListFilter's own "all").
 */
export type MembershipPaymentFilter = "all" | "pending";

const MEMBERSHIP_PAYMENT_FILTERS: readonly MembershipPaymentFilter[] = ["all", "pending"];

/**
 * Validates a raw `?paymentStatus=` query value, defaulting to "all" (no
 * payment filter) for anything missing, unknown, or otherwise invalid -
 * same fail-safe rationale as parseMembershipListFilter: an invalid value
 * must never crash or silently show nothing, it must fall back to showing
 * everything for this dimension.
 */
export function parseMembershipPaymentFilter(value: string | null | undefined): MembershipPaymentFilter {
  if (value && (MEMBERSHIP_PAYMENT_FILTERS as readonly string[]).includes(value)) {
    return value as MembershipPaymentFilter;
  }

  return "all";
}

/**
 * The operational memberships list's URL for the "pending payments" view,
 * used by the dashboard's "Pagos pendientes" panel's "View all" link.
 */
export function buildPendingPaymentsHref(): string {
  return "/dashboard/memberships?paymentStatus=pending";
}
