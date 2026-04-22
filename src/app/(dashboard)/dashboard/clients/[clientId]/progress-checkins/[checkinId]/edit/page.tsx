import Link from "next/link";
import { notFound } from "next/navigation";

import { getAdminText } from "@/lib/i18n/admin";
import { ProgressCheckInForm } from "@/modules/coaching/components/progress-checkin-form";
import { getProgressCheckInForPage } from "@/modules/coaching/services/progress-checkin-service";
import { updateProgressCheckIn } from "@/modules/coaching/services/update-progress-checkin";
import type { ProgressCheckInFormValues } from "@/modules/coaching/types";
import { getClientForPage } from "@/modules/clients/services/client-service";

type EditProgressCheckInPageProps = {
  params: Promise<{
    checkinId: string;
    clientId: string;
  }>;
};

export default async function EditProgressCheckInPage({ params }: EditProgressCheckInPageProps) {
  const { t } = await getAdminText();
  const { checkinId, clientId } = await params;
  const [{ data: client, error }, { data: checkIn, error: checkInError }] = await Promise.all([
    getClientForPage(clientId),
    getProgressCheckInForPage(checkinId),
  ]);

  if (error || checkInError) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <Link href={`/dashboard/clients/${clientId}`} style={{ color: "var(--muted)", fontWeight: 600 }}>
          {t("common.backToClient")}
        </Link>
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: 12,
            background: "#fff2f2",
            color: "#8a1c1c",
          }}
        >
          {error ?? checkInError}
        </p>
      </div>
    );
  }

  if (!client || !checkIn || checkIn.clientId !== clientId) {
    notFound();
  }

  const defaultValues: ProgressCheckInFormValues = {
    checkinDate: checkIn.checkinDate,
    weightKg: checkIn.weightKg ? String(checkIn.weightKg) : "",
    clientNotes: checkIn.clientNotes ?? "",
    coachNotes: checkIn.coachNotes ?? "",
  };

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Link href={`/dashboard/clients/${clientId}`} style={{ color: "var(--muted)", fontWeight: 600 }}>
        {t("common.backToClient")}
      </Link>

      <header
        style={{
          display: "grid",
          gap: 10,
          padding: 20,
          borderRadius: 24,
          border: "1px solid var(--border)",
          background: "linear-gradient(180deg, rgba(30, 36, 31, 0.98), rgba(22, 27, 24, 0.95))",
        }}
      >
        <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          {t("nav.coaching")}
        </span>
        <h1 style={{ margin: 0 }}>{t("coaching.progress.edit")}</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          Update notes, weight and photos for {client.firstName} {client.lastName}.
        </p>
      </header>

      <section className="coaching-form-shell">
        <ProgressCheckInForm
          action={updateProgressCheckIn.bind(null, clientId, checkinId)}
          defaultValues={defaultValues}
          existingCheckIn={checkIn}
          submitLabel={t("common.saveChanges")}
        />
      </section>
    </div>
  );
}
