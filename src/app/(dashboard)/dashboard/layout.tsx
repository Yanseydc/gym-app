import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getAdminDictionary, getAdminLocale } from "@/lib/i18n/admin";
import { getCurrentUser } from "@/modules/auth/services/auth-service";
import { AdminI18nProvider } from "@/modules/admin/components/admin-i18n-provider";

type DashboardLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const locale = await getAdminLocale();
  const dictionary = await getAdminDictionary(locale);

  return (
    <AdminI18nProvider locale={locale} dictionary={dictionary}>
      <DashboardShell user={user}>{children}</DashboardShell>
    </AdminI18nProvider>
  );
}
