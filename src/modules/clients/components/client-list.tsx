import Link from "next/link";

import type { Client } from "@/modules/clients/types";
import { ClientStatusBadge } from "@/modules/clients/components/client-status-badge";

type ClientListProps = {
  clients: Client[];
};

export function ClientList({ clients }: ClientListProps) {
  if (clients.length === 0) {
    return (
      <article
        style={{
          padding: 20,
          borderRadius: "var(--radius)",
          border: "1px dashed var(--border)",
          background: "var(--surface)",
          color: "var(--muted)",
        }}
      >
        No clients found.
      </article>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {clients.map((client) => (
        <Link
          key={client.id}
          href={`/dashboard/clients/${client.id}`}
          style={{
            display: "grid",
            gap: 8,
            padding: 18,
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <strong style={{ fontSize: 18 }}>
              {client.firstName} {client.lastName}
            </strong>
            <ClientStatusBadge status={client.status} />
          </div>
          <div style={{ color: "var(--muted)", display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span>{client.phone}</span>
            <span>{client.email || "No email"}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
