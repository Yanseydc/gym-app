import Link from "next/link";

import { getAdminText } from "@/lib/i18n/admin";
import { buttonSecondary } from "@/lib/ui";
import type { Client } from "@/modules/clients/types";
import { ClientStatusBadge } from "@/modules/clients/components/client-status-badge";

export async function ClientDetailCard({ client }: { client: Client }) {
  const { t, locale } = await getAdminText();

  return (
    <article
      style={{
        display: "grid",
        gap: 22,
        padding: 20,
        borderRadius: 28,
        border: "1px solid var(--border-strong)",
        background: "linear-gradient(180deg, rgba(36, 42, 37, 0.98), rgba(24, 29, 25, 0.95))",
        boxShadow: "0 20px 44px rgba(0, 0, 0, 0.22)",
      }}
    >
      <div className="responsive-inline-header">
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
            {t("clients.detail.hero")}
          </span>
          <h1 style={{ margin: "0 0 8px" }}>
            {client.firstName} {client.lastName}
          </h1>
          <ClientStatusBadge status={client.status} />
        </div>

        <Link
          href={`/dashboard/clients/${client.id}/edit`}
          className={buttonSecondary}
        >
          {t("clients.detail.editClient")}
        </Link>
      </div>

      <DetailGrid client={client} locale={locale} t={t} />
    </article>
  );
}

function DetailGrid({
  client,
  locale,
  t,
}: {
  client: Client;
  locale: string;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const labels = {
    phone: t("clients.form.phone"),
    email: t("clients.form.email"),
    created: t("clients.detail.created"),
    updated: t("clients.detail.updated"),
    notes: t("clients.detail.notes"),
  };
  const emailValue = client.email || t("common.notProvided");
  const notesValue = client.notes || t("common.noNotes");

  return (
    <div className="responsive-meta-grid">
      <DetailItem label={labels.phone} value={client.phone} />
      <DetailItem label={labels.email} value={emailValue} />
      <DetailItem label={labels.created} value={new Date(client.createdAt).toLocaleString(locale)} />
      <DetailItem label={labels.updated} value={new Date(client.updatedAt).toLocaleString(locale)} />
      <DetailItem label={labels.notes} value={notesValue} fullWidth />
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
