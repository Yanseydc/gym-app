import { cache } from "react";

import { applyGymScope, requireGymScope, type GymScope } from "@/lib/auth/gym-scope";
import { createClient } from "@/lib/supabase/server";
import type { AppSupabaseClient } from "@/types/supabase";
import type {
  DashboardMetrics,
  DashboardSnapshot,
  RecentDashboardClient,
  RecentDashboardPayment,
} from "@/modules/dashboard/types";

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getMonthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function emptyMetrics(): DashboardMetrics {
  return {
    activeClients: 0,
    activeMemberships: 0,
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

async function getMembershipMetrics(supabase: AppSupabaseClient, scope: GymScope) {
  const today = toIsoDate(new Date());
  const soonDate = toIsoDate(addDays(new Date(), 7));

  let activeQuery = supabase
    .from("client_memberships")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
    .gte("end_date", today);
  let expiredQuery = supabase
    .from("client_memberships")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
    .lt("end_date", today);
  let soonQuery = supabase
    .from("client_memberships")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
    .gte("end_date", today)
    .lte("end_date", soonDate);

  activeQuery = applyGymScope(activeQuery, scope);
  expiredQuery = applyGymScope(expiredQuery, scope);
  soonQuery = applyGymScope(soonQuery, scope);

  const [activeMembershipsResult, expiredMembershipsResult, expiringSoonResult] =
    await Promise.all([activeQuery, expiredQuery, soonQuery]);

  if (activeMembershipsResult.error) {
    throw new Error(activeMembershipsResult.error.message);
  }

  if (expiredMembershipsResult.error) {
    throw new Error(expiredMembershipsResult.error.message);
  }

  if (expiringSoonResult.error) {
    throw new Error(expiringSoonResult.error.message);
  }

  return {
    activeMemberships: activeMembershipsResult.count ?? 0,
    expiredMemberships: expiredMembershipsResult.count ?? 0,
    membershipsExpiringSoon: expiringSoonResult.count ?? 0,
  };
}

async function getIncomeMetrics(supabase: AppSupabaseClient, scope: GymScope) {
  const monthStart = toIsoDate(getMonthStart(new Date()));
  const today = toIsoDate(new Date());
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
