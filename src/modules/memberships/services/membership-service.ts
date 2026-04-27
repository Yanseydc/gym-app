import { cache } from "react";

import { applyGymScope, requireGymScope, withGymId } from "@/lib/auth/gym-scope";
import { createClient } from "@/lib/supabase/server";
import type { AppSupabaseClient } from "@/types/supabase";
import type {
  ClientMembership,
  ClientMembershipFormValues,
  ClientMembershipRecord,
  MembershipPlan,
  MembershipPlanFormValues,
  MembershipPlanRecord,
  MembershipStatus,
} from "@/modules/memberships/types";

type MembershipAccessSummary = {
  membershipId: string | null;
  planName: string;
  endDate: string | null;
  status: MembershipStatus | "none";
  totalPaid: number;
  remainingBalance: number;
};

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(startDate: string, durationInDays: number) {
  const date = new Date(`${startDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + durationInDays - 1);
  return toIsoDate(date);
}

function resolveMembershipStatus(endDate: string, baseStatus: MembershipStatus): MembershipStatus {
  if (baseStatus === "cancelled") {
    return "cancelled";
  }

  if (baseStatus === "pending_payment" || baseStatus === "partial") {
    return baseStatus;
  }

  const today = toIsoDate(new Date());
  return endDate < today ? "expired" : "active";
}

function mapMembershipPlan(record: MembershipPlanRecord): MembershipPlan {
  return {
    id: record.id,
    name: record.name,
    durationInDays: record.duration_in_days,
    price: Number(record.price),
    description: record.description,
    isActive: record.is_active,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function normalizeMembershipPlanPayload(values: MembershipPlanFormValues) {
  return {
    name: values.name.trim(),
    duration_in_days: values.durationInDays,
    price: values.price,
    description: values.description.trim() || null,
    is_active: values.isActive,
    updated_at: new Date().toISOString(),
  };
}

function mapClientMembership(
  record: ClientMembershipRecord,
  planName: string,
  planPrice: number,
  totalPaid: number,
): ClientMembership {
  const remainingBalance = Math.max(0, planPrice - totalPaid);
  const effectiveStatus = resolveMembershipStatus(record.end_date, record.status);

  return {
    id: record.id,
    clientId: record.client_id,
    membershipPlanId: record.membership_plan_id,
    planName,
    planPrice,
    startDate: record.start_date,
    endDate: record.end_date,
    status: effectiveStatus,
    totalPaid,
    remainingBalance,
    notes: record.notes,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export async function getClientMembershipAccessLookup(
  supabase: AppSupabaseClient,
  clientIds: string[],
): Promise<Map<string, MembershipAccessSummary>> {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    throw new Error(scopeError ?? "Unable to resolve gym scope.");
  }

  if (clientIds.length === 0) {
    return new Map();
  }

  let membershipsQuery = supabase
    .from("client_memberships")
    .select("*")
    .in("client_id", clientIds)
    .order("start_date", { ascending: false });

  membershipsQuery = applyGymScope(membershipsQuery, scope);

  const { data, error } = await membershipsQuery;

  if (error) {
    throw new Error(error.message);
  }

  const records = (data ?? []) as ClientMembershipRecord[];
  const planIds = [...new Set(records.map((record) => record.membership_plan_id))];
  const membershipIds = records.map((record) => record.id);

  let planMap = new Map<string, { name: string; price: number }>();

  if (planIds.length > 0) {
    let plansQuery = supabase
      .from("membership_plans")
      .select("id, name, price")
      .in("id", planIds);

    plansQuery = applyGymScope(plansQuery, scope);

    const { data: plans, error: plansError } = await plansQuery;

    if (plansError) {
      throw new Error(plansError.message);
    }

    planMap = new Map(
      (plans ?? []).map((plan) => [
        String(plan.id),
        {
          name: String(plan.name),
          price: Number(plan.price),
        },
      ]),
    );
  }

  let paymentTotals = new Map<string, number>();

  if (membershipIds.length > 0) {
    let paymentsQuery = supabase
      .from("payments")
      .select("client_membership_id, amount")
      .in("client_membership_id", membershipIds);

    paymentsQuery = applyGymScope(paymentsQuery, scope);

    const { data: payments, error: paymentsError } = await paymentsQuery;

    if (paymentsError) {
      throw new Error(paymentsError.message);
    }

    paymentTotals = (payments ?? []).reduce((map, payment) => {
      const membershipId = String(payment.client_membership_id);
      map.set(membershipId, (map.get(membershipId) ?? 0) + Number(payment.amount));
      return map;
    }, new Map<string, number>());
  }

  const grouped = new Map<string, ClientMembership[]>();

  records.forEach((record) => {
    const clientId = String(record.client_id);
    const list = grouped.get(clientId) ?? [];
    list.push(
      mapClientMembership(
        record,
        planMap.get(record.membership_plan_id)?.name ?? "Unknown plan",
        planMap.get(record.membership_plan_id)?.price ?? 0,
        paymentTotals.get(record.id) ?? 0,
      ),
    );
    grouped.set(clientId, list);
  });

  return new Map<string, MembershipAccessSummary>(
    clientIds.map((clientId) => {
      const memberships = grouped.get(clientId) ?? [];
      const latestMembership = memberships[0];

      if (!latestMembership) {
        return [
          clientId,
          {
            membershipId: null,
            planName: "No membership history",
            endDate: null,
            status: "none" as const,
            totalPaid: 0,
            remainingBalance: 0,
          },
        ];
      }

      return [
        clientId,
        {
          membershipId: latestMembership.id,
          planName: latestMembership.planName,
          endDate: latestMembership.endDate,
          status: latestMembership.status,
          totalPaid: latestMembership.totalPaid,
          remainingBalance: latestMembership.remainingBalance,
        },
      ];
    }),
  );
}

export async function listMembershipPlans(
  supabase: AppSupabaseClient,
): Promise<{ data: MembershipPlan[]; error: string | null }> {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: [], error: scopeError };
  }

  let query = supabase
    .from("membership_plans")
    .select("*")
    .order("name", { ascending: true });

  query = applyGymScope(query, scope);

  const { data, error } = await query;

  if (error) {
    return {
      data: [],
      error: error.message,
    };
  }

  return {
    data: (data ?? []).map((plan) => mapMembershipPlan(plan as MembershipPlanRecord)),
    error: null,
  };
}

export async function listActiveMembershipPlans(
  supabase: AppSupabaseClient,
): Promise<{ data: MembershipPlan[]; error: string | null }> {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: [], error: scopeError };
  }

  let query = supabase
    .from("membership_plans")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  query = applyGymScope(query, scope);

  const { data, error } = await query;

  if (error) {
    return {
      data: [],
      error: error.message,
    };
  }

  return {
    data: (data ?? []).map((plan) => mapMembershipPlan(plan as MembershipPlanRecord)),
    error: null,
  };
}

export async function getMembershipPlanById(
  supabase: AppSupabaseClient,
  membershipId: string,
): Promise<{ data: MembershipPlan | null; error: string | null }> {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: scopeError };
  }

  let query = supabase
    .from("membership_plans")
    .select("*")
    .eq("id", membershipId);

  query = applyGymScope(query, scope);

  const { data, error } = await query.maybeSingle();

  if (error) {
    return {
      data: null,
      error: error.message,
    };
  }

  return {
    data: data ? mapMembershipPlan(data as MembershipPlanRecord) : null,
    error: null,
  };
}

export async function createMembershipPlanRecord(
  supabase: AppSupabaseClient,
  values: MembershipPlanFormValues,
) {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: { message: scopeError ?? "Unable to resolve gym scope." } };
  }

  return supabase
    .from("membership_plans")
    .insert(withGymId({
      ...normalizeMembershipPlanPayload(values),
      created_at: new Date().toISOString(),
    }, scope))
    .select("id")
    .single();
}

export async function updateMembershipPlanRecord(
  supabase: AppSupabaseClient,
  membershipId: string,
  values: MembershipPlanFormValues,
) {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: { message: scopeError ?? "Unable to resolve gym scope." } };
  }

  let query = supabase
    .from("membership_plans")
    .update(normalizeMembershipPlanPayload(values))
    .eq("id", membershipId);

  query = applyGymScope(query, scope);

  return query.select("id").single();
}

export async function assignMembershipToClientRecord(
  supabase: AppSupabaseClient,
  clientId: string,
  values: ClientMembershipFormValues,
) {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: scopeError ?? "Unable to resolve gym scope." };
  }

  let clientQuery = supabase
    .from("clients")
    .select("id")
    .eq("id", clientId);

  clientQuery = applyGymScope(clientQuery, scope);

  const { data: clientData, error: clientError } = await clientQuery.maybeSingle();

  if (clientError) {
    return { data: null, error: clientError.message };
  }

  if (!clientData) {
    return { data: null, error: "Selected client is not available." };
  }

  let overlappingQuery = supabase
    .from("client_memberships")
    .select("id, start_date, end_date, status")
    .eq("client_id", clientId)
    .eq("status", "active")
    .lte("start_date", values.startDate)
    .gte("end_date", values.startDate)
    .limit(1);

  overlappingQuery = applyGymScope(overlappingQuery, scope);

  const { data: overlappingMemberships, error: overlappingMembershipsError } = await overlappingQuery;

  if (overlappingMembershipsError) {
    return {
      data: null,
      error: overlappingMembershipsError.message,
    };
  }

  const openMembership = (overlappingMemberships ?? [])[0];

  if (openMembership) {
    return {
      data: null,
      error:
        "This client already has an active membership for that date. Choose a different start date or review the current membership.",
    };
  }

  let planQuery = supabase
    .from("membership_plans")
    .select("*")
    .eq("id", values.membershipPlanId)
    .eq("is_active", true);

  planQuery = applyGymScope(planQuery, scope);

  const { data: planData, error: planError } = await planQuery.maybeSingle();

  if (planError) {
    return {
      data: null,
      error: planError.message,
    };
  }

  const plan = planData as MembershipPlanRecord | null;

  if (!plan) {
    return {
      data: null,
      error: "Selected membership plan is not available.",
    };
  }

  const endDate = addDays(values.startDate, plan.duration_in_days);
  const status: MembershipStatus = "pending_payment";

  return supabase
    .from("client_memberships")
    .insert(withGymId({
      client_id: clientId,
      membership_plan_id: plan.id,
      start_date: values.startDate,
      end_date: endDate,
      status,
      notes: values.notes.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, scope))
    .select("id")
    .single();
}

export async function cancelClientMembershipRecord(
  supabase: AppSupabaseClient,
  clientMembershipId: string,
) {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: { message: scopeError ?? "Unable to resolve gym scope." } };
  }

  let query = supabase
    .from("client_memberships")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientMembershipId);

  query = applyGymScope(query, scope);

  return query.select("id").single();
}

export async function listClientMembershipHistory(
  supabase: AppSupabaseClient,
  clientId: string,
): Promise<{ data: ClientMembership[]; error: string | null }> {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: [], error: scopeError };
  }

  let query = supabase
    .from("client_memberships")
    .select("*")
    .eq("client_id", clientId)
    .order("start_date", { ascending: false });

  query = applyGymScope(query, scope);

  const { data, error } = await query;

  if (error) {
    return {
      data: [],
      error: error.message,
    };
  }

  try {
    const records = (data ?? []) as ClientMembershipRecord[];
    const planIds = [...new Set(records.map((record) => record.membership_plan_id))];
    let planMap = new Map<string, { name: string; price: number }>();

    if (planIds.length > 0) {
      let plansQuery = supabase
        .from("membership_plans")
        .select("id, name, price")
        .in("id", planIds);

      plansQuery = applyGymScope(plansQuery, scope);

      const { data: plans, error: plansError } = await plansQuery;

      if (plansError) {
        return {
          data: [],
          error: plansError.message,
        };
      }

      planMap = new Map(
        (plans ?? []).map((plan) => [
          String(plan.id),
          { name: String(plan.name), price: Number(plan.price) },
        ]),
      );
    }

    const membershipIds = records.map((record) => record.id);
    let paymentTotals = new Map<string, number>();

    if (membershipIds.length > 0) {
      let paymentsQuery = supabase
        .from("payments")
        .select("client_membership_id, amount")
        .in("client_membership_id", membershipIds);

      paymentsQuery = applyGymScope(paymentsQuery, scope);

      const { data: payments, error: paymentsError } = await paymentsQuery;

      if (paymentsError) {
        return {
          data: [],
          error: paymentsError.message,
        };
      }

      paymentTotals = (payments ?? []).reduce((map, payment) => {
        const membershipId = String(payment.client_membership_id);
        map.set(membershipId, (map.get(membershipId) ?? 0) + Number(payment.amount));
        return map;
      }, new Map<string, number>());
    }

    return {
      data: records.map((record) =>
        mapClientMembership(
          record,
          planMap.get(record.membership_plan_id)?.name ?? "Unknown plan",
          planMap.get(record.membership_plan_id)?.price ?? 0,
          paymentTotals.get(record.id) ?? 0,
        ),
      ),
      error: null,
    };
  } catch (lookupError) {
    return {
      data: [],
      error: lookupError instanceof Error ? lookupError.message : "Unable to load memberships.",
    };
  }
}

export async function listMembershipAssignmentsByPlanId(
  supabase: AppSupabaseClient,
  membershipId: string,
): Promise<
  {
    data: Array<{
      id: string;
      clientId: string;
      clientName: string;
      planPrice: number;
      totalPaid: number;
      remainingBalance: number;
      startDate: string;
      endDate: string;
      status: MembershipStatus;
    }>;
    error: string | null;
  }
> {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: [], error: scopeError };
  }

  let query = supabase
    .from("client_memberships")
    .select("*")
    .eq("membership_plan_id", membershipId)
    .order("start_date", { ascending: false });

  query = applyGymScope(query, scope);

  const { data, error } = await query;

  if (error) {
    return {
      data: [],
      error: error.message,
    };
  }

  const memberships = (data ?? []) as ClientMembershipRecord[];
  const clientIds = [...new Set(memberships.map((membership) => membership.client_id))];

  let clientMap = new Map<string, string>();

  if (clientIds.length > 0) {
    let clientsQuery = supabase
      .from("clients")
      .select("id, first_name, last_name")
      .in("id", clientIds);

    clientsQuery = applyGymScope(clientsQuery, scope);

    const { data: clients, error: clientsError } = await clientsQuery;

    if (clientsError) {
      return {
        data: [],
        error: clientsError.message,
      };
    }

    clientMap = new Map(
      (clients ?? []).map((client) => [
        String(client.id),
        `${String(client.first_name)} ${String(client.last_name)}`,
      ]),
    );
  }

  const membershipIds = memberships.map((membership) => membership.id);
  let paymentTotals = new Map<string, number>();

  if (membershipIds.length > 0) {
    let paymentsQuery = supabase
      .from("payments")
      .select("client_membership_id, amount")
      .in("client_membership_id", membershipIds);

    paymentsQuery = applyGymScope(paymentsQuery, scope);

    const { data: payments, error: paymentsError } = await paymentsQuery;

    if (paymentsError) {
      return {
        data: [],
        error: paymentsError.message,
      };
    }

    paymentTotals = (payments ?? []).reduce((map, payment) => {
      const membershipId = String(payment.client_membership_id);
      map.set(membershipId, (map.get(membershipId) ?? 0) + Number(payment.amount));
      return map;
    }, new Map<string, number>());
  }

  let planQuery = supabase
    .from("membership_plans")
    .select("id, price")
    .eq("id", membershipId);

  planQuery = applyGymScope(planQuery, scope);

  const { data: planData, error: planError } = await planQuery.maybeSingle();

  if (planError) {
    return {
      data: [],
      error: planError.message,
    };
  }

  const planPrice = planData ? Number(planData.price) : 0;

  return {
    data: memberships.map((membership) => ({
      id: membership.id,
      clientId: membership.client_id,
      clientName: clientMap.get(membership.client_id) ?? "Unknown client",
      planPrice,
      totalPaid: paymentTotals.get(membership.id) ?? 0,
      remainingBalance: Math.max(0, planPrice - (paymentTotals.get(membership.id) ?? 0)),
      startDate: membership.start_date,
      endDate: membership.end_date,
      status: resolveMembershipStatus(membership.end_date, membership.status),
    })),
    error: null,
  };
}

export const getMembershipPlansForPage = cache(async () => {
  const supabase = await createClient();
  return listMembershipPlans(supabase);
});

export const getActiveMembershipPlansForPage = cache(async () => {
  const supabase = await createClient();
  return listActiveMembershipPlans(supabase);
});

export const getMembershipPlanForPage = cache(async (membershipId: string) => {
  const supabase = await createClient();
  return getMembershipPlanById(supabase, membershipId);
});

export const getClientMembershipHistoryForPage = cache(async (clientId: string) => {
  const supabase = await createClient();
  return listClientMembershipHistory(supabase, clientId);
});

export const getMembershipAssignmentsForPage = cache(async (membershipId: string) => {
  const supabase = await createClient();
  return listMembershipAssignmentsByPlanId(supabase, membershipId);
});
