import type { AppModule } from "@/lib/auth/permissions";

export type NavigationItem = {
  href: string;
  label: string;
  module: AppModule;
};

export const appNavigation: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", module: "dashboard" },
  { href: "/dashboard/clients", label: "Clients", module: "clients" },
  { href: "/dashboard/coaching/exercises", label: "Coaching", module: "coaching" },
  { href: "/dashboard/memberships", label: "Memberships", module: "memberships" },
  { href: "/dashboard/classes", label: "Classes", module: "classes" },
  { href: "/dashboard/checkins", label: "Check-ins", module: "checkins" },
  { href: "/dashboard/payments", label: "Payments", module: "payments" },
];
