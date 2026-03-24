import type { AppModule } from "@/lib/auth/permissions";

export type NavigationItem = {
  href: string;
  label: string;
  module: AppModule;
};

export const appNavigation: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", module: "dashboard" },
  { href: "/dashboard/members", label: "Socios", module: "clients" },
  { href: "/dashboard/memberships", label: "Membresías", module: "memberships" },
  { href: "/dashboard/classes", label: "Clases", module: "classes" },
  { href: "/dashboard/payments", label: "Pagos", module: "payments" },
];
