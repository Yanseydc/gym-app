export const roles = ["super_admin", "admin", "staff", "coach", "client"] as const;

export type Role = (typeof roles)[number];
