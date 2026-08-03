import { cache } from "react";

import { applyGymScope, requireGymScope, type GymScope } from "@/lib/auth/gym-scope";
import { getTodayInAppTimeZone } from "@/lib/date-format";
import { createClient } from "@/lib/supabase/server";
import {
  selectExpiringMemberships,
  selectPendingPaymentMemberships,
  type AttentionMembershipCandidate,
  type PendingPaymentAttentionCandidate,
} from "@/modules/dashboard/lib/attention-required";
import { countMembershipMetrics, getMonthStartFromCivilDate } from "@/modules/dashboard/lib/dashboard-metrics";
import { isPendingPaymentStatus } from "@/modules/memberships/lib/membership-lifecycle";
import type { AppSupabaseClient } from "@/types/supabase";
import type {
  AttentionRequiredSnapshot,
  DashboardMetrics,
  DashboardSnapshot,
  RecentDashboardClient,
  RecentDashboardPayment,
} from "@/modules/dashboard/types";

function emptyMetrics(): DashboardMetrics {
  return {
    activeClients: 0,
    activeMemberships: 0,
    futureMemberships: 0,
    expiredMemberships: 0,
    membershipsExpiringSoon: 0,
    incomeToday: 0,
    incomeThisMonth: 0,
  };
}

function emptyAttentionRequired(): AttentionRequiredSnapshot {
  return {
    expiring: [],
    expiringTotal: 0,
    pendingPayments: [],
    pendingPaymentsTotal: 0,
  };
}

