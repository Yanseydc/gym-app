import { getTodayInAppTimeZone } from "@/lib/date-format";
import type { MembershipStatus } from "@/modules/memberships/types";

/**
 * Whether the memberships dashboard should offer "Renovar"/"Extender" for a
 * given row. Scoped to exactly those two operations for the 2026-07-29
 * renewal incident (double-submit created a valid future period, but the
 * UI kept offering "Renovar" on the future row instead of the currently
 * running one - see membership-service.ts's overlapsExistingPeriod for the
 * matching server-side fix). Payment and cancellation permissions are
 * intentionally NOT covered here yet.
 *
 * Pure and dependency-free (no Supabase) so both the dashboard (client) and
 * any future server-side gate can share the exact same decision. `today`
 * defaults to getTodayInAppTimeZone() but can be injected for deterministic
 * tests.
 */
export type MembershipRenewalCandidate = {
  status: MembershipStatus;
  startDate: string;
  endDate: string;
};

/**
 * A membership can be extended only while it is temporally current - has
 * already started and hasn't ended yet. A future membership (hasn't
 * started) or an expired one (already ended) cannot be extended; cancelled
 * never can either.
 */
export function canExtendMembership(
  membership: MembershipRenewalCandidate,
  today: string = getTodayInAppTimeZone(),
): boolean {
  return (
    membership.status !== "cancelled" &&
    membership.startDate <= today &&
    membership.endDate >= today
  );
}

/**
 * A membership can be renewed if:
 *   - it isn't cancelled;
 *   - it isn't future (hasn't started yet - there's nothing to renew until
 *     it begins);
 *   - if it's temporally current (started, not yet ended): allowed UNLESS
 *     the client already has another non-cancelled row that hasn't started
 *     yet (the next period was already created - renewing again would only
 *     ever collide with it);
 *   - if it already ended: allowed UNLESS the client already has another
 *     non-cancelled row that is temporally current right now.
 * `siblings` must be the client's OTHER non-cancelled-or-not memberships
 * (any status, this function filters out cancelled ones itself) - excluding
 * `membership` itself.
 */
export function canRenewMembership(
  membership: MembershipRenewalCandidate,
  siblings: MembershipRenewalCandidate[],
  today: string = getTodayInAppTimeZone(),
): boolean {
  if (membership.status === "cancelled") {
    return false;
  }

  if (membership.startDate > today) {
    return false;
  }

  const activeSiblings = siblings.filter((sibling) => sibling.status !== "cancelled");
  const hasFutureSibling = activeSiblings.some((sibling) => sibling.startDate > today);
  const hasCurrentSibling = activeSiblings.some(
    (sibling) => sibling.startDate <= today && sibling.endDate >= today,
  );

  const isTemporallyCurrent = membership.endDate >= today;

  if (isTemporallyCurrent) {
    return !hasFutureSibling;
  }

  return !hasCurrentSibling;
}

export type OccupyingSiblingCandidate = {
  status: MembershipStatus;
  startDate: string;
};

export type ExtensionLimit = {
  maxDays: number;
  nextStartDate: string;
};

/**
 * Maximum number of days a membership ending on `currentEndDate` can be
 * extended before the resulting end_date would overlap the client's
 * nearest upcoming occupying membership - mirrors extend_membership's own
 * overlap pre-check (supabase/migrations/20260730150000_extend_membership_overlap_check.sql)
 * so the UI can show/gate "Extender" without a server round trip. Advisory
 * only: the RPC remains the real authority against manipulated requests or
 * races (see that migration's comments for the residual-race case this
 * doesn't cover).
 *
 * `siblings` must already exclude the membership being extended itself -
 * same calling convention as canRenewMembership's own `siblings` param.
 * Only active/pending_payment/partial siblings occupy a period at all
 * (cancelled never blocks, matching overlapsExistingPeriod's own rule).
 *
 * Siblings are considered regardless of whether their startDate is after
 * currentEndDate: the client_memberships_no_overlapping_active_periods
 * exclusion constraint only compares rows that are BOTH in
 * ('active','pending_payment','partial') - the membership being extended
 * can carry a different status (e.g. 'expired' with a not-yet-past
 * end_date, which canExtendMembership still allows), so an occupying
 * sibling whose startDate is already on or before currentEndDate is a
 * reachable state, not a purely theoretical one. Math.max(0, ...) below
 * clamps that case (and the exact-boundary case) to 0 - blocked, not
 * unlimited - matching extend_membership's own pre-check, which rejects
 * any p_days > 0 the moment an occupying sibling's period already touches
 * [start_date, end_date] today.
 *
 * Returns null when there is no occupying sibling at all - the existing
 * "unlimited extend" behavior is preserved in that case.
 */
export function getMaxExtensionDays(
  currentEndDate: string,
  siblings: OccupyingSiblingCandidate[],
): ExtensionLimit | null {
  const occupying = siblings.filter(
    (sibling) =>
      sibling.status === "active" || sibling.status === "pending_payment" || sibling.status === "partial",
  );

  if (occupying.length === 0) {
    return null;
  }

  const nextStartDate = occupying.reduce(
    (earliest, sibling) => (sibling.startDate < earliest ? sibling.startDate : earliest),
    occupying[0].startDate,
  );

  return {
    maxDays: Math.max(0, daysBetweenCivilDates(currentEndDate, nextStartDate) - 1),
    nextStartDate,
  };
}

// Anchored at UTC midnight so the runtime's local time zone can never shift
// the result by a day - same trick formatCivilDate uses. Duplicated here
// (rather than imported from the dashboard module's own copy) to keep this
// file dependency-free within the memberships domain.
function daysBetweenCivilDates(fromDate: string, toDate: string): number {
  const from = Date.UTC(...parseCivilDate(fromDate));
  const to = Date.UTC(...parseCivilDate(toDate));
  return Math.round((to - from) / 86_400_000);
}

function parseCivilDate(value: string): [number, number, number] {
  const [year, month, day] = value.split("-").map(Number);
  return [year, month - 1, day];
}
