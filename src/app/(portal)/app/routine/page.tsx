import { getPortalText } from "@/lib/i18n/portal";
import { PortalRoutineExerciseCard } from "@/modules/coaching/components/portal-routine-exercise-card";
import { getLinkedClientForCurrentUser } from "@/modules/portal/services/portal-service";
import { getRoutineForPage, getClientRoutineSummariesForPage } from "@/modules/coaching/services/routine-service";

export const dynamic = "force-dynamic";

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
          padding: 20,
          borderRadius: 26,
          background:
            "linear-gradient(180deg, rgba(36, 44, 38, 0.98), rgba(24, 30, 26, 0.96))",
          border: "1px solid var(--border-strong)",
          boxShadow: "0 18px 42px rgba(0, 0, 0, 0.2)",
        }}
      >
        <div className="responsive-inline-header">
          <div style={{ display: "grid", gap: 8 }}>
            <h1 style={{ margin: 0, fontSize: "clamp(1.9rem, 4vw, 2.25rem)", lineHeight: 1.1 }}>
              {t.routine.title}
            </h1>
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
            padding: 22,
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
                padding: 18,
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
                    <PortalRoutineExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                      labels={{
                        sets: t.routine.sets,
                        reps: t.routine.reps,
                        weight: t.routine.weight,
                        rest: t.routine.rest,
                        exerciseNotes: t.routine.exerciseNotes,
                        viewVideo: t.routine.viewVideo,
                        details: t.routine.details,
                        closeDetails: t.routine.closeDetails,
                        mediaGallery: t.routine.mediaGallery,
                        instructions: t.routine.instructions,
                        coachTips: t.routine.coachTips,
                        commonMistakes: t.routine.commonMistakes,
                        noExtraDetails: t.routine.noExtraDetails,
                        notAvailable: t.routine.notAvailable,
                        secondsShort: t.routine.secondsShort,
                      }}
                    />
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