async function getActiveClientsCount(supabase: AppSupabaseClient, scope: GymScope) {
  let query = supabase
    .from("clients")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  query = applyGymScope(query, scope);

  const { count, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

/**
 * A single query for status === "active" client_memberships, minimal
 * columns only (status/start_date/end_date - no `select("*")`, no
 * per-bucket queries). Classification happens in JS via
 * countMembershipMetrics, reusing the exact same rules as the operational
 * memberships dashboard (getOperationalStatus) so the two can't drift apart.
 * At the current data volume a single row-fetching query is simpler and
 * safer than four separate COUNT queries; if a gym's membership volume ever
 * makes that fetch expensive, a SQL-side aggregation (e.g. a Postgres
 * function grouping by the same rules) can replace this without changing
 * DashboardMetrics' shape.
 */
async function getMembershipMetrics(supabase: AppSupabaseClient, scope: GymScope) {
  const today = getTodayInAppTimeZone();

  let query = supabase
    .from("client_memberships")
    .select("status, start_date, end_date")
    .eq("status", "active");
  query = applyGymScope(query, scope);

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const records = (data ?? []).map((record) => ({
    status: record.status,
    startDate: record.start_date,
    endDate: record.end_date,
  }));

  return countMembershipMetrics(records, today);
}

async function getIncomeMetrics(supabase: AppSupabaseClient, scope: GymScope) {
  const today = getTodayInAppTimeZone();
  const monthStart = getMonthStartFromCivilDate(today);
  let todayQuery = supabase.from("payments").select("amount").eq("payment_date", today);
  let monthQuery = supabase.from("payments").select("amount").gte("payment_date", monthStart);

  todayQuery = applyGymScope(todayQuery, scope);
  monthQuery = applyGymScope(monthQuery, scope);

  const [{ data: todayPayments, error: todayError }, { data: monthPayments, error: monthError }] =
    await Promise.all([todayQuery, monthQuery]);

  if (todayError) {
    throw new Error(todayError.message);
  }

  if (monthError) {
    throw new Error(monthError.message);
  }

  return {
    incomeToday: (todayPayments ?? []).reduce(
      (total, payment) => total + Number(payment.amount),
      0,
    ),
    incomeThisMonth: (monthPayments ?? []).reduce(
      (total, payment) => total + Number(payment.amount),
      0,
    ),
  };
}

async function getRecentPayments(supabase: AppSupabaseClient, scope: GymScope): Promise<RecentDashboardPayment[]> {
  let query = supabase
    .from("payments")
    .select("id, client_id, amount, payment_method, payment_date, concept")
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);

  query = applyGymScope(query, scope);

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const payments = data ?? [];
  const clientIds = [...new Set(payments.map((payment) => String(payment.client_id)))];

  let clientMap = new Map<string, string>();

  if (clientIds.length > 0) {
    let clientsQuery = supabase
      .from("clients")
      .select("id, first_name, last_name")
      .in("id", clientIds);

    clientsQuery = applyGymScope(clientsQuery, scope);

    const { data: clients, error: clientsError } = await clientsQuery;

    if (clientsError) {
      throw new Error(clientsError.message);
    }

    clientMap = new Map(
      (clients ?? []).map((client) => [
        String(client.id),
        `${String(client.first_name)} ${String(client.last_name)}`,
      ]),
    );
  }

  return payments.map((payment) => ({
    id: String(payment.id),
    clientId: String(payment.client_id),
    clientName: clientMap.get(String(payment.client_id)) ?? "Unknown client",
    amount: Number(payment.amount),
    paymentMethod: payment.payment_method as RecentDashboardPayment["paymentMethod"],
    paymentDate: String(payment.payment_date),
    concept: String(payment.concept),
  }));
}

async function getRecentClients(supabase: AppSupabaseClient, scope: GymScope): Promise<RecentDashboardClient[]> {
  let query = supabase
    .from("clients")
    .select("id, first_name, last_name, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  query = applyGymScope(query, scope);

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((client) => ({
    id: String(client.id),
    fullName: `${String(client.first_name)} ${String(client.last_name)}`,
    status: client.status as RecentDashboardClient["status"],
    createdAt: String(client.created_at),
  }));
}

async function getPlanNamePriceMap(
  supabase: AppSupabaseClient,
  scope: GymScope,
  planIds: string[],
): Promise<Map<string, { name: string; price: number }>> {
  if (planIds.length === 0) {
    return new Map();
  }

  let query = supabase.from("membership_plans").select("id, name, price").in("id", planIds);
  query = applyGymScope(query, scope);

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    (data ?? []).map((plan) => [String(plan.id), { name: String(plan.name), price: Number(plan.price) }]),
  );
}

async function getPaymentTotalsByMembership(
  supabase: AppSupabaseClient,
  scope: GymScope,
  membershipIds: string[],
): Promise<Map<string, number>> {
  if (membershipIds.length === 0) {
    return new Map();
  }

  let query = supabase
    .from("payments")
    .select("client_membership_id, amount")
    .in("client_membership_id", membershipIds);
  query = applyGymScope(query, scope);

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).reduce((map, payment) => {
    const membershipId = String(payment.client_membership_id);
    map.set(membershipId, (map.get(membershipId) ?? 0) + Number(payment.amount));
    return map;
  }, new Map<string, number>());
}

async function getClientNameMap(
  supabase: AppSupabaseClient,
  scope: GymScope,
  clientIds: string[],
): Promise<Map<string, string>> {
  if (clientIds.length === 0) {
    return new Map();
  }

  let query = supabase.from("clients").select("id, first_name, last_name").in("id", clientIds);
  query = applyGymScope(query, scope);

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    (data ?? []).map((client) => [String(client.id), `${String(client.first_name)} ${String(client.last_name)}`]),
  );
}

