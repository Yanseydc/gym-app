import { getTodayInAppTimeZone } from "@/lib/date-format";
import type { MembershipStatus } from "@/modules/memberships/types";

/**
 * Status shown to staff on the display-only membership lifecycle badges
 * (membership history, client detail page, payment membership picker).
 *
 * INFORMATIONAL ONLY. Must never be used to gate check-in access, renewals,
 * extensions, or any other business decision - those still go through
 * hasActiveAccessNow/selectAccessRecord (check-in) or
 * isCurrentActiveMembership/resolveMembershipStatus/getOperationalStatus
 * (renew/extend/the operational memberships dashboard), none of which this
 * module touches or is touched by.
 *
 * Pure and dependency-free (no Supabase, no server actions, no "use
 * server"/"use client" boundary) so both server and client components can
 * import it directly.
 */
export type MembershipDisplayStatus =
  | "cancelled"
  | "pending_payment"
  | "partial"
  | "future"
  | "expired"
  | "active";

export type MembershipDisplayStatusInput = {
  status: MembershipStatus;
  startDate: string;
  endDate: string;
};

/**
 * Classifies a single membership for display, in this exact, documented
 * precedence - each rule only applies once every earlier one has been ruled
 * out:
 *
 *   1. "cancelled" is terminal and always wins, regardless of dates.
 *   2. "pending_payment" / "partial" are payment-gate states shown as-is.
 *      They must never be hidden by "future", even when the membership also
 *      hasn't started yet (e.g. staff invoiced a future-dated plan ahead of
 *      time) - checking these before any date logic guarantees that.
 *   3. "future" only applies once cancelled/pending_payment/partial have
 *      been ruled out: startDate is strictly after `today`.
 *   4. "expired" vs "active" are decided together from startDate, endDate
 *      and `today` - NOT from whatever "active"/"expired" label the
 *      caller's own `status` field already carries. That upstream label
 *      (resolveMembershipStatus, still UTC-based and start_date-blind as of
 *      this change) is intentionally ignored here for this branch, so this
 *      function's own start_date/end_date/today comparison is the only
 *      thing that decides expired vs. active vs. future.
 *
 * `today` defaults to getTodayInAppTimeZone() (the app's operating time
 * zone, America/Tijuana) but can be injected for deterministic tests.
 */
export function getDisplayLifecycleStatus(
  membership: MembershipDisplayStatusInput,
  today: string = getTodayInAppTimeZone(),
): MembershipDisplayStatus {
  if (membership.status === "cancelled") {
    return "cancelled";
  }

  if (membership.status === "pending_payment" || membership.status === "partial") {
    return membership.status;
  }

  if (membership.startDate > today) {
    return "future";
  }

  if (membership.endDate < today) {
    return "expired";
  }

  return "active";
}
