import { getPortalText } from "@/lib/i18n/portal";
import { getLinkedClientForCurrentUser } from "@/modules/portal/services/portal-service";
import { getRoutineForPage, getClientRoutineSummariesForPage } from "@/modules/coaching/services/routine-service";

export default async function PortalRoutinePage() {
  const t = getPortalText();
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
      <header
        style={{
          display: "grid",
          gap: 10,
          padding: 22,
          borderRadius: 24,
          background: "linear-gradient(180deg, rgba(239, 229, 212, 0.42), rgba(255, 255, 255, 0.94))",
          border: "1px solid rgba(0, 0, 0, 0.06)",
        }}
      >
        <h1 style={{ margin: 0 }}>{t.routine.title}</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          {t.routine.description}
        </p>
      </header>

      {!routine ? (
        <article
          style={{
            padding: 28,
            borderRadius: 24,
            border: "1px dashed var(--border)",
            background: "linear-gradient(180deg, var(--surface), rgba(255, 250, 243, 0.88))",
            color: "var(--muted)",
          }}
        >
          {t.routine.empty}
        </article>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {routine.days.map((day) => (
            <article
              key={day.id}
              style={{
                display: "grid",
                gap: 16,
                padding: 22,
                borderRadius: 22,
                border: "1px solid rgba(0, 0, 0, 0.06)",
                background: "linear-gradient(180deg, var(--surface), rgba(255, 250, 243, 0.78))",
                boxShadow: "var(--shadow)",
              }}
            >
              <div>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: "rgba(239, 229, 212, 0.75)",
                    color: "var(--accent-strong)",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  Dia {day.dayIndex}
                </span>
                <strong style={{ display: "block", fontSize: 20, marginTop: 10 }}>
                  {day.title}
                </strong>
                {day.notes ? (
                  <p style={{ margin: "8px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
                    {day.notes}
                  </p>
                ) : null}
              </div>

              {day.exercises.length === 0 ? (
                <p style={{ margin: 0, color: "var(--muted)" }}>{t.routine.noExercises}</p>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {day.exercises.map((exercise) => (
                    <article
                      key={exercise.id}
                      style={{
                        display: "grid",
                        gap: 12,
                        padding: 18,
                        borderRadius: 18,
                        border: "1px solid rgba(0, 0, 0, 0.06)",
                        background: "#fff",
                      }}
                    >
                      <strong>{exercise.exerciseName}</strong>
                      <div
                        style={{
                          display: "grid",
                          gap: 10,
                          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                        }}
                      >
                        <ExerciseMeta label={t.routine.sets} value={exercise.setsText} />
                        <ExerciseMeta label={t.routine.reps} value={exercise.repsText} />
                        <ExerciseMeta
                          label={t.routine.weight}
                          value={exercise.targetWeightText || t.routine.notAvailable}
                        />
                        <ExerciseMeta
                          label={t.routine.rest}
                          value={`${exercise.restSeconds ?? t.routine.notAvailable} ${t.routine.secondsShort}`}
                        />
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

function ExerciseMeta({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 4,
        padding: "10px 12px",
        borderRadius: 14,
        background: "rgba(255, 250, 243, 0.9)",
      }}
    >
      <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}
