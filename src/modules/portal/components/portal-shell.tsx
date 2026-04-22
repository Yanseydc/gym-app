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
        padding: "24px 0 64px",
        background:
          "radial-gradient(circle at top left, rgba(209, 108, 67, 0.08), transparent 28%), linear-gradient(180deg, rgba(21, 26, 22, 0.24), rgba(18, 22, 19, 0))",
      }}
    >
      <div className="portal-shell-grid">
        <details className="portal-mobile-nav">
          <summary className="portal-mobile-nav-toggle">
            <div style={{ display: "grid", gap: 4 }}>
              <strong>GymOS</strong>
              <span style={{ color: "var(--muted)", fontSize: 13 }}>{t.shell.brandSubtitle}</span>
            </div>
            <span style={{ color: "var(--accent-strong)", fontWeight: 700 }}>Menu</span>
          </summary>

          <div className="portal-mobile-nav-panel">
            <div
              style={{
                display: "grid",
                gap: 8,
                padding: 16,
                borderRadius: 18,
                background:
                  "linear-gradient(180deg, rgba(34, 42, 36, 0.98), rgba(24, 30, 26, 0.96))",
                border: "1px solid var(--border)",
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

            <nav style={{ display: "grid", gap: 10 }}>
              {navigation.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      padding: "13px 14px",
                      borderRadius: 14,
                      background: isActive
                        ? "linear-gradient(180deg, var(--accent), color-mix(in srgb, var(--accent) 74%, black 26%))"
                        : "linear-gradient(180deg, var(--surface-alt), rgba(30, 36, 31, 0.94))",
                      border: isActive
                        ? "1px solid color-mix(in srgb, var(--accent) 70%, black 30%)"
                        : "1px solid var(--border)",
                      fontWeight: isActive ? 700 : 600,
                      color: isActive ? "#121513" : "inherit",
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <SignOutButton />
          </div>
        </details>

        <aside
          className="portal-sidebar"
          style={{
            position: "sticky",
            top: 24,
            padding: 24,
            borderRadius: 28,
            background: "linear-gradient(180deg, rgba(28, 33, 29, 0.98), rgba(21, 26, 22, 0.96))",
            border: "1px solid var(--border)",
            boxShadow: "0 18px 42px rgba(0, 0, 0, 0.18)",
          }}
        >
          <div
            style={{
              marginBottom: 22,
              paddingBottom: 18,
              borderBottom: "1px solid var(--border)",
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
              background:
                "linear-gradient(180deg, rgba(34, 42, 36, 0.98), rgba(24, 30, 26, 0.96))",
              border: "1px solid var(--border)",
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
                      ? "linear-gradient(180deg, var(--accent), color-mix(in srgb, var(--accent) 74%, black 26%))"
                      : isHovered
                        ? "linear-gradient(180deg, rgba(41, 49, 43, 0.98), rgba(31, 38, 33, 0.96))"
                        : "linear-gradient(180deg, var(--surface-alt), rgba(30, 36, 31, 0.94))",
                    border: isActive
                      ? "1px solid color-mix(in srgb, var(--accent) 70%, black 30%)"
                      : "1px solid var(--border)",
                    fontWeight: isActive ? 700 : 600,
                    color: isActive ? "#121513" : "inherit",
                    boxShadow: isActive
                      ? "0 12px 24px rgba(0, 0, 0, 0.2)"
                      : isHovered
                        ? "0 6px 18px rgba(0, 0, 0, 0.14)"
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
          className="portal-content"
          style={{
            boxShadow: "0 18px 42px rgba(0, 0, 0, 0.18)",
          }}
        >
          {children}
        </section>
      </div>
    </main>
  );
}
