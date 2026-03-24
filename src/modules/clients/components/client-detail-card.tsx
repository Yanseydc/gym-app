import Link from "next/link";

import type { Client } from "@/modules/clients/types";
import { ClientStatusBadge } from "@/modules/clients/components/client-status-badge";

export function ClientDetailCard({ client }: { client: Client }) {
  return (
    <article
      style={{
        display: "grid",
        gap: 20,
        padding: 24,
        borderRadius: 24,
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 8px" }}>
            {client.firstName} {client.lastName}
          </h1>
          <ClientStatusBadge status={client.status} />
        </div>

        <Link
          href={`/dashboard/clients/${client.id}/edit`}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            background: "var(--surface-alt)",
            fontWeight: 700,
          }}
        >
          Edit client
        </Link>
      </div>

      <DetailGrid client={client} />
    </article>
  );
}

function DetailGrid({ client }: { client: Client }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      }}
    >
      <DetailItem label="Phone" value={client.phone} />
      <DetailItem label="Email" value={client.email || "Not provided"} />
      <DetailItem label="Created" value={new Date(client.createdAt).toLocaleString()} />
      <DetailItem label="Updated" value={new Date(client.updatedAt).toLocaleString()} />
      <DetailItem label="Notes" value={client.notes || "No notes"} fullWidth />
    </div>
  );
}

function DetailItem({
  fullWidth = false,
  label,
  value,
}: {
  fullWidth?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        background: "rgba(239, 229, 212, 0.5)",
        gridColumn: fullWidth ? "1 / -1" : undefined,
      }}
    >
      <span style={{ display: "block", marginBottom: 6, color: "var(--muted)" }}>{label}</span>
      <strong style={{ whiteSpace: "pre-wrap" }}>{value}</strong>
    </div>
  );
}
