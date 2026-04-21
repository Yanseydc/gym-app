import { getLinkedClientForCurrentUser } from "@/modules/portal/services/portal-service";
import { getRoutineForPage, getClientRoutineSummariesForPage } from "@/modules/coaching/services/routine-service";

export default async function PortalRoutinePage() {
  const { data: linkedClient } = await getLinkedClientForCurrentUser();

  if (!linkedClient) {
    return null;
  }

  const { data: routineSummaries } = await getClientRoutineSummariesForPage(linkedClient.clientId);
  const activeRoutineSummary = routineSummaries.find((routine) => routine.status === "active") ?? null;
  const activeRoutineResult = activeRoutineSummary
    ? await getRoutineForPage(activeRoutineSummary.id)
    : { data: null, error: null };
  const routine = activeRoutineResult.data;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <header>
        <h1 style={{ margin: "0 0 8px" }}>My routine</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          This is your current active workout plan.
        </p>
      </header>

      {!routine ? (
        <article
          style={{
            padding: 24,
            borderRadius: 24,
            border: "1px dashed var(--border)",
            background: "var(--surface)",
            color: "var(--muted)",
          }}
        >
          No active routine assigned yet.
        </article>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {routine.days.map((day) => (
            <article
              key={day.id}
              style={{
                display: "grid",
                gap: 14,
                padding: 20,
                borderRadius: 20,
                border: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              <div>
                <strong style={{ fontSize: 18 }}>
                  Day {day.dayIndex}: {day.title}
                </strong>
                {day.notes ? (
                  <p style={{ margin: "8px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
                    {day.notes}
                  </p>
                ) : null}
              </div>

              {day.exercises.length === 0 ? (
                <p style={{ margin: 0, color: "var(--muted)" }}>No exercises added yet.</p>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {day.exercises.map((exercise) => (
                    <article
                      key={exercise.id}
                      style={{
                        display: "grid",
                        gap: 10,
                        padding: 16,
                        borderRadius: 16,
                        border: "1px solid var(--border)",
                        background: "rgba(255, 250, 243, 0.85)",
                      }}
                    >
                      <strong>{exercise.exerciseName}</strong>
                      <div style={{ color: "var(--muted)", display: "flex", gap: 16, flexWrap: "wrap" }}>
                        <span>Sets: {exercise.setsText}</span>
                        <span>Reps: {exercise.repsText}</span>
                        <span>Weight: {exercise.targetWeightText || "N/A"}</span>
                        <span>Rest: {exercise.restSeconds ?? "N/A"} sec</span>
                      </div>
                      {exercise.notes ? (
                        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                          {exercise.notes}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
