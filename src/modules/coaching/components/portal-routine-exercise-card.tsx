"use client";

import { useEffect, useState } from "react";

import { buttonGhost, buttonSecondary } from "@/lib/ui";
import type { ClientRoutineExercise } from "@/modules/coaching/types";

type PortalRoutineExerciseCardProps = {
  exercise: ClientRoutineExercise;
  isCompleted: boolean;
  onToggleCompleted: () => void;
  labels: {
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
  };
};

type ExerciseSlide = {
  id: string;
  url: string;
  altText: string | null;
};

export function PortalRoutineExerciseCard({
  exercise,
  isCompleted,
  onToggleCompleted,
  labels,
}: PortalRoutineExerciseCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const media = exercise.media ?? [];
  const slides: ExerciseSlide[] = media.length > 0
    ? media.map((media) => ({
        id: media.id,
        url: media.url,
        altText: media.altText,
      }))
    : exercise.thumbnailUrl
      ? [
          {
            id: `${exercise.exerciseId}-thumbnail`,
            url: exercise.thumbnailUrl,
            altText: exercise.exerciseName,
          },
        ]
      : [];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }

      if (slides.length > 1 && event.key === "ArrowRight") {
        setActiveIndex((current) => (current + 1) % slides.length);
      }

      if (slides.length > 1 && event.key === "ArrowLeft") {
        setActiveIndex((current) => (current - 1 + slides.length) % slides.length);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, slides.length]);

  useEffect(() => {
    if (!isOpen) {
      setActiveIndex(0);
    } else if (activeIndex >= slides.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, isOpen, slides.length]);

  const activeSlide = slides[activeIndex] ?? null;
  const showDetailSections = Boolean(
    exercise.instructions || exercise.coachTips || exercise.commonMistakes || exercise.videoUrl,
  );

  return (
    <>
      <article
        className="portal-routine-exercise-card"
        role="button"
        tabIndex={0}
        aria-label={exercise.exerciseName}
        onClick={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
        data-completed={isCompleted ? "true" : "false"}
        style={{
          display: "grid",
          gap: 12,
          padding: 16,
          borderRadius: 18,
          border: "1px solid var(--border)",
          background: "linear-gradient(180deg, rgba(33, 39, 34, 0.96), rgba(24, 29, 25, 0.94))",
          minWidth: 0,
          cursor: "pointer",
          opacity: isCompleted ? 0.7 : 1,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            minWidth: 0,
            flexWrap: "wrap",
          }}
        >
          <label
            onClick={(event) => event.stopPropagation()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 42,
              height: 42,
              borderRadius: 999,
              border: isCompleted ? "1px solid rgba(88, 179, 124, 0.48)" : "1px solid var(--border)",
              background: isCompleted ? "var(--success-bg)" : "rgba(255, 255, 255, 0.035)",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <input
              type="checkbox"
              checked={isCompleted}
              aria-label={isCompleted ? labels.markIncomplete : labels.markComplete}
              onChange={onToggleCompleted}
              style={{
                width: 18,
                height: 18,
                accentColor: "var(--success)",
                cursor: "pointer",
              }}
            />
          </label>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              minWidth: 0,
              flex: "1 1 260px",
            }}
          >
            {exercise.thumbnailUrl ? (
              <img
                src={exercise.thumbnailUrl}
                alt={exercise.exerciseName}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 16,
                  objectFit: "cover",
                  border: "1px solid var(--border)",
                  background: "rgba(255, 255, 255, 0.04)",
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                aria-hidden="true"
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                  background:
                    "linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02))",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--muted)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  flexShrink: 0,
                }}
              >
                Foto
              </div>
            )}

            <div
              style={{
                display: "grid",
                gap: 8,
                minWidth: 0,
                flex: 1,
              }}
            >
              <strong
                style={{
                  fontSize: 20,
                  lineHeight: 1.25,
                  minWidth: 0,
                  textDecoration: isCompleted ? "line-through" : "none",
                  textDecorationThickness: 2,
                  textDecorationColor: "rgba(88, 179, 124, 0.72)",
                }}
              >
                {exercise.exerciseName}
              </strong>
              <span
                style={{
                  color: "var(--muted)",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {labels.sets} {exercise.setsText} · {labels.reps} {exercise.repsText}
              </span>
              {isCompleted ? (
                <span
                  style={{
                    color: "var(--success)",
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {labels.completed}
                </span>
              ) : null}
            </div>
          </div>

          {exercise.videoUrl ? (
            <a
              href={exercise.videoUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonSecondary}
              onClick={(event) => event.stopPropagation()}
              style={{ width: "fit-content", whiteSpace: "nowrap" }}
            >
              {labels.viewVideo}
            </a>
          ) : null}
        </div>

        <div className="portal-routine-meta-grid">
          <ExerciseMeta label={labels.sets} value={exercise.setsText} isPrimary />
          <ExerciseMeta label={labels.reps} value={exercise.repsText} isPrimary />
          <ExerciseMeta label={labels.weight} value={exercise.targetWeightText || labels.notAvailable} />
          <ExerciseMeta
            label={labels.rest}
            value={`${exercise.restSeconds ?? labels.notAvailable} ${labels.secondsShort}`}
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
              {labels.exerciseNotes}
            </span>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>{exercise.notes}</p>
          </div>
        ) : null}
      </article>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={exercise.exerciseName}
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(7, 10, 8, 0.78)",
            backdropFilter: "blur(6px)",
            padding: 20,
            display: "grid",
            placeItems: "center",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(920px, 100%)",
              maxHeight: "min(90vh, 920px)",
              overflowY: "auto",
              display: "grid",
              gap: 20,
              padding: 22,
              borderRadius: 26,
              border: "1px solid var(--border-strong)",
              background:
                "linear-gradient(180deg, rgba(29, 35, 31, 0.99), rgba(19, 24, 21, 0.98))",
              boxShadow: "0 24px 48px rgba(0, 0, 0, 0.32)",
            }}
          >
            <div className="responsive-inline-header">
              <div style={{ display: "grid", gap: 8 }}>
                <span
                  style={{
                    color: "var(--muted)",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  {labels.mediaGallery}
                </span>
                <h2 style={{ margin: 0, fontSize: "clamp(1.6rem, 3vw, 2rem)", lineHeight: 1.15 }}>
                  {exercise.exerciseName}
                </h2>
              </div>
              <button type="button" className={buttonGhost} onClick={() => setIsOpen(false)}>
                {labels.closeDetails}
              </button>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              {activeSlide ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <div
                    style={{
                      overflow: "hidden",
                      borderRadius: 22,
                      border: "1px solid var(--border)",
                      background:
                        "linear-gradient(180deg, rgba(16, 20, 17, 0.96), rgba(24, 29, 25, 0.92))",
                      height: "clamp(280px, 48vh, 420px)",
                      display: "grid",
                      placeItems: "center",
                      padding: 16,
                    }}
                  >
                    <img
                      src={activeSlide.url}
                      alt={activeSlide.altText || exercise.exerciseName}
                      style={{
                        width: "auto",
                        height: "auto",
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                        objectPosition: "center",
                        display: "block",
                      }}
                    />
                  </div>
                  {slides.length > 1 ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className={buttonGhost}
                          onClick={() =>
                            setActiveIndex((current) => (current - 1 + slides.length) % slides.length)
                          }
                        >
                          Anterior
                        </button>
                        <button
                          type="button"
                          className={buttonGhost}
                          onClick={() => setActiveIndex((current) => (current + 1) % slides.length)}
                        >
                          Siguiente
                        </button>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {slides.map((slide, index) => (
                          <button
                            key={slide.id}
                            type="button"
                            onClick={() => setActiveIndex(index)}
                            aria-label={`Imagen ${index + 1}`}
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 999,
                              border: index === activeIndex ? "1px solid transparent" : "1px solid var(--border)",
                              background: index === activeIndex ? "var(--accent-strong)" : "rgba(255, 255, 255, 0.16)",
                              padding: 0,
                              cursor: "pointer",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div
                  style={{
                    minHeight: 240,
                    borderRadius: 22,
                    border: "1px solid var(--border)",
                    background: "rgba(255, 255, 255, 0.03)",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--muted)",
                    padding: 24,
                    textAlign: "center",
                  }}
                >
                  {labels.noExtraDetails}
                </div>
              )}
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              {exercise.videoUrl ? (
                <a
                  href={exercise.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonSecondary}
                  style={{ width: "fit-content" }}
                >
                  {labels.viewVideo}
                </a>
              ) : null}

              {showDetailSections ? (
                <div style={{ display: "grid", gap: 12 }}>
                  {exercise.instructions ? (
                    <DetailBlock title={labels.instructions} body={exercise.instructions} />
                  ) : null}
                  {exercise.coachTips ? (
                    <DetailBlock title={labels.coachTips} body={exercise.coachTips} />
                  ) : null}
                  {exercise.commonMistakes ? (
                    <DetailBlock title={labels.commonMistakes} body={exercise.commonMistakes} />
                  ) : null}
                </div>
              ) : (
                <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                  {labels.noExtraDetails}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ExerciseMeta({
  label,
  value,
  isPrimary = false,
}: {
  label: string;
  value: string;
  isPrimary?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gap: 6,
        padding: "12px 14px",
        borderRadius: 16,
        background: isPrimary
          ? "linear-gradient(180deg, rgba(240, 151, 110, 0.1), rgba(255, 255, 255, 0.025))"
          : "rgba(255, 255, 255, 0.025)",
        border: "1px solid var(--border)",
        minWidth: 0,
      }}
    >
      <span
        style={{
          color: "var(--muted)",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <strong
        style={{
          fontSize: isPrimary ? 17 : 15,
          lineHeight: 1.3,
          color: isPrimary ? "var(--foreground)" : "var(--muted)",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function DetailBlock({ title, body }: { title: string; body: string }) {
  return (
    <section
      style={{
        display: "grid",
        gap: 6,
        padding: 16,
        borderRadius: 18,
        border: "1px solid var(--border)",
        background: "rgba(255, 255, 255, 0.03)",
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
        {title}
      </span>
      <p style={{ margin: 0, color: "var(--foreground)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
        {body}
      </p>
    </section>
  );
}
