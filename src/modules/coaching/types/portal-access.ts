export type PortalLinkedProfile = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: "super_admin" | "admin" | "staff" | "coach" | "client";
};

export type ClientPortalAccess = {
  clientId: string;
  linkedAt: string;
  profile: PortalLinkedProfile;
  resend: {
    countDate: string | null;
    countToday: number;
    lastSentAt: string | null;
  };
};

export type PortalAccessFormValues = {
  email: string;
};

export type PortalAccessMutationState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof PortalAccessFormValues, string>>;
};

export type ResendPortalAccessMutationState = {
  error?: string;
  nextAllowedAt?: string;
  success?: string;
};
