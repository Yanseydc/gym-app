import Link from "next/link";

import type { RecentDashboardClient } from "@/modules/dashboard/types";

type RecentClientsPanelProps = {
  clients: RecentDashboardClient[];
};

export function RecentClientsPanel({ clients }: RecentClientsPanelProps) {
  return (
    <section
      style={{
        display: "grid",
        gap: 16,
        padding: 24,
        borderRadius: 24,
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <div>
        <h2 style={{ margin: "0 0 8px" }}>Recent clients</h2>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Most recently created client records.
        </p>
      </div>

      {clients.length === 0 ? (
        <EmptyState message="No clients registered yet." />
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {clients.map((client) => (
            <article
              key={client.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
                padding: 16,
                borderRadius: 16,
                background: "rgba(239, 229, 212, 0.45)",
              }}
            >
              <div>
                <strong style={{ display: "block", marginBottom: 4 }}>
                  <Link href={`/dashboard/clients/${client.id}`}>{client.fullName}</Link>
                </strong>
                <span style={{ color: "var(--muted)" }}>
                  Added {new Date(client.createdAt).toLocaleDateString()}
                </span>
              </div>
              <span
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: client.status === "active" ? "#dff4e8" : "#efe3d3",
                  color: client.status === "active" ? "#1f6b42" : "#7a5a2f",
                  fontSize: 13,
                  fontWeight: 700,
                  textTransform: "capitalize",
                }}
              >
                {client.status}
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        border: "1px dashed var(--border)",
        color: "var(--muted)",
      }}
    >
      {message}
    </div>
  );
}
