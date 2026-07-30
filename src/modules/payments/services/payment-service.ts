import { cache } from "react";

import { applyGymScope, requireGymScope, withGymId, type GymScope } from "@/lib/auth/gym-scope";
import { createClient } from "@/lib/supabase/server";
import { getDisplayLifecycleStatus } from "@/modules/memberships/lib/membership-lifecycle";
import type { AppSupabaseClient } from "@/types/supabase";
import type {
  Payment,
  PaymentClientOption,
  PaymentEditFormValues,
  PaymentFormValues,
  PaymentMembershipOption,
  PaymentRecord,
} from "@/modules/payments/types";

function mapPayment(
  record: PaymentRecord,
  clientName: string,
  membershipLabel: string | null,
): Payment {
  return {
    id: record.id,
    clientId: record.client_id,
    clientName,
    clientMembershipId: record.client_membership_id,
    membershipLabel,
    amount: Number(record.amount),
    paymentMethod: record.payment_method,
    paymentDate: record.payment_date,
    concept: record.concept,
    notes: record.notes,
    createdAt: record.created_at,
  };
}

function formatMembershipStatusLabel(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function getClientMap(supabase: AppSupabaseClient, clientIds: string[], scope: GymScope) {
  if (clientIds.length === 0) {
    return new Map<string, string>();
  }

  let query = supabase
    .from("clients")
    .select("id, first_name, last_name")
    .in("id", clientIds);

  query = applyGymScope(query, scope);

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    (data ?? []).map((client) => [
      String(client.id),
      `${String(client.first_name)} ${String(client.last_name)}`,
    ]),
  );
}

async function getMembershipLabelMap(
  supabase: AppSupabaseClient,
  membershipIds: string[],
  scope: GymScope,
) {
  if (membershipIds.length === 0) {
    return new Map<
      string,
      {
        clientId: string;
        endDate: string;
        label: string;
        planName: string;
        planPrice: number;
        startDate: string;
        status: string;
        totalPaid: number;
        remainingBalance: number;
      }
    >();
  }

  let query = supabase
    .from("client_memberships")
    .select("id, client_id, start_date, end_date, membership_plan_id, status")
    .in("id", membershipIds);

  query = applyGymScope(query, scope);

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const memberships = data ?? [];
  const planIds = [...new Set(memberships.map((membership) => String(membership.membership_plan_id)))];
  let paymentTotals = new Map<string, number>();

  if (memberships.length > 0) {
    let paymentsQuery = supabase
      .from("payments")
      .select("client_membership_id, amount")
      .in("client_membership_id", memberships.map((membership) => String(membership.id)));

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

  let planNameMap = new Map<string, { name: string; price: number }>();

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

    planNameMap = new Map(
      (plans ?? []).map((plan) => [
        String(plan.id),
        {
          name: String(plan.name),
          price: Number(plan.price),
        },
      ]),
    );
  }

  return new Map(
    memberships.map((membership) => {
      const startDate = String(membership.start_date);
      const endDate = String(membership.end_date);
      const lifecycleStatus = getDisplayLifecycleStatus({
        status: membership.status,
        startDate,
        endDate,
      });
      const remainingBalance = Math.max(
        0,
        (planNameMap.get(String(membership.membership_plan_id))?.price ?? 0) -
          (paymentTotals.get(String(membership.id)) ?? 0),
      );

      return [
        String(membership.id),
        {
          clientId: String(membership.client_id),
          planName: planNameMap.get(String(membership.membership_plan_id))?.name ?? "Plan",
          startDate,
          endDate,
          status: lifecycleStatus,
          label:
            `${planNameMap.get(String(membership.membership_plan_id))?.name ?? "Plan"} · ` +
            `${startDate} to ${endDate} · ` +
            `$${remainingBalance.toFixed(2)} remaining · ${formatMembershipStatusLabel(lifecycleStatus)}`,
          planPrice: planNameMap.get(String(membership.membership_plan_id))?.price ?? 0,
          totalPaid: paymentTotals.get(String(membership.id)) ?? 0,
          remainingBalance,
        },
      ];
    }),
  );
}

