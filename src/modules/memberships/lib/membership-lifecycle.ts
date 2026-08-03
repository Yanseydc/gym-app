import { getTodayInAppTimeZone } from "@/lib/date-format";
import type { MembershipOperationalStatus, MembershipStatus } from "@/modules/memberships/types";

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

/**
 * Single definition of the "expiring soon" lookahead window, shared by the
 * operational memberships dashboard and the main dashboard's KPI card so
 * they can never drift apart again the way they had before this change (6
 * days here vs. 7 in the old dashboard-service.ts). Concretely, for
 * today = "2026-07-29": the window covers end_date in
 * ["2026-07-29", "2026-08-03"] inclusive - 6 calendar days counting today -
 * because addDays(today, N) below counts `today` itself as day 1.
 */
export const EXPIRING_SOON_WINDOW_DAYS = 6;

// Local, dependency-free copy of membership-service.ts's addDays (same
// "counts the start date as day 1" arithmetic used there for renewal/
// extension period math) - duplicated rather than imported so this module
// stays free of membership-service.ts's Supabase/server dependencies.
function addDays(dateString: string, durationInDays: number): string {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + durationInDays - 1);
  return date.toISOString().slice(0, 10);
}

export type MembershipOperationalStatusInput = {
  status: MembershipStatus;
  startDate: string;
  endDate: string;
};

/**
 * Visual/operational classification for the memberships dashboard(s).
 * Precedence (each rule only applies once every earlier one is ruled out):
 *   1. cancelled - terminal, always wins.
 *   2. future    - startDate is strictly after `today`.
 *   3. expired   - endDate is before `today`.
 *   4. expiring  - endDate falls within EXPIRING_SOON_WINDOW_DAYS.
 *   5. active    - everything else.
 * `today` defaults to getTodayInAppTimeZone() (America/Tijuana) but can be
 * injected for deterministic tests. Informational only - see
 * hasActiveAccessNow/selectAccessRecord for the check-in access decision,
 * and isCurrentActiveMembership for the operational dashboard's "current
 * membership" grouping - neither is derived from this function.
 */
/**
 * Whether a persisted membership status is one of the two payment-gate
 * states - shared by the "Atención requerida" pending-payments panel
 * (dashboard-service.ts) and the /dashboard/memberships payment filter, so
 * both can narrow candidates to "payment-relevant" rows with the exact same
 * rule. Pure, no dependency on remainingBalance (which isn't known yet at
 * the point dashboard-service.ts narrows candidates, before the plan-price/
 * payment queries run).
 */
export function isPendingPaymentStatus(
  status: MembershipStatus,
): status is Extract<MembershipStatus, "pending_payment" | "partial"> {
  return status === "pending_payment" || status === "partial";
}

/**
 * The full "Pagos pendientes" membership rule, reused literally by both
 * selectPendingPaymentMemberships (attention-required.ts) and the
 * /dashboard/memberships payment filter (membership-operations-dashboard.tsx):
 * a payment-gate status (pending_payment/partial) AND an actual outstanding
 * balance. Cancelled memberships are excluded implicitly - they can never
 * satisfy isPendingPaymentStatus. No date/temporal check here by design:
 * future, current and expired pending_payment/partial rows with a balance
 * all qualify, matching the existing dashboard panel's own definition.
 */
export function hasPendingPaymentBalance(
  candidate: { status: MembershipStatus; remainingBalance: number },
): boolean {
  return isPendingPaymentStatus(candidate.status) && candidate.remainingBalance > 0;
}

export function getOperationalStatus(
  startDate: string,
  endDate: string,
  status: MembershipStatus,
  today: string = getTodayInAppTimeZone(),
): MembershipOperationalStatus {
  if (status === "cancelled") {
    return "cancelled";
  }

  if (startDate > today) {
    return "future";
  }

  if (endDate < today) {
    return "expired";
  }

  const soon = addDays(today, EXPIRING_SOON_WINDOW_DAYS);

  if (endDate <= soon) {
    return "expiring";
  }

  return "active";
}
