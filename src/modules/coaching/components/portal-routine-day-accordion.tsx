"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { getPortalText } from "@/lib/i18n/portal";
import { buttonPrimary } from "@/lib/ui";
import { PortalRoutineExerciseCard } from "@/modules/coaching/components/portal-routine-exercise-card";
import type { ClientRoutineDay } from "@/modules/coaching/types";

type PortalRoutineDayAccordionProps = {
  days: ClientRoutineDay[];
  startsOn: string | null;
  labels: {
    noExercises: string;
    noDayNotes: string;
    sets: string;
    reps: string;
    weight: string;
    rest: string;
    exerciseNotes: string;
    viewVideo: string;
    details: string;
    closeDetails: string;
    mediaGallery: string;
    instructions: string;
    coachTips: string;
    commonMistakes: string;
    noExtraDetails: string;
    notAvailable: string;
    secondsShort: string;
    completed: string;
    markComplete: string;
    markIncomplete: string;
    sessionProgressNotice: string;
  };
};

export function PortalRoutineDayAccordion({
  days,
  startsOn,
  labels,
}: PortalRoutineDayAccordionProps) {
  const t = getPortalText();
  const todayDayId = useMemo(() => getDefaultOpenDayId(days, startsOn), [days, startsOn]);
  const firstTrainingDayId = useMemo(() => getFirstTrainingDayId(days), [days]);
  const defaultOpenDayId = firstTrainingDayId ?? days[0]?.id ?? null;
  const [openDayId, setOpenDayId] = useState<string | null>(defaultOpenDayId);
  const [completedExerciseIds, setCompletedExerciseIds] = useState<Set<string>>(() => new Set());
  const firstExerciseRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setOpenDayId(defaultOpenDayId);
  }, [defaultOpenDayId]);

  function toggleExerciseCompletion(exerciseId: string) {
    setCompletedExerciseIds((current) => {
      const next = new Set(current);

      if (next.has(exerciseId)) {
        next.delete(exerciseId);
      } else {
        next.add(exerciseId);
      }

      return next;
    });
  }

  function handleStartWorkout() {
    setOpenDayId(firstTrainingDayId ?? defaultOpenDayId);
    window.setTimeout(() => {
      firstExerciseRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  }

  if (days.length === 0) {
    return (
      <article
        style={{
          padding: 22,
          borderRadius: 24,
          border: "1px dashed var(--border)",
          background: "linear-gradient(180deg, rgba(26, 31, 27, 0.98), rgba(20, 24, 21, 0.94))",
          color: "var(--muted)",
        }}
      >
        {labels.noExercises}
      </article>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16, paddingBottom: 92 }}>
      {days.map((day) => {
        const isOpen = openDayId === day.id;
        const isToday = todayDayId === day.id;
        const exercises = day.exercises ?? [];
        const completedCount = exercises.filter((exercise) =>
          completedExerciseIds.has(exercise.id),
        ).length;

        return (
          <article
            key={day.id}
            id={`routine-day-${day.id}`}
            style={{
              display: "grid",
              gap: isOpen ? 16 : 0,
              padding: 18,
              borderRadius: 22,
              border: isToday
                ? "1px solid rgba(240, 151, 110, 0.48)"
                : isOpen
                  ? "1px solid var(--border-strong)"
                  : "1px solid var(--border)",
              background: isOpen
                ? "linear-gradient(180deg, rgba(28, 34, 29, 0.99), rgba(21, 26, 23, 0.96))"
                : "linear-gradient(180deg, rgba(25, 30, 26, 0.96), rgba(20, 24, 22, 0.94))",
              boxShadow: isToday
                ? "0 18px 34px rgba(209, 108, 67, 0.12)"
                : isOpen
                  ? "0 16px 30px rgba(0, 0, 0, 0.16)"
                  : "0 10px 22px rgba(0, 0, 0, 0.08)",
              transition: "border-color 180ms ease, box-shadow 180ms ease, background 180ms ease",
            }}
          >
            <button
              type="button"
              onClick={() => setOpenDayId((current) => (current === day.id ? null : day.id))}
              aria-expanded={isOpen}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                width: "100%",
                padding: 0,
                border: "none",
                background: "transparent",
                color: "inherit",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
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
                    {t.routine.dayLabel(day.dayIndex)}
                  </span>
                  <span
                    style={{
                      color: "var(--muted)",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {t.routine.exerciseCount(exercises.length)}
                  </span>
                  {isToday ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: "rgba(88, 179, 124, 0.14)",
                        color: "var(--success)",
                        fontSize: 12,
                        fontWeight: 800,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      {t.routine.today}
                    </span>
                  ) : null}
                </div>

                <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <strong style={{ display: "block", fontSize: 20, minWidth: 0 }}>{day.title}</strong>
                  <span style={{ color: "var(--muted)", fontSize: 14, fontWeight: 700 }}>
                    {t.routine.progress(completedCount, exercises.length)}
                  </span>
                  {isOpen ? (
                    <span style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.45 }}>
                      {labels.sessionProgressNotice}
                    </span>
                  ) : null}
                  {!isOpen && day.notes ? (
                    <p
                      style={{
                        margin: 0,
                        color: "var(--muted)",
                        lineHeight: 1.5,
                        fontSize: 14,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {day.notes}
                    </p>
                  ) : null}
                </div>
              </div>

              <span
                aria-hidden="true"
                style={{
                  flexShrink: 0,
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: "rgba(255, 255, 255, 0.03)",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--muted)",
                  fontSize: 18,
                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 180ms ease",
                }}
              >
                ˅
              </span>
            </button>

            <div className="portal-routine-accordion-panel" data-open={isOpen ? "true" : "false"}>
              {isOpen ? (
                <div style={{ display: "grid", gap: 16, paddingTop: 2 }}>
                  {day.notes ? (
                    <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                      {day.notes}
                    </p>
                  ) : (
                    <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                      {labels.noDayNotes}
                    </p>
                  )}

                  {exercises.length === 0 ? (
                    <p style={{ margin: 0, color: "var(--muted)" }}>{labels.noExercises}</p>
                  ) : (
                    <div style={{ display: "grid", gap: 12 }}>
                      {exercises.map((exercise) => (
                        <div
                          key={exercise.id}
                          ref={
                            day.id === firstTrainingDayId && exercise === exercises[0]
                              ? firstExerciseRef
                              : undefined
                          }
                        >
                          <PortalRoutineExerciseCard
                            exercise={exercise}
                            isCompleted={completedExerciseIds.has(exercise.id)}
                            onToggleCompleted={() => toggleExerciseCompletion(exercise.id)}
                            labels={{
                              sets: labels.sets,
                              reps: labels.reps,
                              weight: labels.weight,
                              rest: labels.rest,
                              exerciseNotes: labels.exerciseNotes,
                              viewVideo: labels.viewVideo,
                              details: labels.details,
                              closeDetails: labels.closeDetails,
                              mediaGallery: labels.mediaGallery,
                              instructions: labels.instructions,
                              coachTips: labels.coachTips,
                              commonMistakes: labels.commonMistakes,
                              noExtraDetails: labels.noExtraDetails,
                              notAvailable: labels.notAvailable,
                              secondsShort: labels.secondsShort,
                              completed: labels.completed,
                              markComplete: labels.markComplete,
                              markIncomplete: labels.markIncomplete,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </article>
        );
      })}

      <div className="portal-workout-sticky-action">
        <div style={{ display: "grid", gap: 8, width: "min(100%, 420px)" }}>
          <button type="button" className={buttonPrimary} onClick={handleStartWorkout}>
            {t.routine.startWorkout}
          </button>
          <span style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.35, textAlign: "center" }}>
            {labels.sessionProgressNotice}
          </span>
        </div>
      </div>
    </div>
  );
}

function getFirstTrainingDayId(days: ClientRoutineDay[]) {
  return days.find((day) => (day.exercises ?? []).length > 0)?.id ?? null;
}

function getDefaultOpenDayId(days: ClientRoutineDay[], startsOn: string | null) {
  if (days.length === 0) {
    return null;
  }

  if (startsOn) {
    const startDate = new Date(`${startsOn}T00:00:00`);

    if (!Number.isFinite(startDate.getTime())) {
      return days[0]?.id ?? null;
    }

    const today = new Date();
    const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const daysFromStart = Math.floor((localToday.getTime() - startDate.getTime()) / 86_400_000);

    if (daysFromStart >= 0) {
      const matchingDay = days.find((day) => day.dayIndex === daysFromStart + 1);

      if (matchingDay) {
        return matchingDay.id;
      }
    }
  }

  return days[0]?.id ?? null;
}
