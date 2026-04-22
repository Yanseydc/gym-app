"use client";

import Link from "next/link";

import { appNavigation } from "@/config/navigation";
import { hasModuleAccess } from "@/lib/auth/permissions";
import { AdminLanguageSwitcher } from "@/modules/dashboard/components/admin-language-switcher";
import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";
import { AuthUserCard } from "@/modules/auth/components/auth-user-card";
import { SignOutButton } from "@/modules/auth/components/sign-out-button";
import type { AuthUser } from "@/modules/auth/types";

type DashboardShellProps = Readonly<{
  children: React.ReactNode;
  user: AuthUser;
}>;

export function DashboardShell({ children, user }: DashboardShellProps) {
  const { t } = useAdminText();
  const visibleNavigation = appNavigation.filter((item) =>
    hasModuleAccess(user.role, item.module),
  );

  return (
    <main style={{ padding: "40px 0 64px" }}>
      <div className="dashboard-shell-grid">
        <details className="dashboard-mobile-nav">
          <summary className="dashboard-mobile-nav-toggle">
            <div style={{ display: "grid", gap: 4 }}>
              <strong>GymOS</strong>
              <span style={{ color: "var(--muted)", fontSize: 13 }}>{t("dashboardShell.brandSubtitle")}</span>
            </div>
            <span style={{ color: "var(--accent-strong)", fontWeight: 700 }}>{t("common.menu")}</span>
          </summary>

          <div className="dashboard-mobile-nav-panel">
            <AuthUserCard user={user} roleLabel={t(`common.role.${user.role}`)} />

            <nav className="dashboard-sidebar-nav">
              {visibleNavigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 14,
                    background: "var(--surface-alt)",
                    border: "1px solid transparent",
                    fontWeight: 600,
                  }}
                >
                  {t(item.labelKey)}
                </Link>
              ))}
            </nav>

            <AdminLanguageSwitcher />
            <SignOutButton label={t("common.signOut")} />
          </div>
        </details>

        <aside
          className="dashboard-sidebar"
          style={{
            position: "sticky",
            top: 24,
            padding: 24,
            borderRadius: 24,
            background: "linear-gradient(180deg, rgba(28, 33, 29, 0.98), rgba(21, 26, 22, 0.96))",
            border: "1px solid var(--border)",
            boxShadow: "0 16px 34px rgba(0, 0, 0, 0.18)",
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <strong style={{ display: "block", marginBottom: 4 }}>GymOS</strong>
            <span style={{ color: "var(--muted)" }}>{t("dashboardShell.brandSubtitle")}</span>
          </div>

          <AuthUserCard user={user} roleLabel={t(`common.role.${user.role}`)} />

          <nav className="dashboard-sidebar-nav">
            {visibleNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  background: "var(--surface-alt)",
                  border: "1px solid transparent",
                  fontWeight: 600,
                }}
              >
                  {t(item.labelKey)}
                </Link>
            ))}
          </nav>

          <div style={{ marginTop: 20 }}>
            <AdminLanguageSwitcher />
          </div>

          <div style={{ marginTop: 16 }}>
            <SignOutButton label={t("common.signOut")} />
          </div>
        </aside>

        <section className="dashboard-content">
          {children}
        </section>
      </div>
    </main>
  );
}
