import { BackNavigation } from "@/components/navigation/back-navigation";
import { getAdminText } from "@/lib/i18n/admin";
import { RoutineCreateFlow } from "@/modules/coaching/components/routine-create-flow";
import { createRoutineFromText } from "@/modules/coaching/services/create-routine-from-text";
import { createRoutine } from "@/modules/coaching/services/create-routine";
import {
  getRoutineClientOptionsForPage,
  getRoutineExerciseOptionsForPage,
} from "@/modules/coaching/services/routine-service";
import type { RoutineFormValues } from "@/modules/coaching/types";

type NewRoutinePageProps = {
  searchParams?: Promise<{
    clientId?: string;
  }>;
};

export default async function NewRoutinePage({ searchParams }: NewRoutinePageProps) {
  const { t } = await getAdminText();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const [
    { data: clients, error: clientsError },
    { data: exercises, error: exercisesError },
  ] = await Promise.all([
    getRoutineClientOptionsForPage(),
    getRoutineExerciseOptionsForPage(),
  ]);
  const error = clientsError ?? exercisesError;

  const defaultValues: RoutineFormValues = {
    clientId: resolvedSearchParams.clientId ?? "",
    title: "",
    notes: "",
    status: "draft",
    startsOn: "",
    endsOn: "",
  };
  const returnHref = resolvedSearchParams.clientId
    ? `/dashboard/clients/${resolvedSearchParams.clientId}?tab=coaching`
    : "/dashboard/coaching/exercises";

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <BackNavigation
        href={returnHref}
        label={t("common.backToCoaching")}
        breadcrumbs={[
          { href: "/dashboard/coaching/exercises", label: t("nav.coaching") },
          { label: t("coaching.createPage.createTitle") },
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
          {t("coaching.createPage.workflow")}
        </span>
        <h1 style={{ margin: 0 }}>{t("coaching.createPage.createTitle")}</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          {t("coaching.createPage.createDescription")}
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
          <RoutineCreateFlow
            createAction={createRoutine}
            importAction={createRoutineFromText}
            clients={clients}
            defaultValues={defaultValues}
            exercises={exercises}
            lockClient={Boolean(resolvedSearchParams.clientId)}
          />
        </section>

        <aside className="coaching-support-panel">
          <div style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              {t("coaching.createPage.nextSteps")}
            </span>
            <strong style={{ fontSize: 18 }}>{t("coaching.createPage.saveFirst")}</strong>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
              {t("coaching.createPage.saveFirstDescription")}
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
            <strong style={{ fontSize: 15 }}>{t("coaching.createPage.whatYouCanDefine")}</strong>
            <ul style={{ margin: 0, paddingLeft: 18, color: "var(--muted)", lineHeight: 1.65 }}>
              <li>{t("coaching.createPage.defineClientAndTitle")}</li>
              <li>{t("coaching.createPage.defineStatus")}</li>
              <li>{t("coaching.createPage.defineDates")}</li>
              <li>{t("coaching.createPage.defineNotes")}</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
