import { notFound } from "next/navigation";

import { BackNavigation } from "@/components/navigation/back-navigation";
import { getAdminText } from "@/lib/i18n/admin";
import { ProgressCheckInForm } from "@/modules/coaching/components/progress-checkin-form";
import { createProgressCheckIn } from "@/modules/coaching/services/create-progress-checkin";
import { getClientForPage } from "@/modules/clients/services/client-service";

type NewProgressCheckInPageProps = {
  params: Promise<{
    clientId: string;
  }>;
};

export default async function NewProgressCheckInPage({ params }: NewProgressCheckInPageProps) {
  const { t } = await getAdminText();
  const { clientId } = await params;
  const { data: client, error } = await getClientForPage(clientId);

  if (error) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <BackNavigation href={`/dashboard/clients/${clientId}?tab=coaching`} label={t("common.backToCoaching")} />
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: 12,
            background: "#fff2f2",
            color: "#8a1c1c",
          }}
        >
          {error}
        </p>
      </div>
    );
  }

  if (!client) {
    notFound();
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <BackNavigation
        href={`/dashboard/clients/${clientId}?tab=coaching`}
        label={t("common.backToCoaching")}
        breadcrumbs={[
          { href: "/dashboard/coaching/exercises", label: t("nav.coaching") },
          { href: `/dashboard/clients/${clientId}?tab=coaching`, label: `${client.firstName} ${client.lastName}` },
          { label: t("coaching.progress.newCheckin") },
        ]}
      />

      <header
        className="premium-panel feature-panel"
        style={{
          display: "grid",
          gap: 10,
          padding: 20,
          borderRadius: 24,
        }}
      >
        <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          {t("nav.coaching")}
        </span>
        <h1 style={{ margin: 0 }}>{t("coaching.progress.newCheckin")}</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          {t("clients.detail.newProgressDescription", { name: `${client.firstName} ${client.lastName}` })}
        </p>
      </header>

      <section className="coaching-form-shell">
        <ProgressCheckInForm
          action={createProgressCheckIn.bind(null, clientId)}
          submitLabel={t("coaching.progress.saveCheckin")}
        />
      </section>
    </div>
  );
}
