import type { Database } from "@/types/database";

export type CheckInRecord = Database["public"]["Tables"]["check_ins"]["Row"];

export type ClientMembershipAccessStatus =
  | "active"
  | "expired"
  | "cancelled"
  | "pending_payment"
  | "partial"
  | "none";

export type CheckInClientResult = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  status: "active" | "inactive";
  membershipStatus: ClientMembershipAccessStatus;
  membershipLabel: string;
  activeMembershipId: string | null;
};

export type ClientCheckIn = {
  id: string;
  clientId: string;
  clientName: string;
  checkedInAt: string;
  notes: string | null;
};

export type CheckInFormValues = {
  notes: string;
};

export type CheckInMutationState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof CheckInFormValues, string>>;
};
