import Link from "next/link";
import { notFound } from "next/navigation";

import { getAdminText } from "@/lib/i18n/admin";
import { ClientForm } from "@/modules/clients/components/client-form";
import { getClientForPage } from "@/modules/clients/services/client-service";
import { updateClient } from "@/modules/clients/services/update-client";
import type { ClientFormValues } from "@/modules/clients/types";

type EditClientPageProps = {
  params: Promise<{
    clientId: string;
  }>;
};

export default async function EditClientPage({ params }: EditClientPageProps) {
  const { t } = await getAdminText();
  const { clientId } = await params;
  const { data: client, error } = await getClientForPage(clientId);

  if (error) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <Link href="/dashboard/clients" style={{ color: "var(--muted)", fontWeight: 600 }}>
          {t("common.backToClients")}
        </Link>
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: 12,
            background: "var(--danger-bg)",
            color: "var(--danger-fg)",
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

  const action = updateClient.bind(null, client.id);
  const defaultValues: ClientFormValues = {
    firstName: client.firstName,
    lastName: client.lastName,
    phone: client.phone,
    email: client.email ?? "",
    status: client.status,
    notes: client.notes ?? "",
  };

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Link
        href={`/dashboard/clients/${client.id}`}
        style={{ color: "var(--muted)", fontWeight: 600 }}
      >
        {t("common.backToClient")}
      </Link>

      <header>
        <h1 style={{ margin: "0 0 8px" }}>{t("clients.editTitle")}</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          {t("clients.editDescription")}
        </p>
      </header>

      <section
        className="clients-form-shell"
      >
        <ClientForm
          action={action}
          defaultValues={defaultValues}
          submitLabel={t("common.saveChanges")}
        />
      </section>
    </div>
  );
}
