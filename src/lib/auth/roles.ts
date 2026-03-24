export const roles = ["admin", "staff", "coach", "member"] as const;

export type Role = (typeof roles)[number];

export const dashboardRoles: Role[] = ["admin", "staff", "coach"];
