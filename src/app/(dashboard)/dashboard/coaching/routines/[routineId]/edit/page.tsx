import Link from "next/link";
import { notFound } from "next/navigation";

import { RoutineDayForm } from "@/modules/coaching/components/routine-day-form";
import { RoutineDayManager } from "@/modules/coaching/components/routine-day-manager";
import { RoutineDetailCard } from "@/modules/coaching/components/routine-detail-card";
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
          Back
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
        Back to routine
      </Link>

      <header>
        <h1 style={{ margin: "0 0 8px" }}>Edit routine</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          Update the routine and build it day by day with ordered exercises.
        </p>
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
          This client already had an active routine. The previous one was archived automatically.
        </p>
      ) : null}

      <section
        style={{
          padding: 24,
          borderRadius: 24,
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
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
            submitLabel="Save routine"
            lockClient
          />
        )}
      </section>

      <section
        style={{
          display: "grid",
          gap: 16,
          padding: 24,
          borderRadius: 24,
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 8px" }}>Add day</h2>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            Create day blocks in the order you want the client to follow them.
          </p>
        </div>

        <RoutineDayForm action={createRoutineDay.bind(null, routine.id)} />
      </section>

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

      <RoutineDetailCard routine={routine} />

      {routine.days.length > 0 ? (
        <section style={{ display: "grid", gap: 16 }}>
          <div>
            <h2 style={{ margin: "0 0 8px" }}>Manage days and exercises</h2>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Edit or remove day blocks and adjust each exercise prescription inline.
            </p>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
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
        </section>
      ) : null}
    </div>
  );
}
