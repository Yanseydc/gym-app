import type { Database } from "@/types/database";

export type MembershipPlanRecord = Database["public"]["Tables"]["membership_plans"]["Row"];
export type ClientMembershipRecord = Database["public"]["Tables"]["client_memberships"]["Row"];

export type MembershipStatus = ClientMembershipRecord["status"];

export type MembershipPlan = {
  id: string;
  name: string;
  durationInDays: number;
  price: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MembershipPlanFormValues = {
  name: string;
  durationInDays: number;
  price: number;
  description: string;
  isActive: boolean;
};

export type ClientMembership = {
  id: string;
  clientId: string;
  membershipPlanId: string;
  planName: string;
  startDate: string;
  endDate: string;
  status: MembershipStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClientMembershipFormValues = {
  membershipPlanId: string;
  startDate: string;
  notes: string;
};

export type MembershipPlanMutationState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof MembershipPlanFormValues, string>>;
};

export type ClientMembershipMutationState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof ClientMembershipFormValues, string>>;
};