export async function listPayments(
  supabase: AppSupabaseClient,
): Promise<{ data: Payment[]; error: string | null }> {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: [], error: scopeError };
  }

  let query = supabase
    .from("payments")
    .select("*")
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });

  query = applyGymScope(query, scope);

  const { data, error } = await query;

  if (error) {
    return {
      data: [],
      error: error.message,
    };
  }

  try {
    const records = (data ?? []) as PaymentRecord[];
    const clientMap = await getClientMap(
      supabase,
      [...new Set(records.map((record) => record.client_id))],
      scope,
    );
    const membershipMap = await getMembershipLabelMap(
      supabase,
      [...new Set(records.flatMap((record) => (record.client_membership_id ? [record.client_membership_id] : [])))],
      scope,
    );

    return {
      data: records.map((record) =>
        mapPayment(
          record,
          clientMap.get(record.client_id) ?? "Unknown client",
          record.client_membership_id
            ? membershipMap.get(record.client_membership_id)?.label ?? null
            : null,
        ),
      ),
      error: null,
    };
  } catch (mappingError) {
    return {
      data: [],
      error: mappingError instanceof Error ? mappingError.message : "Unable to load payments.",
    };
  }
}

export async function listPaymentsByClient(
  supabase: AppSupabaseClient,
  clientId: string,
): Promise<{ data: Payment[]; error: string | null }> {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: [], error: scopeError };
  }

  let query = supabase
    .from("payments")
    .select("*")
    .eq("client_id", clientId)
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });

  query = applyGymScope(query, scope);

  const { data, error } = await query;

  if (error) {
    return {
      data: [],
      error: error.message,
    };
  }

  try {
    const records = (data ?? []) as PaymentRecord[];
    const clientMap = await getClientMap(supabase, [clientId], scope);
    const membershipMap = await getMembershipLabelMap(
      supabase,
      [...new Set(records.flatMap((record) => (record.client_membership_id ? [record.client_membership_id] : [])))],
      scope,
    );

    return {
      data: records.map((record) =>
        mapPayment(
          record,
          clientMap.get(clientId) ?? "Unknown client",
          record.client_membership_id
            ? membershipMap.get(record.client_membership_id)?.label ?? null
            : null,
        ),
      ),
      error: null,
    };
  } catch (mappingError) {
    return {
      data: [],
      error: mappingError instanceof Error ? mappingError.message : "Unable to load payments.",
    };
  }
}

export async function listPaymentClientOptions(
  supabase: AppSupabaseClient,
): Promise<{ data: PaymentClientOption[]; error: string | null }> {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: [], error: scopeError };
  }

  let query = supabase
    .from("clients")
    .select("id, first_name, last_name")
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  query = applyGymScope(query, scope);

  const { data, error } = await query;

  if (error) {
    return {
      data: [],
      error: error.message,
    };
  }

  return {
    data: (data ?? []).map((client) => ({
      id: String(client.id),
      label: `${String(client.first_name)} ${String(client.last_name)}`,
    })),
    error: null,
  };
}

export async function listPaymentMembershipOptions(
  supabase: AppSupabaseClient,
): Promise<{ data: PaymentMembershipOption[]; error: string | null }> {
  try {
    const { data: scope, error: scopeError } = await requireGymScope(supabase);

    if (scopeError || !scope) {
      return { data: [], error: scopeError };
    }

    let query = supabase
      .from("client_memberships")
      .select("id")
      .order("start_date", { ascending: false });

    query = applyGymScope(query, scope);

    const { data: membershipRows, error: membershipsError } = await query;

    if (membershipsError) {
      return {
        data: [],
        error: membershipsError.message,
      };
    }

    const membershipMap = await getMembershipLabelMap(
      supabase,
      (membershipRows ?? []).map((membership) => String(membership.id)),
      scope,
    );
    const clientMap = await getClientMap(
      supabase,
      [...new Set(Array.from(membershipMap.values()).map((membership) => membership.clientId))],
      scope,
    );

    return {
      data: Array.from(membershipMap.entries())
        .filter(([, value]) => value.remainingBalance > 0)
        .map(([id, value]) => ({
          id,
          clientId: value.clientId,
          label: `${clientMap.get(value.clientId) ?? "Unknown client"} · ${value.label}`,
          planName: value.planName,
          startDate: value.startDate,
          endDate: value.endDate,
          status: formatMembershipStatusLabel(value.status),
          planPrice: value.planPrice,
          totalPaid: value.totalPaid,
          remainingBalance: value.remainingBalance,
        })),
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error.message : "Unable to load membership options.",
    };
  }
}

