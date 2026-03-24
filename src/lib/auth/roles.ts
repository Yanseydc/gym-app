export const roles = ["admin", "staff", "coach", "member"] as const;

export type Role = (typeof roles)[number];
