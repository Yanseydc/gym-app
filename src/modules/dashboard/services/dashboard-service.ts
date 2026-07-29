import { cache } from "react";

import { applyGymScope, requireGymScope, type GymScope } from "@/lib/auth/gym-scope";
import { getTodayInAppTimeZone } from "@/lib/date-format";
import { createClient } from "@/lib/supabase/server";
import { countMembershipMetrics, getMonthStartFromCivilDate } from "@/modules/dashboard/lib/dashboard-metrics";
import type { AppSupabaseClient } from "@/types/supabase";
import type {
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

export const getDashboardSnapshot = cache(async (): Promise<DashboardSnapshot> => {
  const supabase = await createClient();
  const { data: scope, error: scopeError } = await requireGymScope(supabase);
  const errors: string[] = [];
  const metrics = emptyMetrics();
  let recentPayments: RecentDashboardPayment[] = [];
  let recentClients: RecentDashboardClient[] = [];

  if (scopeError || !scope) {
    return {
      metrics,
      recentPayments,
      recentClients,
      errors: [scopeError ?? "Unable to resolve gym scope."],
    };
  }

  const [activeClientsResult, membershipMetricsResult, incomeMetricsResult, recentPaymentsResult, recentClientsResult] =
    await Promise.allSettled([
      getActiveClientsCount(supabase, scope),
      getMembershipMetrics(supabase, scope),
      getIncomeMetrics(supabase, scope),
      getRecentPayments(supabase, scope),
      getRecentClients(supabase, scope),
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

  return {
    metrics,
    recentPayments,
    recentClients,
    errors,
  };
});
