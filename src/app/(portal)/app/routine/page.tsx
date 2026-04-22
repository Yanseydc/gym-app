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
          gap: 14,
          padding: 26,
          borderRadius: 26,
          background:
            "linear-gradient(180deg, rgba(36, 44, 38, 0.98), rgba(24, 30, 26, 0.96))",
          border: "1px solid var(--border-strong)",
          boxShadow: "0 18px 42px rgba(0, 0, 0, 0.2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "grid", gap: 8 }}>
            <h1 style={{ margin: 0, fontSize: 36, lineHeight: 1.1 }}>{t.routine.title}</h1>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6, fontSize: 16 }}>
              {t.routine.description}
            </p>
          </div>
          <span
            style={{
              padding: "9px 14px",
              borderRadius: 999,
              background: "var(--success-bg)",
              color: "var(--success)",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {t.routine.activeBadge}
          </span>
        </div>
      </header>

      {!routine ? (
        <article
          style={{
            padding: 28,
            borderRadius: 24,
            border: "1px dashed var(--border)",
            background: "linear-gradient(180deg, rgba(26, 31, 27, 0.98), rgba(20, 24, 21, 0.94))",
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
                border: "1px solid var(--border)",
                background: "linear-gradient(180deg, rgba(27, 32, 28, 0.98), rgba(21, 26, 23, 0.95))",
                boxShadow: "0 14px 28px rgba(0, 0, 0, 0.12)",
              }}
            >
              <div>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: "rgba(209, 108, 67, 0.16)",
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
                ) : (
                  <p style={{ margin: "8px 0 0", color: "var(--muted)", lineHeight: 1.6 }}>
                    {t.routine.noDayNotes}
                  </p>
                )}
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
                        border: "1px solid var(--border)",
                        background: "linear-gradient(180deg, rgba(33, 39, 34, 0.96), rgba(24, 29, 25, 0.94))",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <strong style={{ fontSize: 18, lineHeight: 1.3 }}>{exercise.exerciseName}</strong>
                        {exercise.videoUrl ? (
                          <a
                            href={exercise.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              padding: "10px 14px",
                              borderRadius: 12,
                              background: "rgba(209, 108, 67, 0.14)",
                              border: "1px solid rgba(209, 108, 67, 0.22)",
                              fontWeight: 700,
                              color: "var(--accent-strong)",
                            }}
                          >
                            {t.routine.viewVideo}
                          </a>
                        ) : null}
                      </div>
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
                        <div
                          style={{
                            display: "grid",
                            gap: 6,
                            padding: 14,
                            borderRadius: 16,
                            background: "rgba(255, 255, 255, 0.03)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          <span
                            style={{
                              color: "var(--muted)",
                              fontSize: 12,
                              fontWeight: 700,
                              letterSpacing: "0.04em",
                              textTransform: "uppercase",
                            }}
                          >
                            {t.routine.exerciseNotes}
                          </span>
                          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                            {exercise.notes}
                          </p>
                        </div>
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
        gap: 6,
        padding: "12px 14px",
        borderRadius: 16,
        background: "linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02))",
        border: "1px solid var(--border)",
      }}
    >
      <span style={{ color: "var(--muted)", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}
      </span>
      <strong style={{ fontSize: 16, lineHeight: 1.3 }}>{value}</strong>
    </div>
  );
}
