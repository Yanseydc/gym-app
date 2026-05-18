import Link from "next/link";
import { Pencil } from "lucide-react";

import { getAdminText } from "@/lib/i18n/admin";
import { buttonSecondary, card, cardSubtle, sectionEyebrow } from "@/lib/ui";
import type { Client } from "@/modules/clients/types";
import { ClientStatusBadge } from "@/modules/clients/components/client-status-badge";

export async function ClientDetailCard({ client }: { client: Client }) {
  const { t, locale } = await getAdminText();

  return (
    <article
      className={card}
      style={{
        display: "grid",
        gap: 22,
        padding: 20,
        borderRadius: 28,
      }}
    >
      <div className="responsive-inline-header">
        <div>
          <span
            className={sectionEyebrow}
            style={{
              display: "inline-block",
              marginBottom: 10,
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
          style={{ boxShadow: "0 10px 24px rgba(0, 0, 0, 0.14)" }}
        >
          <Pencil size={15} aria-hidden="true" />
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
    <div style={{ display: "grid", gap: 12 }}>
      <div className="responsive-meta-grid">
        <DetailItem label={labels.phone} value={client.phone} />
        <DetailItem label={labels.email} value={emailValue} />
        <DetailItem label={labels.notes} value={notesValue} fullWidth />
      </div>

      <div
        className={cardSubtle}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px 18px",
          padding: "10px 12px",
          borderRadius: 14,
          color: "var(--muted)",
          fontSize: 12,
          lineHeight: 1.45,
        }}
      >
        <span>{labels.created}: {new Date(client.createdAt).toLocaleString(locale)}</span>
        <span>{labels.updated}: {new Date(client.updatedAt).toLocaleString(locale)}</span>
      </div>
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
      className={cardSubtle}
      style={{
        padding: 16,
        borderRadius: 18,
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
      <strong style={{ whiteSpace: "pre-wrap", lineHeight: 1.5, overflowWrap: "anywhere" }}>{value}</strong>
    </div>
  );
}
