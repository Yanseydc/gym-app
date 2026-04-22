import Link from "next/link";

import { getAdminText } from "@/lib/i18n/admin";
import { RoutineForm } from "@/modules/coaching/components/routine-form";
import { createRoutine } from "@/modules/coaching/services/create-routine";
import { getRoutineClientOptionsForPage } from "@/modules/coaching/services/routine-service";
import type { RoutineFormValues } from "@/modules/coaching/types";

type NewRoutinePageProps = {
  searchParams?: Promise<{
    clientId?: string;
  }>;
};

export default async function NewRoutinePage({ searchParams }: NewRoutinePageProps) {
  const { t } = await getAdminText();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const { data: clients, error } = await getRoutineClientOptionsForPage();

  const defaultValues: RoutineFormValues = {
    clientId: resolvedSearchParams.clientId ?? "",
    title: "",
    notes: "",
    status: "draft",
    startsOn: "",
    endsOn: "",
  };

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div>
        <Link
          href={resolvedSearchParams.clientId ? `/dashboard/clients/${resolvedSearchParams.clientId}` : "/dashboard/coaching/exercises"}
          style={{ color: "var(--muted)", fontWeight: 600 }}
        >
          {t("common.back")}
        </Link>
      </div>

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
        <h1 style={{ margin: 0 }}>{t("clients.detail.createRoutine")}</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          {t("clients.detail.routinesHelper")}
        </p>
      </header>

      {error ? (
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
      ) : null}

      <div className="coaching-form-layout">
        <section className="coaching-form-shell">
          <RoutineForm
            action={createRoutine}
            clients={clients}
            defaultValues={defaultValues}
            submitLabel={t("clients.detail.createRoutine")}
            lockClient={Boolean(resolvedSearchParams.clientId)}
          />
        </section>

        <aside className="coaching-support-panel">
          <div style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              {t("clients.detail.actions")}
            </span>
            <strong style={{ fontSize: 18 }}>{t("common.save")} first, build after</strong>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
              After creating the routine, you will continue to the routine workspace to add day blocks and assign exercises.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
              padding: 14,
              borderRadius: 18,
              border: "1px solid var(--border)",
              background: "rgba(255, 255, 255, 0.025)",
            }}
          >
            <strong style={{ fontSize: 15 }}>What you can define now</strong>
            <ul style={{ margin: 0, paddingLeft: 18, color: "var(--muted)", lineHeight: 1.65 }}>
              <li>client and title</li>
              <li>draft, active or archived status</li>
              <li>optional start and end dates</li>
              <li>high-level coaching notes</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