export async function createPaymentRecord(
  supabase: AppSupabaseClient,
  values: PaymentFormValues,
) {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: scopeError ?? "Unable to resolve gym scope." };
  }

  const membershipId = values.clientMembershipId || null;
  let membershipStatus: string | null = null;
  let membershipPlanId: string | null = null;
  let membershipPlanPrice = 0;
  let existingTotalPaid = 0;

  if (!membershipId) {
    return {
      data: null,
      error: "A membership must be selected before registering this payment.",
    };
  }

  if (membershipId) {
    let membershipQuery = supabase
      .from("client_memberships")
      .select("id, client_id, status, membership_plan_id")
      .eq("id", membershipId);

    membershipQuery = applyGymScope(membershipQuery, scope);

    const { data: membership, error: membershipError } = await membershipQuery.maybeSingle();

    if (membershipError) {
      return {
        data: null,
        error: membershipError.message,
      };
    }

    if (!membership || String(membership.client_id) !== values.clientId) {
      return {
        data: null,
        error: "Selected membership does not belong to the selected client.",
      };
    }

    membershipStatus = String(membership.status);
    membershipPlanId = String(membership.membership_plan_id);

    let planQuery = supabase
      .from("membership_plans")
      .select("id, price")
      .eq("id", membershipPlanId);

    planQuery = applyGymScope(planQuery, scope);

    const { data: plan, error: planError } = await planQuery.maybeSingle();

    if (planError) {
      return {
        data: null,
        error: planError.message,
      };
    }

    membershipPlanPrice = plan ? Number(plan.price) : 0;

    let paymentsQuery = supabase
      .from("payments")
      .select("amount")
      .eq("client_membership_id", membershipId);

    paymentsQuery = applyGymScope(paymentsQuery, scope);

    const { data: previousPayments, error: previousPaymentsError } = await paymentsQuery;

    if (previousPaymentsError) {
      return {
        data: null,
        error: previousPaymentsError.message,
      };
    }

    existingTotalPaid = (previousPayments ?? []).reduce(
      (total, payment) => total + Number(payment.amount),
      0,
    );

    const remainingBalance = Math.max(0, membershipPlanPrice - existingTotalPaid);

    if (remainingBalance <= 0) {
      return {
        data: null,
        error: "This membership is already fully paid. No more linked payments can be registered.",
      };
    }

    if (values.amount > remainingBalance) {
      return {
        data: null,
        error: `Payment amount exceeds the remaining balance for this membership. Remaining balance: $${remainingBalance.toFixed(2)}.`,
      };
    }
  }

  const paymentInsert = await supabase
    .from("payments")
    .insert(withGymId({
      client_id: values.clientId,
      client_membership_id: membershipId,
      amount: values.amount,
      payment_method: values.paymentMethod,
      payment_date: values.paymentDate,
      concept: values.concept.trim(),
      notes: values.notes.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, scope))
    .select("id")
    .single();

  if (paymentInsert.error || !paymentInsert.data) {
    return paymentInsert;
  }

  if (membershipStatus !== "cancelled") {
    const nextStatus = existingTotalPaid + values.amount >= membershipPlanPrice
      ? "active"
      : "partial";

    let membershipUpdateQuery = supabase
      .from("client_memberships")
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", membershipId);

    membershipUpdateQuery = applyGymScope(membershipUpdateQuery, scope);

    const membershipUpdate = await membershipUpdateQuery.select("id").single();

    if (membershipUpdate.error) {
      return {
        data: paymentInsert.data,
        error: membershipUpdate.error.message,
      };
    }
  }

  return paymentInsert;
}

