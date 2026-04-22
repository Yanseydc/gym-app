import Link from "next/link";

import type { Client } from "@/modules/clients/types";
import { ClientStatusBadge } from "@/modules/clients/components/client-status-badge";

export function ClientDetailCard({ client }: { client: Client }) {
  return (
    <article
      style={{
        display: "grid",
        gap: 22,
        padding: 28,
        borderRadius: 28,
        border: "1px solid var(--border-strong)",
        background: "linear-gradient(180deg, rgba(36, 42, 37, 0.98), rgba(24, 29, 25, 0.95))",
        boxShadow: "0 20px 44px rgba(0, 0, 0, 0.22)",
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
          <span
            style={{
              display: "inline-block",
              marginBottom: 10,
              color: "var(--muted)",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Client overview
          </span>
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
            border: "1px solid var(--border)",
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
        gap: 14,
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
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
        borderRadius: 18,
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid var(--border)",
        gridColumn: fullWidth ? "1 / -1" : undefined,
      }}
    >
      <span
        style={{
          display: "block",
          marginBottom: 8,
          color: "var(--muted)",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <strong style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{value}</strong>
    </div>
  );
}
