"use client";

import { useEffect, useMemo, useState } from "react";

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
    dayLabel: (index: number) => string;
    exerciseCount: (count: number) => string;
  };
};

export function PortalRoutineDayAccordion({
  days,
  startsOn,
  labels,
}: PortalRoutineDayAccordionProps) {
  const defaultOpenDayId = useMemo(() => getDefaultOpenDayId(days, startsOn), [days, startsOn]);
  const [openDayId, setOpenDayId] = useState<string | null>(defaultOpenDayId);

  useEffect(() => {
    setOpenDayId(defaultOpenDayId);
  }, [defaultOpenDayId]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {days.map((day) => {
        const isOpen = openDayId === day.id;

        return (
          <article
            key={day.id}
            style={{
              display: "grid",
              gap: isOpen ? 16 : 0,
              padding: 18,
              borderRadius: 22,
              border: isOpen ? "1px solid var(--border-strong)" : "1px solid var(--border)",
              background: isOpen
                ? "linear-gradient(180deg, rgba(28, 34, 29, 0.99), rgba(21, 26, 23, 0.96))"
                : "linear-gradient(180deg, rgba(25, 30, 26, 0.96), rgba(20, 24, 22, 0.94))",
              boxShadow: isOpen ? "0 16px 30px rgba(0, 0, 0, 0.16)" : "0 10px 22px rgba(0, 0, 0, 0.08)",
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
                    {labels.dayLabel(day.dayIndex)}
                  </span>
                  <span
                    style={{
                      color: "var(--muted)",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {labels.exerciseCount(day.exercises.length)}
                  </span>
                </div>

                <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <strong style={{ display: "block", fontSize: 20, minWidth: 0 }}>{day.title}</strong>
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

            {isOpen ? (
              <div style={{ display: "grid", gap: 16 }}>
                {day.notes ? (
                  <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                    {day.notes}
                  </p>
                ) : (
                  <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                    {labels.noDayNotes}
                  </p>
                )}

                {day.exercises.length === 0 ? (
                  <p style={{ margin: 0, color: "var(--muted)" }}>{labels.noExercises}</p>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    {day.exercises.map((exercise) => (
                      <PortalRoutineExerciseCard
                        key={exercise.id}
                        exercise={exercise}
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
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function getDefaultOpenDayId(days: ClientRoutineDay[], startsOn: string | null) {
  if (days.length === 0) {
    return null;
  }

  if (startsOn) {
    const startDate = new Date(`${startsOn}T00:00:00`);
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
