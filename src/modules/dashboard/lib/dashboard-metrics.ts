import { getOperationalStatus } from "@/modules/memberships/lib/membership-lifecycle";
import type { MembershipStatus } from "@/modules/memberships/types";

/**
 * Pure, dependency-free (no Supabase) aggregation of the main dashboard's
 * membership KPI counts, reusing the exact same classification
 * (getOperationalStatus) the operational memberships dashboard already
 * uses - so the two can never drift apart again the way "activeMemberships"
 * and the operational dashboard's own counts had before this change.
 */

export type MembershipMetricsInput = {
  status: MembershipStatus;
  startDate: string;
  endDate: string;
};

export type MembershipMetricsCounts = {
  activeMemberships: number;
  futureMemberships: number;
  expiredMemberships: number;
  membershipsExpiringSoon: number;
};

/**
 * Counts `records` into the four dashboard KPI buckets.
 *
 * Only status === "active" rows are ever counted - pending_payment,
 * partial and cancelled must never show up in "activas", "futuras",
 * "vencidas" or "por vencer" (existing policy, unchanged). The caller
 * (getMembershipMetrics) already filters to status === "active" at the
 * query level for efficiency, but this function re-checks it too, so it
 * stays correct even if a caller forgets to pre-filter.
 *
 * "activeMemberships" counts both "active"- and "expiring"-classified rows
 * - a soon-to-end membership is still currently active today; "por vencer"
 * is a separate, overlapping count, not a subtraction from "active". This
 * matches the dashboard's existing, already-approved semantics.
 */
export function countMembershipMetrics(
  records: MembershipMetricsInput[],
  today: string,
): MembershipMetricsCounts {
  const counts: MembershipMetricsCounts = {
    activeMemberships: 0,
    futureMemberships: 0,
    expiredMemberships: 0,
    membershipsExpiringSoon: 0,
  };

  for (const record of records) {
    if (record.status !== "active") {
      continue;
    }

    const status = getOperationalStatus(record.startDate, record.endDate, record.status, today);

    if (status === "active" || status === "expiring") {
      counts.activeMemberships += 1;
    }

    if (status === "future") {
      counts.futureMemberships += 1;
    }

    if (status === "expired") {
      counts.expiredMemberships += 1;
    }

    if (status === "expiring") {
      counts.membershipsExpiringSoon += 1;
    }
  }

  return counts;
}

/**
 * The first day of `today`'s civil month, derived by slicing the "hoy" civil
 * date string itself (e.g. "2026-07-29" -> "2026-07-01") - never converts
 * anything to a UTC instant, so it can't disagree with `today` at a month or
 * year boundary the way Date.UTC(...)-based month math could.
 */
export function getMonthStartFromCivilDate(todayCivilDate: string): string {
  return `${todayCivilDate.slice(0, 7)}-01`;
}
