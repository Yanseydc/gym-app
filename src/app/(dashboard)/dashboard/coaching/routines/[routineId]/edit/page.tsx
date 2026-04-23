import Link from "next/link";
import { notFound } from "next/navigation";

import { getAdminText } from "@/lib/i18n/admin";
import { RoutineDayForm } from "@/modules/coaching/components/routine-day-form";
import { RoutineDayManager } from "@/modules/coaching/components/routine-day-manager";
import { RoutineForm } from "@/modules/coaching/components/routine-form";
import { createRoutineDay } from "@/modules/coaching/services/create-routine-day";
import { createRoutineExercise } from "@/modules/coaching/services/create-routine-exercise";
import { deleteRoutineDay } from "@/modules/coaching/services/delete-routine-day";
import { deleteRoutineExercise } from "@/modules/coaching/services/delete-routine-exercise";
import { getRoutineClientOptionsForPage, getRoutineExerciseOptionsForPage, getRoutineForPage } from "@/modules/coaching/services/routine-service";
import { updateRoutineDay } from "@/modules/coaching/services/update-routine-day";
import { updateRoutineExercise } from "@/modules/coaching/services/update-routine-exercise";
import { updateRoutine } from "@/modules/coaching/services/update-routine";
import type { RoutineFormValues } from "@/modules/coaching/types";

type EditRoutinePageProps = {
  params: Promise<{
    routineId: string;
  }>;
  searchParams?: Promise<{
    notice?: string;
  }>;
};

export default async function EditRoutinePage({ params, searchParams }: EditRoutinePageProps) {
  const { t } = await getAdminText();
  const { routineId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const [
    { data: routine, error },
    { data: clients, error: clientsError },
    { data: exercises, error: exercisesError },
  ] = await Promise.all([
    getRoutineForPage(routineId),
    getRoutineClientOptionsForPage(),
    getRoutineExerciseOptionsForPage(),
  ]);

  if (error) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <Link href="/dashboard/coaching/exercises" style={{ color: "var(--muted)", fontWeight: 600 }}>
          {t("common.back")}
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
          {error}
        </p>
      </div>
    );
  }

  if (!routine) {
    notFound();
  }

  const defaultValues: RoutineFormValues = {
    clientId: routine.clientId,
    title: routine.title,
    notes: routine.notes ?? "",
    status: routine.status,
    startsOn: routine.startsOn ?? "",
    endsOn: routine.endsOn ?? "",
  };

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Link
        href={`/dashboard/coaching/routines/${routine.id}`}
        style={{ color: "var(--muted)", fontWeight: 600 }}
      >
        {t("coaching.routines.backToRoutine")}
      </Link>

      <header>
        <h1 style={{ margin: 0 }}>{t("coaching.routines.editTitle")}</h1>
      </header>

      {resolvedSearchParams?.notice === "archived_previous" ? (
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: 12,
            background: "rgba(94, 168, 120, 0.12)",
            color: "#b9efc5",
            border: "1px solid rgba(94, 168, 120, 0.24)",
          }}
        >
          {t("coaching.routines.activeRoutineArchivedNotice")}
        </p>
      ) : null}

      <section
        style={{
          display: "grid",
          gap: 16,
          padding: 22,
          borderRadius: 24,
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18 }}>{t("coaching.routines.infoTitle")}</h2>
        {clientsError ? (
          <p
            style={{
              margin: 0,
              padding: "12px 14px",
              borderRadius: 12,
              background: "#fff2f2",
              color: "#8a1c1c",
            }}
          >
            {clientsError}
          </p>
        ) : (
          <RoutineForm
            action={updateRoutine.bind(null, routine.id)}
            clients={clients}
            defaultValues={defaultValues}
            submitLabel={t("coaching.routines.saveRoutine")}
            lockClient
            showHeader={false}
          />
        )}
      </section>

      <section
        style={{
          display: "grid",
          gap: 20,
          padding: 22,
          borderRadius: 24,
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 6px" }}>{t("coaching.routines.manageDaysTitle")}</h2>
          <p style={{ margin: 0, color: "var(--muted)" }}>{t("coaching.routines.manageDaysDescription")}</p>
        </div>

        {exercisesError ? (
          <p
            style={{
              margin: 0,
              padding: "12px 14px",
              borderRadius: 12,
              background: "#fff2f2",
              color: "#8a1c1c",
            }}
          >
            {exercisesError}
          </p>
        ) : null}

        {routine.days.length > 0 ? (
          <div style={{ display: "grid", gap: 20 }}>
            {routine.days.map((day) => (
              <RoutineDayManager
                key={day.id}
                day={day}
                exerciseOptions={exercises}
                createExerciseAction={createRoutineExercise.bind(null, routine.id, day.id)}
                updateDayAction={updateRoutineDay.bind(null, routine.id)}
                deleteDayAction={deleteRoutineDay.bind(null, routine.id)}
                exerciseRows={day.exercises}
                updateExerciseAction={updateRoutineExercise.bind(null, routine.id)}
                deleteExerciseAction={deleteRoutineExercise.bind(null, routine.id)}
              />
            ))}
          </div>
        ) : (
          <article
            style={{
              padding: 18,
              borderRadius: 18,
              border: "1px dashed var(--border)",
              background: "rgba(255, 255, 255, 0.02)",
              color: "var(--muted)",
            }}
          >
            {t("coaching.routines.emptyBuilder")}
          </article>
        )}

        <div
          style={{
            display: "grid",
            gap: 16,
            paddingTop: 20,
            borderTop: "1px solid var(--border)",
          }}
        >
          <div>
            <h3 style={{ margin: "0 0 6px", fontSize: 18 }}>{t("coaching.routines.addDayTitle")}</h3>
            <p style={{ margin: 0, color: "var(--muted)" }}>{t("coaching.routines.addDayDescription")}</p>
          </div>

          <RoutineDayForm
            action={createRoutineDay.bind(null, routine.id)}
            submitLabel={t("coaching.routines.addDayAction")}
          />
        </div>
      </section>
    </div>
  );
}
