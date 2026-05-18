import Link from "next/link";

import { getAdminText } from "@/lib/i18n/admin";
import { card, infoRow } from "@/lib/ui";
import { ClientStatusBadge } from "@/modules/clients/components/client-status-badge";
import type { RecentDashboardClient } from "@/modules/dashboard/types";

type RecentClientsPanelProps = {
  clients: RecentDashboardClient[];
};

export async function RecentClientsPanel({ clients }: RecentClientsPanelProps) {
  const { t, locale } = await getAdminText();

  return (
    <section
      className={card}
      style={{
        display: "grid",
        gap: 12,
        padding: 18,
        borderRadius: 18,
      }}
    >
      <div>
        <h2 style={{ margin: "0 0 5px", fontSize: 18 }}>{t("dashboard.recentClientsTitle")}</h2>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.45 }}>
          {t("dashboard.recentClientsDescription")}
        </p>
      </div>

      {clients.length === 0 ? (
        <EmptyState message={t("dashboard.recentClientsEmpty")} />
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {clients.map((client) => (
            <article
              key={client.id}
              className={infoRow}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
                padding: "11px 12px",
                borderRadius: 12,
              }}
            >
              <div>
                <strong style={{ display: "block", marginBottom: 3, fontSize: 15 }}>
                  <Link href={`/dashboard/clients/${client.id}`}>{client.fullName}</Link>
                </strong>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>
                  {t("dashboard.recentClientsAdded", {
                    date: new Date(client.createdAt).toLocaleDateString(locale),
                  })}
                </span>
              </div>
              <ClientStatusBadge status={client.status} />
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
      className={infoRow}
      style={{
        padding: 14,
        borderRadius: 12,
        color: "var(--muted)",
      }}
    >
      {message}
    </div>
  );
}
