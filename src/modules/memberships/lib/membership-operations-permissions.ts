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
