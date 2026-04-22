import type { AppModule } from "@/lib/auth/permissions";

export type NavigationItem = {
  href: string;
  labelKey: string;
  module: AppModule;
};

export const appNavigation: NavigationItem[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", module: "dashboard" },
  { href: "/dashboard/clients", labelKey: "nav.clients", module: "clients" },
  { href: "/dashboard/coaching/exercises", labelKey: "nav.coaching", module: "coaching" },
  { href: "/dashboard/memberships", labelKey: "nav.memberships", module: "memberships" },
  { href: "/dashboard/classes", labelKey: "nav.classes", module: "classes" },
  { href: "/dashboard/checkins", labelKey: "nav.checkins", module: "checkins" },
  { href: "/dashboard/payments", labelKey: "nav.payments", module: "payments" },
];
