import Link from "next/link";
import { notFound } from "next/navigation";

import { RoutineDayForm } from "@/modules/coaching/components/routine-day-form";
import { RoutineDetailCard } from "@/modules/coaching/components/routine-detail-card";
import { RoutineExerciseForm } from "@/modules/coaching/components/routine-exercise-form";
import { RoutineForm } from "@/modules/coaching/components/routine-form";
import { createRoutineDay } from "@/modules/coaching/services/create-routine-day";
import { createRoutineExercise } from "@/modules/coaching/services/create-routine-exercise";
import { getRoutineClientOptionsForPage, getRoutineExerciseOptionsForPage, getRoutineForPage } from "@/modules/coaching/services/routine-service";
import { updateRoutine } from "@/modules/coaching/services/update-routine";
import type { RoutineFormValues } from "@/modules/coaching/types";

type EditRoutinePageProps = {
  params: Promise<{
    routineId: string;
  }>;
};

export default async function EditRoutinePage({ params }: EditRoutinePageProps) {
  const { routineId } = await params;
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
            <h2 style={{ margin: "0 0 8px" }}>Add exercises to days</h2>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Use numeric sort order to control the sequence inside each day.
            </p>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            {routine.days.map((day) => (
              <section
                key={day.id}
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
                  <h3 style={{ margin: "0 0 8px" }}>
                    Day {day.dayIndex}: {day.title}
                  </h3>
                  <p style={{ margin: 0, color: "var(--muted)" }}>
                    Add one exercise at a time with its prescription details.
                  </p>
                </div>

                <RoutineExerciseForm
                  action={createRoutineExercise.bind(null, routine.id, day.id)}
                  exercises={exercises}
                />
              </section>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
