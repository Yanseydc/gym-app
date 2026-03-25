import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { AppSupabaseClient } from "@/types/supabase";
import type {
  Payment,
  PaymentClientOption,
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

async function getClientMap(supabase: AppSupabaseClient, clientIds: string[]) {
  if (clientIds.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase
    .from("clients")
    .select("id, first_name, last_name")
    .in("id", clientIds);

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
) {
  if (membershipIds.length === 0) {
    return new Map<string, { clientId: string; label: string }>();
  }

  const { data, error } = await supabase
    .from("client_memberships")
    .select("id, client_id, start_date, end_date, membership_plan_id, status")
    .in("id", membershipIds);

  if (error) {
    throw new Error(error.message);
  }

  const memberships = data ?? [];
  const planIds = [...new Set(memberships.map((membership) => String(membership.membership_plan_id)))];

  let planNameMap = new Map<string, string>();

  if (planIds.length > 0) {
    const { data: plans, error: plansError } = await supabase
      .from("membership_plans")
      .select("id, name")
      .in("id", planIds);

    if (plansError) {
      throw new Error(plansError.message);
    }

    planNameMap = new Map((plans ?? []).map((plan) => [String(plan.id), String(plan.name)]));
  }

  return new Map(
    memberships.map((membership) => [
      String(membership.id),
      {
        clientId: String(membership.client_id),
        label: `${planNameMap.get(String(membership.membership_plan_id)) ?? "Plan"} · ${
          String(membership.start_date)
        } to ${String(membership.end_date)} · ${String(membership.status)}`,
      },
    ]),
  );
}

export async function listPayments(
  supabase: AppSupabaseClient,
): Promise<{ data: Payment[]; error: string | null }> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });

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
    );
    const membershipMap = await getMembershipLabelMap(
      supabase,
      [...new Set(records.flatMap((record) => (record.client_membership_id ? [record.client_membership_id] : [])))],
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
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("client_id", clientId)
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return {
      data: [],
      error: error.message,
    };
  }

  try {
    const records = (data ?? []) as PaymentRecord[];
    const clientMap = await getClientMap(supabase, [clientId]);
    const membershipMap = await getMembershipLabelMap(
      supabase,
      [...new Set(records.flatMap((record) => (record.client_membership_id ? [record.client_membership_id] : [])))],
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
  const { data, error } = await supabase
    .from("clients")
    .select("id, first_name, last_name")
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

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
    const { data: membershipRows, error: membershipsError } = await supabase
      .from("client_memberships")
      .select("id")
      .neq("status", "cancelled");

    if (membershipsError) {
      return {
        data: [],
        error: membershipsError.message,
      };
    }

    const membershipMap = await getMembershipLabelMap(
      supabase,
      (membershipRows ?? []).map((membership) => String(membership.id)),
    );
    const clientMap = await getClientMap(
      supabase,
      [...new Set(Array.from(membershipMap.values()).map((membership) => membership.clientId))],
    );

    return {
      data: Array.from(membershipMap.entries()).map(([id, value]) => ({
        id,
        clientId: value.clientId,
        label: `${clientMap.get(value.clientId) ?? "Unknown client"} · ${value.label}`,
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
  const membershipId = values.clientMembershipId || null;
  let membershipStatus: string | null = null;
  let membershipPlanId: string | null = null;
  let membershipPlanPrice = 0;
  let existingTotalPaid = 0;

  if (membershipId) {
    const { data: membership, error: membershipError } = await supabase
      .from("client_memberships")
      .select("id, client_id, status, membership_plan_id")
      .eq("id", membershipId)
      .maybeSingle();

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

    const { data: plan, error: planError } = await supabase
      .from("membership_plans")
      .select("id, price")
      .eq("id", membershipPlanId)
      .maybeSingle();

    if (planError) {
      return {
        data: null,
        error: planError.message,
      };
    }

    membershipPlanPrice = plan ? Number(plan.price) : 0;

    const { data: previousPayments, error: previousPaymentsError } = await supabase
      .from("payments")
      .select("amount")
      .eq("client_membership_id", membershipId);

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
  }

  const paymentInsert = await supabase
    .from("payments")
    .insert({
      client_id: values.clientId,
      client_membership_id: membershipId,
      amount: values.amount,
      payment_method: values.paymentMethod,
      payment_date: values.paymentDate,
      concept: values.concept.trim(),
      notes: values.notes.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (paymentInsert.error || !paymentInsert.data) {
    return paymentInsert;
  }

  if (
    membershipId &&
    membershipStatus !== "cancelled"
  ) {
    const nextStatus = existingTotalPaid + values.amount >= membershipPlanPrice
      ? "active"
      : "partial";

    const membershipUpdate = await supabase
      .from("client_memberships")
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", membershipId)
      .select("id")
      .single();

    if (membershipUpdate.error) {
      return {
        data: paymentInsert.data,
        error: membershipUpdate.error.message,
      };
    }
  }

  return paymentInsert;
}

export const getPaymentsForPage = cache(async () => {
  const supabase = await createClient();
  return listPayments(supabase);
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
