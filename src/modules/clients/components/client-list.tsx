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
    <div className="clients-list">
      {clients.map((client) => (
        <Link
          key={client.id}
          href={`/dashboard/clients/${client.id}`}
          className="clients-list-card"
        >
          <div className="responsive-inline-header">
            <strong style={{ fontSize: 18 }}>
              {client.firstName} {client.lastName}
            </strong>
            <ClientStatusBadge status={client.status} />
          </div>
          <div className="responsive-meta-grid" style={{ color: "var(--muted)" }}>
            <span>{client.phone}</span>
            <span>{client.email || "No email"}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
