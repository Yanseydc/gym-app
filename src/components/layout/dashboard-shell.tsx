import Link from "next/link";

import { appNavigation } from "@/config/navigation";

type DashboardShellProps = Readonly<{
  children: React.ReactNode;
  title: string;
  description?: string;
}>;

export function DashboardShell({
  children,
  title,
  description,
}: DashboardShellProps) {
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
        </aside>

        <section
          style={{
            padding: 24,
            borderRadius: 24,
            background: "rgba(255, 250, 243, 0.85)",
            border: "1px solid var(--border)",
          }}
        >
          <header style={{ marginBottom: 24 }}>
            <h1 style={{ margin: "0 0 8px" }}>{title}</h1>
            {description ? (
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                {description}
              </p>
            ) : null}
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}
