import Link from "next/link";

import { SignOutButton } from "@/modules/auth/components/sign-out-button";
import type { AuthUser } from "@/modules/auth/types";
import type { LinkedPortalClient } from "@/modules/portal/types";

type PortalShellProps = Readonly<{
  children: React.ReactNode;
  client: LinkedPortalClient;
  user: AuthUser;
}>;

const navigation = [
  { href: "/app", label: "Home" },
  { href: "/app/routine", label: "My Routine" },
  { href: "/app/progress", label: "My Progress" },
  { href: "/app/profile", label: "My Profile" },
] as const;

export function PortalShell({ children, client, user }: PortalShellProps) {
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
            <span style={{ color: "var(--muted)" }}>Client portal</span>
          </div>

          <div
            style={{
              display: "grid",
              gap: 6,
              padding: 16,
              borderRadius: 16,
              background: "rgba(239, 229, 212, 0.45)",
              marginBottom: 20,
            }}
          >
            <strong>
              {client.firstName} {client.lastName}
            </strong>
            <span style={{ color: "var(--muted)" }}>{user.email}</span>
          </div>

          <nav style={{ display: "grid", gap: 12 }}>
            {navigation.map((item) => (
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
