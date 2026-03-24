import Link from "next/link";

import { appNavigation } from "@/config/navigation";
import { AuthUserCard } from "@/modules/auth/components/auth-user-card";
import { SignOutButton } from "@/modules/auth/components/sign-out-button";
import type { AuthUser } from "@/modules/auth/types";

type DashboardShellProps = Readonly<{
  children: React.ReactNode;
  user: AuthUser;
}>;

export function DashboardShell({ children, user }: DashboardShellProps) {
  return (
    <main style={{ padding: "40px 0 64px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          gap: 24,
          alignItems: "start",
        }}
      >
        <aside
          style={{
            position: "sticky",
            top: 24,
            padding: 24,
            borderRadius: 24,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow)",
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <strong style={{ display: "block", marginBottom: 4 }}>GymOS</strong>
            <span style={{ color: "var(--muted)" }}>Operación central</span>
          </div>

          <AuthUserCard user={user} />

          <nav style={{ display: "grid", gap: 12 }}>
            {appNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  background: "var(--surface-alt)",
                  fontWeight: 600,
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div style={{ marginTop: 20 }}>
            <SignOutButton />
          </div>
        </aside>

        <section
          style={{
            padding: 24,
            borderRadius: 24,
            background: "rgba(255, 250, 243, 0.85)",
            border: "1px solid var(--border)",
          }}
        >
          {children}
        </section>
      </div>
    </main>
  );
}
