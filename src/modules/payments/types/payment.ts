import type { Database } from "@/types/database";

export type PaymentRecord = Database["public"]["Tables"]["payments"]["Row"];
export type PaymentMethod = PaymentRecord["payment_method"];

export type Payment = {
  id: string;
  clientId: string;
  clientName: string;
  clientMembershipId: string | null;
  membershipLabel: string | null;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  concept: string;
  notes: string | null;
  createdAt: string;
};

export type PaymentFormValues = {
  clientId: string;
  clientMembershipId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  concept: string;
  notes: string;
};

export type PaymentClientOption = {
  id: string;
  label: string;
};

export type PaymentMembershipOption = {
  id: string;
  clientId: string;
  label: string;
  planPrice: number;
  totalPaid: number;
  remainingBalance: number;
};

export type PaymentMutationState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof PaymentFormValues, string>>;
};

export type PaymentEditFormValues = {
  concept: string;
  notes: string;
};

export type PaymentEditMutationState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof PaymentEditFormValues, string>>;
};
