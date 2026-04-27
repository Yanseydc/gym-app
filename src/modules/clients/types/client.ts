import type { Database } from "@/types/database";

export type ClientStatus = Database["public"]["Tables"]["clients"]["Row"]["status"];
export type ClientRecord = Database["public"]["Tables"]["clients"]["Row"];

export type Client = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  status: ClientStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClientFormValues = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  status: ClientStatus;
  notes: string;
};

export type ClientListFilters = {
  search: string;
};

export type ClientMergeCandidate = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  isEmailDuplicate: boolean;
  counts: {
    routines: number;
    payments: number;
    checkins: number;
  };
};

export type ClientMergeMutationState = {
  error?: string;
  success?: string;
};

export type ClientMutationState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof ClientFormValues, string>>;
};
