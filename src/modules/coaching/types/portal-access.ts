export type PortalLinkedProfile = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: "admin" | "staff" | "coach" | "member";
};

export type ClientPortalAccess = {
  clientId: string;
  linkedAt: string;
  profile: PortalLinkedProfile;
};

export type PortalAccessFormValues = {
  email: string;
};

export type PortalAccessMutationState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof PortalAccessFormValues, string>>;
};