/**
 * "Atención requerida" data for the dashboard: memberships expiring soon and
 * memberships with a pending/partial payment balance.
 *
 * One base query fetches every non-cancelled client_membership (minimal
 * columns: id/client/plan/dates/status, gym-scoped). A single row set
 * naturally contains both candidate pools - the "expiring" and
 * "pending payment" panels are just two different filters over the same
 * data - so there's no need for two separate base queries.
 *
 * The pending-payment panel ranks by remainingBalance, so it needs that
 * balance for every pending_payment/partial candidate (not just the final
 * five) before it can sort and cut - that requires each candidate's plan
 * price and total paid, fetched via two more queries scoped ONLY to the
 * pending-payment/partial candidates, never the whole gym.
 *
 * Once both panels' final selections (<=5 rows each) are known, one last
 * pair of queries resolves plan names and client display names for exactly
 * those rows' ids - the "expiring" panel never touches plan price or
 * payments, and no panel ever fetches a client/plan name for a row that
 * won't be shown. The plan-price query above may already cover some of
 * these plan ids (when a pending-payment candidate's plan also appears in
 * the expiring selection); re-fetching that overlap here is a few extra
 * primary-key lookups, not worth extra bookkeeping to dedupe.
 *
 * Total round trips: 1 (candidates) -> 2 in parallel (plan price + payments,
 * scoped to pending-payment candidates) -> 2 in parallel (plan names +
 * client names, scoped to the final selection) = 4 sequential stages, none
 * per-row.
 */
async function getAttentionRequired(
  supabase: AppSupabaseClient,
  scope: GymScope,
): Promise<AttentionRequiredSnapshot> {
  const today = getTodayInAppTimeZone();

  let query = supabase
    .from("client_memberships")
    .select("id, client_id, membership_plan_id, start_date, end_date, status")
    .neq("status", "cancelled");
  query = applyGymScope(query, scope);

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const candidates: AttentionMembershipCandidate[] = (data ?? []).map((record) => ({
    id: String(record.id),
    clientId: String(record.client_id),
    membershipPlanId: String(record.membership_plan_id),
    startDate: String(record.start_date),
    endDate: String(record.end_date),
    status: record.status,
  }));

  const expiringSelection = selectExpiringMemberships(candidates, today);

  const pendingCandidatesRaw = candidates.filter(
    (candidate): candidate is AttentionMembershipCandidate & { status: "pending_payment" | "partial" } =>
      isPendingPaymentStatus(candidate.status),
  );
  const pendingPlanIds = [...new Set(pendingCandidatesRaw.map((candidate) => candidate.membershipPlanId))];
  const pendingMembershipIds = pendingCandidatesRaw.map((candidate) => candidate.id);

  const [pendingPlanMap, paymentTotalsByMembership] = await Promise.all([
    getPlanNamePriceMap(supabase, scope, pendingPlanIds),
    getPaymentTotalsByMembership(supabase, scope, pendingMembershipIds),
  ]);

  const pendingCandidatesWithBalance: PendingPaymentAttentionCandidate[] = pendingCandidatesRaw.map((candidate) => ({
    id: candidate.id,
    clientId: candidate.clientId,
    membershipPlanId: candidate.membershipPlanId,
    status: candidate.status,
    remainingBalance: Math.max(
      0,
      (pendingPlanMap.get(candidate.membershipPlanId)?.price ?? 0) -
        (paymentTotalsByMembership.get(candidate.id) ?? 0),
    ),
  }));

  const pendingSelection = selectPendingPaymentMemberships(pendingCandidatesWithBalance);

  const finalPlanIds = [
    ...new Set([
      ...expiringSelection.items.map((item) => item.membershipPlanId),
      ...pendingSelection.items.map((item) => item.membershipPlanId),
    ]),
  ];
  const finalClientIds = [
    ...new Set([
      ...expiringSelection.items.map((item) => item.clientId),
      ...pendingSelection.items.map((item) => item.clientId),
    ]),
  ];

  const [planNameMap, clientNameMap] = await Promise.all([
    getPlanNamePriceMap(supabase, scope, finalPlanIds),
    getClientNameMap(supabase, scope, finalClientIds),
  ]);

  return {
    expiring: expiringSelection.items.map((item) => ({
      id: item.id,
      clientId: item.clientId,
      clientName: clientNameMap.get(item.clientId) ?? "Unknown client",
      planName: planNameMap.get(item.membershipPlanId)?.name ?? "Unknown plan",
      endDate: item.endDate,
      daysRemaining: item.daysRemaining,
    })),
    expiringTotal: expiringSelection.total,
    pendingPayments: pendingSelection.items.map((item) => ({
      id: item.id,
      clientId: item.clientId,
      clientName: clientNameMap.get(item.clientId) ?? "Unknown client",
      planName: planNameMap.get(item.membershipPlanId)?.name ?? "Unknown plan",
      status: item.status,
      remainingBalance: item.remainingBalance,
    })),
    pendingPaymentsTotal: pendingSelection.total,
  };
}

