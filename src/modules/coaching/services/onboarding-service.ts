import { cache } from "react";

import { applyGymScope, requireGymScope } from "@/lib/auth/gym-scope";
import { createClient } from "@/lib/supabase/server";
import type { AppSupabaseClient } from "@/types/supabase";
import type {
  ClientOnboarding,
  ClientOnboardingFormValues,
  ClientOnboardingRecord,
} from "@/modules/coaching/types";

function mapOnboarding(record: ClientOnboardingRecord): ClientOnboarding {
  return {
    id: record.id,
    clientId: record.client_id,
    weightKg: Number(record.weight_kg),
    heightCm: record.height_cm,
    goal: record.goal,
    availableDays: record.available_days,
    availableSchedule: record.available_schedule,
    injuriesNotes: record.injuries_notes,
    experienceLevel: record.experience_level,
    notes: record.notes,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function normalizeOnboardingPayload(values: ClientOnboardingFormValues) {
  return {
    weight_kg: values.weightKg,
    height_cm: values.heightCm,
    goal: values.goal.trim(),
    available_days: values.availableDays,
    available_schedule: values.availableSchedule.trim(),
    injuries_notes: values.injuriesNotes.trim() || null,
    experience_level: values.experienceLevel,
    notes: values.notes.trim() || null,
    updated_at: new Date().toISOString(),
  };
}

async function canAccessClient(supabase: AppSupabaseClient, clientId: string) {
  const { data: scope, error: scopeError } = await requireGymScope(supabase);

  if (scopeError || !scope) {
    return { data: false, error: scopeError ?? "Unable to resolve gym scope." };
  }

  let query = supabase.from("clients").select("id").eq("id", clientId);
  query = applyGymScope(query, scope);

  const { data, error } = await query.maybeSingle();

  if (error) {
    return { data: false, error: error.message };
  }

  return { data: Boolean(data), error: null };
}

export async function getOnboardingByClientId(
  supabase: AppSupabaseClient,
  clientId: string,
): Promise<{ data: ClientOnboarding | null; error: string | null }> {
  const access = await canAccessClient(supabase, clientId);

  if (access.error || !access.data) {
    return { data: null, error: access.error };
  }

  const { data, error } = await supabase
    .from("client_onboarding_responses")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error: error.message,
    };
  }

  return {
    data: data ? mapOnboarding(data as ClientOnboardingRecord) : null,
    error: null,
  };
}

export async function createOnboardingRecord(
  supabase: AppSupabaseClient,
  clientId: string,
  values: ClientOnboardingFormValues,
) {
  const access = await canAccessClient(supabase, clientId);

  if (access.error || !access.data) {
    return { data: null, error: { message: access.error ?? "Selected client is not available." } };
  }

  return supabase
    .from("client_onboarding_responses")
    .insert({
      client_id: clientId,
      ...normalizeOnboardingPayload(values),
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();
}

export async function updateOnboardingRecord(
  supabase: AppSupabaseClient,
  clientId: string,
  values: ClientOnboardingFormValues,
) {
  const access = await canAccessClient(supabase, clientId);

  if (access.error || !access.data) {
    return { data: null, error: { message: access.error ?? "Selected client is not available." } };
  }

  return supabase
    .from("client_onboarding_responses")
    .update(normalizeOnboardingPayload(values))
    .eq("client_id", clientId)
    .select("id")
    .single();
}

export const getOnboardingForPage = cache(async (clientId: string) => {
  const supabase = await createClient();
  return getOnboardingByClientId(supabase, clientId);
});
