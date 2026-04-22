"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { getPortalText } from "@/lib/i18n/portal";
import { SignOutButton } from "@/modules/auth/components/sign-out-button";
import type { AuthUser } from "@/modules/auth/types";
import type { LinkedPortalClient } from "@/modules/portal/types";

type PortalShellProps = Readonly<{
  children: React.ReactNode;
  client: LinkedPortalClient;
  user: AuthUser;
}>;

export function PortalShell({ children, client, user }: PortalShellProps) {
  const t = getPortalText();
  const pathname = usePathname();
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const navigation = [
    { href: "/app", label: t.shell.nav.home },
    { href: "/app/routine", label: t.shell.nav.routine },
    { href: "/app/progress", label: t.shell.nav.progress },
    { href: "/app/profile", label: t.shell.nav.profile },
  ] as const;

  return (
    <main
      style={{
        padding: "32px 0 64px",
        background:
          "radial-gradient(circle at top left, rgba(239, 229, 212, 0.45), transparent 30%), linear-gradient(180deg, rgba(255, 250, 243, 0.7), rgba(255, 255, 255, 0))",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(240px, 280px) minmax(0, 1fr)",
          gap: 28,
          alignItems: "start",
        }}
      >
        <aside
          style={{
            position: "sticky",
            top: 24,
            padding: 24,
            borderRadius: 28,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow)",
          }}
        >
          <div
            style={{
              marginBottom: 22,
              paddingBottom: 18,
              borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
            }}
          >
            <strong style={{ display: "block", marginBottom: 4, fontSize: 20 }}>GymOS</strong>
            <span style={{ color: "var(--muted)", fontWeight: 600 }}>{t.shell.brandSubtitle}</span>
          </div>

          <div
            style={{
              display: "grid",
              gap: 8,
              padding: 18,
              borderRadius: 20,
              background: "linear-gradient(180deg, rgba(239, 229, 212, 0.52), rgba(255, 250, 243, 0.9))",
              border: "1px solid rgba(0, 0, 0, 0.05)",
              marginBottom: 20,
            }}
          >
            <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              {t.shell.linkedAccount}
            </span>
            <strong>
              {client.firstName} {client.lastName}
            </strong>
            <span style={{ color: "var(--muted)" }}>{user.email}</span>
          </div>

          <nav style={{ display: "grid", gap: 12 }}>
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const isHovered = hoveredHref === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onMouseEnter={() => setHoveredHref(item.href)}
                  onMouseLeave={() =>
                    setHoveredHref((current) => (current === item.href ? null : current))
                  }
                  style={{
                    padding: "14px 15px",
                    borderRadius: 16,
                    background: isActive
                      ? "linear-gradient(180deg, var(--accent), color-mix(in srgb, var(--accent) 82%, black 18%))"
                      : isHovered
                        ? "linear-gradient(180deg, rgba(239, 229, 212, 0.92), rgba(255, 250, 243, 1))"
                        : "linear-gradient(180deg, var(--surface-alt), rgba(255, 250, 243, 0.9))",
                    border: isActive
                      ? "1px solid color-mix(in srgb, var(--accent) 70%, black 30%)"
                      : "1px solid rgba(0, 0, 0, 0.05)",
                    fontWeight: isActive ? 700 : 600,
                    color: isActive ? "#fff" : "inherit",
                    boxShadow: isActive
                      ? "0 10px 24px rgba(0, 0, 0, 0.14)"
                      : isHovered
                        ? "0 6px 18px rgba(0, 0, 0, 0.08)"
                        : "none",
                    transform: isHovered && !isActive ? "translateX(2px)" : "translateX(0)",
                    transition:
                      "background 160ms ease, box-shadow 160ms ease, transform 160ms ease, color 160ms ease, border-color 160ms ease",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div style={{ marginTop: 20 }}>
            <SignOutButton />
          </div>
        </aside>

        <section
          style={{
            padding: 28,
            borderRadius: 28,
            background: "linear-gradient(180deg, rgba(255, 250, 243, 0.96), rgba(255, 255, 255, 0.92))",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow)",
          }}
        >
          {children}
        </section>
      </div>
    </main>
  );
}