export const getDashboardSnapshot = cache(async (): Promise<DashboardSnapshot> => {
  const supabase = await createClient();
  const { data: scope, error: scopeError } = await requireGymScope(supabase);
  const errors: string[] = [];
  const metrics = emptyMetrics();
  let recentPayments: RecentDashboardPayment[] = [];
  let recentClients: RecentDashboardClient[] = [];
  let attentionRequired = emptyAttentionRequired();

  if (scopeError || !scope) {
    return {
      metrics,
      recentPayments,
      recentClients,
      attentionRequired,
      errors: [scopeError ?? "Unable to resolve gym scope."],
    };
  }

  const [
    activeClientsResult,
    membershipMetricsResult,
    incomeMetricsResult,
    recentPaymentsResult,
    recentClientsResult,
    attentionRequiredResult,
  ] = await Promise.allSettled([
    getActiveClientsCount(supabase, scope),
    getMembershipMetrics(supabase, scope),
    getIncomeMetrics(supabase, scope),
    getRecentPayments(supabase, scope),
    getRecentClients(supabase, scope),
    getAttentionRequired(supabase, scope),
  ]);

  if (activeClientsResult.status === "fulfilled") {
    metrics.activeClients = activeClientsResult.value;
  } else {
    errors.push(activeClientsResult.reason instanceof Error ? activeClientsResult.reason.message : "Unable to load active clients.");
  }

  if (membershipMetricsResult.status === "fulfilled") {
    metrics.activeMemberships = membershipMetricsResult.value.activeMemberships;
    metrics.futureMemberships = membershipMetricsResult.value.futureMemberships;
    metrics.expiredMemberships = membershipMetricsResult.value.expiredMemberships;
    metrics.membershipsExpiringSoon = membershipMetricsResult.value.membershipsExpiringSoon;
  } else {
    errors.push(membershipMetricsResult.reason instanceof Error ? membershipMetricsResult.reason.message : "Unable to load membership metrics.");
  }

  if (incomeMetricsResult.status === "fulfilled") {
    metrics.incomeToday = incomeMetricsResult.value.incomeToday;
    metrics.incomeThisMonth = incomeMetricsResult.value.incomeThisMonth;
  } else {
    errors.push(incomeMetricsResult.reason instanceof Error ? incomeMetricsResult.reason.message : "Unable to load income metrics.");
  }

  if (recentPaymentsResult.status === "fulfilled") {
    recentPayments = recentPaymentsResult.value;
  } else {
    errors.push(recentPaymentsResult.reason instanceof Error ? recentPaymentsResult.reason.message : "Unable to load recent payments.");
  }

  if (recentClientsResult.status === "fulfilled") {
    recentClients = recentClientsResult.value;
  } else {
    errors.push(recentClientsResult.reason instanceof Error ? recentClientsResult.reason.message : "Unable to load recent clients.");
  }

  if (attentionRequiredResult.status === "fulfilled") {
    attentionRequired = attentionRequiredResult.value;
  } else {
    errors.push(attentionRequiredResult.reason instanceof Error ? attentionRequiredResult.reason.message : "Unable to load attention required data.");
  }

  return {
    metrics,
    recentPayments,
    recentClients,
    attentionRequired,
    errors,
  };
});
