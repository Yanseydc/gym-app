"use server";

import { revalidatePath } from "next/cache";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import {
  cancelClientMembershipRecord,
  extendClientMembershipRecord,
  renewClientMembershipRecord,
} from "@/modules/memberships/services/membership-service";
import type { MembershipOperationMutationState } from "@/modules/memberships/types";
import { createPaymentRecord } from "@/modules/payments/services/payment-service";

function refreshMemberships() {
  revalidatePath("/dashboard/memberships");
}

export async function registerMembershipPayment(
  _prevState: MembershipOperationMutationState,
  formData: FormData,
): Promise<MembershipOperationMutationState> {
  const amount = Number(formData.get("amount"));
  const clientId = String(formData.get("clientId") ?? "");
  const clientMembershipId = String(formData.get("clientMembershipId") ?? "");

  if (!clientId || !clientMembershipId || !Number.isFinite(amount) || amount <= 0) {
    return { error: "Ingresa un monto válido." };
  }

  const supabase = await createSupabaseClient();
  const { error } = await createPaymentRecord(supabase, {
    clientId,
    clientMembershipId,
    amount,
    paymentMethod: "cash",
    paymentDate: new Date().toISOString().slice(0, 10),
    concept: "Pago de membresía",
    notes: "",
  });

  if (error) {
    return { error: typeof error === "string" ? error : error.message };
  }

  refreshMemberships();
  return { success: "Pago registrado correctamente." };
}

export async function renewMembership(
  _prevState: MembershipOperationMutationState,
  formData: FormData,
): Promise<MembershipOperationMutationState> {
  const membershipId = String(formData.get("membershipId") ?? "");

  if (!membershipId) {
    return { error: "Selecciona una membresía." };
  }

  const supabase = await createSupabaseClient();
  const { error } = await renewClientMembershipRecord(supabase, membershipId);

  if (error) {
    return { error: typeof error === "string" ? error : error.message };
  }

  refreshMemberships();
  return { success: "Membresía renovada correctamente." };
}

export async function extendMembership(
  _prevState: MembershipOperationMutationState,
  formData: FormData,
): Promise<MembershipOperationMutationState> {
  const membershipId = String(formData.get("membershipId") ?? "");
  const days = Number(formData.get("days"));

  if (!membershipId || !Number.isFinite(days) || days <= 0) {
    return { error: "Ingresa una cantidad válida de días." };
  }

  const supabase = await createSupabaseClient();
  const { error } = await extendClientMembershipRecord(supabase, membershipId, days);

  if (error) {
    return { error: typeof error === "string" ? error : error.message };
  }

  refreshMemberships();
  return { success: "Membresía extendida correctamente." };
}

export async function cancelMembershipFromDashboard(
  _prevState: MembershipOperationMutationState,
  formData: FormData,
): Promise<MembershipOperationMutationState> {
  const membershipId = String(formData.get("membershipId") ?? "");

  if (!membershipId) {
    return { error: "Selecciona una membresía." };
  }

  const supabase = await createSupabaseClient();
  const { error } = await cancelClientMembershipRecord(supabase, membershipId);

  if (error) {
    return { error: error.message };
  }

  refreshMemberships();
  return { success: "Membresía cancelada correctamente." };
}
