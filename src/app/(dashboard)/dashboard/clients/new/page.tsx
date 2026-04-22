import Link from "next/link";

import { getAdminText } from "@/lib/i18n/admin";
import { ClientForm } from "@/modules/clients/components/client-form";
import { createClient } from "@/modules/clients/services/create-client";

export default async function NewClientPage() {
  const { t } = await getAdminText();

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div>
        <Link href="/dashboard/clients" style={{ color: "var(--muted)", fontWeight: 600 }}>
          {t("common.backToClients")}
        </Link>
      </div>

      <header>
        <h1 style={{ margin: "0 0 8px" }}>{t("clients.createTitle")}</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          {t("clients.createDescription")}
        </p>
      </header>

      <section
        className="clients-form-shell"
      >
        <ClientForm action={createClient} submitLabel={t("clients.form.submitCreate")} />
      </section>
    </div>
  );
}
