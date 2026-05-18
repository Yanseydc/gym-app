import { notFound } from "next/navigation";

import { BackNavigation } from "@/components/navigation/back-navigation";
import { getAdminText } from "@/lib/i18n/admin";
import { PortalAccessForm } from "@/modules/coaching/components/portal-access-form";
import { createPortalAccess } from "@/modules/coaching/services/create-portal-access";
import { getPortalAccessForPage } from "@/modules/coaching/services/portal-access-service";
import { getClientForPage } from "@/modules/clients/services/client-service";

type NewPortalAccessPageProps = {
  params: Promise<{
    clientId: string;
  }>;
};

export default async function NewPortalAccessPage({ params }: NewPortalAccessPageProps) {
  const { t } = await getAdminText();
  const { clientId } = await params;
  const [{ data: client, error }, { data: portalAccess, error: portalAccessError }] =
    await Promise.all([
      getClientForPage(clientId),
      getPortalAccessForPage(clientId),
    ]);

  if (error || portalAccessError) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <BackNavigation href={`/dashboard/clients/${clientId}`} label={t("common.backToClient")} />
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: 12,
            background: "#fff2f2",
            color: "#8a1c1c",
          }}
        >
          {error ?? portalAccessError}
        </p>
      </div>
    );
  }

  if (!client) {
    notFound();
  }

  if (portalAccess) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <BackNavigation href={`/dashboard/clients/${clientId}`} label={t("common.backToClient")} />
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: 12,
            background: "#fff7e8",
            color: "#7a5a2f",
          }}
        >
          {t("clients.detail.portalAlreadyLinked")}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <BackNavigation
        href={`/dashboard/clients/${clientId}`}
        label={t("common.backToClient")}
        breadcrumbs={[
          { href: "/dashboard/clients", label: t("nav.clients") },
          { href: `/dashboard/clients/${clientId}`, label: `${client.firstName} ${client.lastName}` },
          { label: t("clients.detail.invitePortal") },
        ]}
      />

      <header>
        <h1 style={{ margin: "0 0 8px" }}>{t("clients.detail.invitePortal")}</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          {t("clients.detail.portalInviteDescription", {
            name: `${client.firstName} ${client.lastName}`,
          })}
        </p>
      </header>

      <section
        className="premium-panel feature-panel"
        style={{
          padding: 24,
          borderRadius: 24,
        }}
      >
        <PortalAccessForm
          action={createPortalAccess.bind(null, clientId)}
          defaultEmail={client.email}
        />
      </section>
    </div>
  );
}
