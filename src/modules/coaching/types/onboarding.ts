import type { Database } from "@/types/database";

export type ClientOnboardingRecord =
  Database["public"]["Tables"]["client_onboarding_responses"]["Row"];

export type ClientOnboardingExperienceLevel = ClientOnboardingRecord["experience_level"];

export type ClientOnboarding = {
  id: string;
  clientId: string;
  weightKg: number;
  heightCm: number;
  goal: string;
  availableDays: number;
  availableSchedule: string;
  injuriesNotes: string | null;
  experienceLevel: ClientOnboardingExperienceLevel;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClientOnboardingFormValues = {
  weightKg: number;
  heightCm: number;
  goal: string;
  availableDays: number;
  availableSchedule: string;
  injuriesNotes: string;
  experienceLevel: ClientOnboardingExperienceLevel;
  notes: string;
};

export type ClientOnboardingMutationState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof ClientOnboardingFormValues, string>>;
};
