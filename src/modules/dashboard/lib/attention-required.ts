import { getTodayInAppTimeZone } from "@/lib/date-format";
import { getOperationalStatus, hasPendingPaymentBalance } from "@/modules/memberships/lib/membership-lifecycle";
import type { MembershipStatus } from "@/modules/memberships/types";

/**
 * Maximum rows shown per "Atención requerida" panel. The true count before
 * this cut is reported separately (see SelectionResult.total) so a panel can
 * show an accurate counter and a "View all" link even when more rows exist.
 */
export const ATTENTION_LIST_LIMIT = 5;

export type AttentionMembershipCandidate = {
  id: string;
  clientId: string;
  membershipPlanId: string;
  startDate: string;
  endDate: string;
  status: MembershipStatus;
};

export type ExpiringAttentionCandidate = {
  id: string;
  clientId: string;
  membershipPlanId: string;
  endDate: string;
  daysRemaining: number;
};

export type SelectionResult<T> = {
  items: T[];
  total: number;
};

/**
 * Days from `fromDate` to `toDate` (both civil YYYY-MM-DD strings), anchored
 * at UTC midnight the same way formatCivilDate is - so the runtime's local
 * time zone can never shift the result by a day. Negative when `toDate` is
 * before `fromDate`.
 */
export function daysBetweenCivilDates(fromDate: string, toDate: string): number {
  const from = Date.UTC(...parseCivilDate(fromDate));
  const to = Date.UTC(...parseCivilDate(toDate));
  return Math.round((to - from) / 86_400_000);
}

function parseCivilDate(value: string): [number, number, number] {
  const [year, month, day] = value.split("-").map(Number);
  return [year, month - 1, day];
}

/**
 * "Próximas a vencer": reuses getOperationalStatus exclusively - a candidate
 * is included if and only if that function classifies it as "expiring", so
 * this can never drift from EXPIRING_SOON_WINDOW_DAYS or the operational
 * memberships dashboard's own definition of the word.
 *
 * Sorted by endDate ascending (most urgent first). Ties are broken by the
 * membership row's own id: it's already present on every candidate before
 * any join happens, and it's unique/stable, so ranking never has to wait on
 * a client-name lookup just to stay deterministic.
 */
export function selectExpiringMemberships(
  candidates: AttentionMembershipCandidate[],
  today: string = getTodayInAppTimeZone(),
): SelectionResult<ExpiringAttentionCandidate> {
  const expiring = candidates.filter(
    (candidate) =>
      getOperationalStatus(candidate.startDate, candidate.endDate, candidate.status, today) === "expiring",
  );

  const sorted = [...expiring].sort((a, b) => {
    if (a.endDate !== b.endDate) {
      return a.endDate.localeCompare(b.endDate);
    }

    return a.id.localeCompare(b.id);
  });

  return {
    total: sorted.length,
    items: sorted.slice(0, ATTENTION_LIST_LIMIT).map((candidate) => ({
      id: candidate.id,
      clientId: candidate.clientId,
      membershipPlanId: candidate.membershipPlanId,
      endDate: candidate.endDate,
      daysRemaining: daysBetweenCivilDates(today, candidate.endDate),
    })),
  };
}

export type PendingPaymentAttentionCandidate = {
  id: string;
  clientId: string;
  membershipPlanId: string;
  status: Extract<MembershipStatus, "pending_payment" | "partial">;
  remainingBalance: number;
};

/**
 * "Pagos pendientes": reuses hasPendingPaymentBalance (membership-lifecycle.ts)
 * literally - the same rule the /dashboard/memberships payment filter uses -
 * so this panel and that list can never drift apart on what counts as a
 * pending payment. The caller only ever passes pending_payment/partial rows
 * (cancelled memberships never reach this function), so in practice this
 * only re-checks remainingBalance > 0 here, but going through the shared
 * predicate keeps both call sites textually tied to one definition.
 *
 * Sorted by remainingBalance descending: the clients who owe the most surface
 * first, which is the most actionable order for a front-desk follow-up list.
 * Ties are broken by id, same rationale as the expiring panel.
 */
export function selectPendingPaymentMemberships(
  candidates: PendingPaymentAttentionCandidate[],
): SelectionResult<PendingPaymentAttentionCandidate> {
  const withBalance = candidates.filter((candidate) => hasPendingPaymentBalance(candidate));

  const sorted = [...withBalance].sort((a, b) => {
    if (a.remainingBalance !== b.remainingBalance) {
      return b.remainingBalance - a.remainingBalance;
    }

    return a.id.localeCompare(b.id);
  });

  return {
    total: sorted.length,
    items: sorted.slice(0, ATTENTION_LIST_LIMIT),
  };
}
