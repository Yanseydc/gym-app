"use client";

import { useState } from "react";

import { buttonDanger, buttonGhost, buttonSecondary } from "@/lib/ui";
import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";
import { RoutineDayForm } from "@/modules/coaching/components/routine-day-form";
import { RoutineExerciseForm } from "@/modules/coaching/components/routine-exercise-form";
import type {
  ClientRoutineDay,
  ClientRoutineExercise,
  RoutineDayFormValues,
  RoutineDayMutationState,
  RoutineExerciseFormValues,
  RoutineExerciseMutationState,
  RoutineExerciseOption,
} from "@/modules/coaching/types";

type RoutineDayManagerProps = {
  createExerciseAction: (
    state: RoutineExerciseMutationState,
    formData: FormData,
  ) => Promise<RoutineExerciseMutationState>;
  day: ClientRoutineDay;
  deleteDayAction: (formData: FormData) => Promise<void>;
  exerciseOptions: RoutineExerciseOption[];
  exerciseRows: ClientRoutineExercise[];
  deleteExerciseAction: (formData: FormData) => Promise<void>;
  updateDayAction: (
    state: RoutineDayMutationState,
    formData: FormData,
  ) => Promise<RoutineDayMutationState>;
  updateExerciseAction: (
    state: RoutineExerciseMutationState,
    formData: FormData,
  ) => Promise<RoutineExerciseMutationState>;
};

export function RoutineDayManager({
  createExerciseAction,
  day,
  deleteDayAction,
  exerciseOptions,
  deleteExerciseAction,
  exerciseRows,
  updateDayAction,
  updateExerciseAction,
}: RoutineDayManagerProps) {
  const { t } = useAdminText();
  const [isEditingDay, setIsEditingDay] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const dayDefaults: RoutineDayFormValues = {
    dayIndex: day.dayIndex,
    title: day.title,
    notes: day.notes ?? "",
  };

  return (
    <section
      style={{
        display: "grid",
        gap: 18,
        padding: 24,
        borderRadius: 24,
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "grid", gap: 8 }}>
          <h3 style={{ margin: 0 }}>
            {t("coaching.routines.day", { index: day.dayIndex })}: {day.title}
          </h3>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
            {day.notes || t("coaching.routines.noDayNotes")}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className={buttonSecondary}
            onClick={() => setIsEditingDay((current) => !current)}
          >
            {isEditingDay ? "Close editor" : t("common.edit")}
          </button>
          <form
            action={deleteDayAction}
            onSubmit={(event) => {
              const message = day.exercises.length > 0
                ? `This day has ${day.exercises.length} exercise(s). Delete the day and all its exercises?`
                : "Delete this day?";

              if (!window.confirm(message)) {
                event.preventDefault();
              }
            }}
          >
            <button type="submit" className={buttonDanger}>
              {t("common.delete")}
            </button>
          </form>
        </div>
      </div>

      {isEditingDay ? (
        <div
          style={{
            display: "grid",
            gap: 14,
            padding: 18,
            borderRadius: 20,
            border: "1px solid var(--border)",
            background: "rgba(255, 255, 255, 0.03)",
          }}
        >
          <div>
            <strong style={{ display: "block", marginBottom: 6 }}>Edit day</strong>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Update the day title or coaching notes without changing its order.
            </p>
          </div>
          <RoutineDayForm
            action={updateDayAction}
            defaultValues={dayDefaults}
            hiddenFields={{ routineDayId: day.id }}
            showDayIndex={false}
            submitLabel="Save day"
          />
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <strong style={{ display: "block", marginBottom: 6 }}>Exercises</strong>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            Edit prescriptions inline or remove exercises you no longer want in this day.
          </p>
        </div>

        {exerciseRows.length === 0 ? (
          <p style={{ margin: 0, color: "var(--muted)" }}>{t("coaching.routines.noExercises")}</p>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {exerciseRows.map((exercise) => {
              const defaults: RoutineExerciseFormValues = {
                exerciseId: exercise.exerciseId,
                sortOrder: exercise.sortOrder,
                setsText: exercise.setsText,
                repsText: exercise.repsText,
                targetWeightText: exercise.targetWeightText ?? "",
                restSeconds: exercise.restSeconds == null ? "" : String(exercise.restSeconds),
                notes: exercise.notes ?? "",
              };
              const isEditingExercise = editingExerciseId === exercise.id;

              return (
                <article
                  key={exercise.id}
                  style={{
                    display: "grid",
                    gap: 12,
                    padding: 16,
                    borderRadius: 18,
                    border: "1px solid var(--border)",
                    background: "linear-gradient(180deg, rgba(35, 41, 36, 0.98), rgba(27, 31, 28, 0.96))",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "grid", gap: 4 }}>
                      <strong>{exercise.exerciseName}</strong>
                      <span style={{ color: "var(--muted)", fontSize: 13 }}>
                        {exercise.exerciseSlug} · Sort {exercise.sortOrder}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className={buttonGhost}
                        onClick={() =>
                          setEditingExerciseId((current) => (current === exercise.id ? null : exercise.id))
                        }
                      >
                        {isEditingExercise ? "Close editor" : t("common.edit")}
                      </button>
                      <form
                        action={deleteExerciseAction}
                        onSubmit={(event) => {
                          if (!window.confirm("Delete this exercise from the day?")) {
                            event.preventDefault();
                          }
                        }}
                      >
                        <input type="hidden" name="routineExerciseId" defaultValue={exercise.id} />
                        <button type="submit" className={buttonDanger}>
                          {t("common.delete")}
                        </button>
                      </form>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: 10,
                      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    }}
                  >
                    <DetailChip label={t("coaching.routines.sets")} value={exercise.setsText} />
                    <DetailChip label={t("coaching.routines.reps")} value={exercise.repsText} />
                    <DetailChip
                      label={t("coaching.routines.weight")}
                      value={exercise.targetWeightText || t("common.notAvailable")}
                    />
                    <DetailChip
                      label={t("coaching.routines.rest")}
                      value={exercise.restSeconds == null ? t("common.notAvailable") : `${exercise.restSeconds} sec`}
                    />
                  </div>

                  {exercise.notes ? (
                    <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>{exercise.notes}</p>
                  ) : null}

                  {isEditingExercise ? (
                    <div
                      style={{
                        display: "grid",
                        gap: 14,
                        padding: 16,
                        borderRadius: 18,
                        border: "1px solid var(--border)",
                        background: "rgba(255, 255, 255, 0.025)",
                      }}
                    >
                      <RoutineExerciseForm
                        action={updateExerciseAction}
                        defaultValues={defaults}
                        exercises={exerciseOptions}
                        hiddenFields={{ routineExerciseId: exercise.id }}
                        submitLabel="Save exercise"
                      />
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gap: 14,
          padding: 18,
          borderRadius: 20,
          border: "1px solid var(--border)",
          background: "rgba(255, 255, 255, 0.025)",
        }}
      >
        <div>
          <strong style={{ display: "block", marginBottom: 6 }}>Add exercise</strong>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            Add one exercise at a time with its prescription details.
          </p>
        </div>

        <RoutineExerciseForm action={createExerciseAction} exercises={exerciseOptions} />
      </div>
    </section>
  );
}

function DetailChip({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 4,
        padding: "12px 14px",
        borderRadius: 14,
        background: "rgba(255, 255, 255, 0.035)",
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
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}