export type RegisterMembershipPaymentInput = {
  clientId: string;
  clientMembershipId: string;
  amount: number;
  paymentMethod: string;
  idempotencyKey: string;
};

/**
 * Idempotent payment registration for the operational memberships
 * dashboard's "Registrar pago" action, via the register_membership_payment
 * RPC (supabase/migrations/20260729120000_register_membership_payment_idempotency.sql).
 * Reuses the existing payments.idempotency_key unique constraint - same
 * fast-path/atomic-insert/unique_violation-race pattern already proven by
 * assign_membership_with_payment.
 *
 * Deliberately separate from createPaymentRecord above, which the general
 * standalone payment form (create-payment.ts) still uses unchanged - this
 * function only backs the membership-operations modal's payment flow.
 */
export async function registerMembershipPaymentRecord(
  supabase: AppSupabaseClient,
  values: RegisterMembershipPaymentInput,
): Promise<{ error: string | null }> {
  const { error: scopeError } = await requireGymScope(supabase);

  if (scopeError) {
    return { error: scopeError };
  }

  const { error } = await supabase.rpc("register_membership_payment", {
    p_client_id: values.clientId,
    p_client_membership_id: values.clientMembershipId,
    p_amount: values.amount,
    p_payment_method: values.paymentMethod,
    p_idempotency_key: values.idempotencyKey,
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function getPaymentById(
  supabase: AppSupabaseClient,
  paymentId: string,
): Promise<{ data: Payment | null; error: string | null }> {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: scopeError };
  }

  let query = supabase
    .from("payments")
    .select("*")
    .eq("id", paymentId);

  query = applyGymScope(query, scope);

  const { data, error } = await query.maybeSingle();

  if (error) {
    return {
      data: null,
      error: error.message,
    };
  }

  if (!data) {
    return {
      data: null,
      error: null,
    };
  }

  try {
    const record = data as PaymentRecord;
    const clientMap = await getClientMap(supabase, [record.client_id], scope);
    const membershipMap = await getMembershipLabelMap(
      supabase,
      record.client_membership_id ? [record.client_membership_id] : [],
      scope,
    );

    return {
      data: mapPayment(
        record,
        clientMap.get(record.client_id) ?? "Unknown client",
        record.client_membership_id
          ? membershipMap.get(record.client_membership_id)?.label ?? null
          : null,
      ),
      error: null,
    };
  } catch (mappingError) {
    return {
      data: null,
      error: mappingError instanceof Error ? mappingError.message : "Unable to load payment.",
    };
  }
}

export async function updatePaymentRecord(
  supabase: AppSupabaseClient,
  paymentId: string,
  values: PaymentEditFormValues,
) {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: null, error: { message: scopeError ?? "Unable to resolve gym scope." } };
  }

  let query = supabase
    .from("payments")
    .update({
      concept: values.concept.trim(),
      notes: values.notes.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId);

  query = applyGymScope(query, scope);

  return query.select("id, client_id").single();
}

export const getPaymentsForPage = cache(async () => {
  const supabase = await createClient();
  return listPayments(supabase);
});

export const getPaymentForPage = cache(async (paymentId: string) => {
  const supabase = await createClient();
  return getPaymentById(supabase, paymentId);
});

export const getClientPaymentsForPage = cache(async (clientId: string) => {
  const supabase = await createClient();
  return listPaymentsByClient(supabase, clientId);
});

export const getPaymentFormOptionsForPage = cache(async () => {
  const supabase = await createClient();
  const [{ data: clients, error: clientsError }, { data: memberships, error: membershipsError }] =
    await Promise.all([
      listPaymentClientOptions(supabase),
      listPaymentMembershipOptions(supabase),
    ]);

  return {
    clients,
    memberships,
    error: clientsError ?? membershipsError,
  };
});
