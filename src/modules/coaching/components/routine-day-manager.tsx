"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { startTransition, useEffect, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";

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
  dragHandleProps?: DragHandleProps;
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
  dragHandleProps,
}: RoutineDayManagerProps) {
  const { t } = useAdminText();
  const [isEditingDay, setIsEditingDay] = useState(false);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [orderedExercises, setOrderedExercises] = useState(exerciseRows);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const pendingOrderSignatureRef = useRef<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const dayDefaults: RoutineDayFormValues = {
    dayIndex: day.dayIndex,
    title: day.title,
    notes: day.notes ?? "",
  };

  useEffect(() => {
    const incomingSignature = getExerciseOrderSignature(exerciseRows);

    setOrderedExercises((currentExercises) => {
      const currentSignature = getExerciseOrderSignature(currentExercises);

      if (pendingOrderSignatureRef.current) {
        if (incomingSignature === pendingOrderSignatureRef.current) {
          pendingOrderSignatureRef.current = null;
          return exerciseRows;
        }

        return currentExercises;
      }

      return incomingSignature === currentSignature ? currentExercises : exerciseRows;
    });
  }, [exerciseRows]);

  async function persistExerciseOrder(
    nextExercises: ClientRoutineExercise[],
    previousExercises: ClientRoutineExercise[],
  ) {
    const changedExercises = nextExercises.filter(
      (exercise, index) => previousExercises[index]?.id !== exercise.id,
    );

    if (changedExercises.length === 0) {
      return;
    }

    const results = await Promise.all(
      changedExercises.map((exercise) => {
        const nextIndex = nextExercises.findIndex((candidate) => candidate.id === exercise.id) + 1;
        const formData = new FormData();
        formData.set("routineExerciseId", exercise.id);
        formData.set("exerciseId", exercise.exerciseId);
        formData.set("sortOrder", String(nextIndex));
        formData.set("setsText", exercise.setsText);
        formData.set("repsText", exercise.repsText);
        formData.set("targetWeightText", exercise.targetWeightText ?? "");
        formData.set("restSeconds", exercise.restSeconds == null ? "" : String(exercise.restSeconds));
        formData.set("notes", exercise.notes ?? "");
        return updateExerciseAction({}, formData);
      }),
    );

    if (results.some((result) => result.error)) {
      pendingOrderSignatureRef.current = null;
      setOrderedExercises(previousExercises);
      setReorderError("No se pudo guardar el nuevo orden de ejercicios. Intenta nuevamente.");
      return;
    }

    setReorderError(null);
  }

  function handleExerciseDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = orderedExercises.findIndex((exercise) => exercise.id === active.id);
    const newIndex = orderedExercises.findIndex((exercise) => exercise.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const previousExercises = orderedExercises;
    const nextExercises = arrayMove(orderedExercises, oldIndex, newIndex).map((exercise, index) => ({
      ...exercise,
      sortOrder: index + 1,
    }));

    pendingOrderSignatureRef.current = getExerciseOrderSignature(nextExercises);
    setReorderError(null);
    setOrderedExercises(nextExercises);

    startTransition(() => {
      void persistExerciseOrder(nextExercises, previousExercises);
    });
  }

  return (
    <section
      style={{
        display: "grid",
        gap: 20,
        padding: 22,
        borderRadius: 24,
        border: "1px solid var(--border)",
        background: "linear-gradient(180deg, rgba(27, 31, 28, 0.98), rgba(22, 26, 23, 0.98))",
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
          <span
            style={{
              color: "var(--accent-strong)",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {t("coaching.routines.day", { index: day.dayIndex })}
          </span>
          <h3 style={{ margin: 0, fontSize: 24, lineHeight: 1.1 }}>{day.title}</h3>
          {day.notes ? (
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>{day.notes}</p>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {dragHandleProps ? (
            <button type="button" {...dragHandleProps} aria-label={t("common.actions")}>
              ⋮⋮
            </button>
          ) : null}
          <button
            type="button"
            className={buttonSecondary}
            onClick={() => setIsEditingDay((current) => !current)}
          >
            {isEditingDay ? t("coaching.routines.closeEditor") : t("common.edit")}
          </button>
          <form
            action={deleteDayAction}
            onSubmit={(event) => {
              const message = day.exercises.length > 0
                ? t("coaching.routines.deleteDayWithExercisesConfirm", { count: day.exercises.length })
                : t("coaching.routines.deleteDayConfirm");

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
            padding: 16,
            borderRadius: 20,
            border: "1px solid var(--border)",
            background: "rgba(255, 255, 255, 0.025)",
          }}
        >
          <RoutineDayForm
            action={updateDayAction}
            defaultValues={dayDefaults}
            hiddenFields={{ routineDayId: day.id }}
            showDayIndex={false}
            submitLabel={t("coaching.routines.saveDay")}
          />
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 14 }}>
        <strong style={{ display: "block" }}>{t("coaching.routines.exercisesTitle")}</strong>

        {reorderError ? (
          <p
            style={{
              margin: 0,
              padding: "12px 14px",
              borderRadius: 12,
              background: "var(--danger-bg)",
              color: "var(--danger-fg)",
            }}
          >
            {reorderError}
          </p>
        ) : null}

        {orderedExercises.length === 0 ? (
          <p style={{ margin: 0, color: "var(--muted)" }}>{t("coaching.routines.noExercises")}</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleExerciseDragEnd}>
            <SortableContext
              items={orderedExercises.map((exercise) => exercise.id)}
              strategy={verticalListSortingStrategy}
            >
              <div style={{ display: "grid", gap: 10 }}>
                {orderedExercises.map((exercise) => {
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
                    <SortableExerciseItem key={exercise.id} exerciseId={exercise.id}>
                      {({ dragHandleProps: exerciseDragHandleProps, isDragging }) => (
                        <article
                          style={{
                            display: "grid",
                            gap: 10,
                            padding: 14,
                            borderRadius: 18,
                            border: "1px solid rgba(255, 255, 255, 0.06)",
                            background: "rgba(255, 255, 255, 0.025)",
                            boxShadow: isDragging ? "0 14px 28px rgba(0, 0, 0, 0.2)" : "none",
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
                            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                              <button type="button" {...exerciseDragHandleProps} aria-label={t("common.actions")}>
                                ⋮⋮
                              </button>
                              <div style={{ display: "grid", gap: 4 }}>
                                <strong style={{ fontSize: 16 }}>{exercise.exerciseName}</strong>
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button
                                type="button"
                                className={buttonGhost}
                                onClick={() =>
                                  setEditingExerciseId((current) => (current === exercise.id ? null : exercise.id))
                                }
                              >
                                {isEditingExercise ? t("coaching.routines.closeEditor") : t("common.edit")}
                              </button>
                              <form
                                action={deleteExerciseAction}
                                onSubmit={(event) => {
                                  if (!window.confirm(t("coaching.routines.deleteExerciseConfirm"))) {
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
                              gap: 8,
                              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
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
                              value={exercise.restSeconds == null ? t("common.notAvailable") : `${exercise.restSeconds} ${t("coaching.routines.secondsShort")}`}
                            />
                          </div>

                          {exercise.notes ? (
                            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>{exercise.notes}</p>
                          ) : null}

                          {isEditingExercise ? (
                            <div
                              style={{
                                display: "grid",
                                gap: 12,
                                padding: 16,
                                borderRadius: 18,
                                border: "1px solid rgba(255, 255, 255, 0.06)",
                                background: "rgba(255, 255, 255, 0.02)",
                              }}
                            >
                              <RoutineExerciseForm
                                action={updateExerciseAction}
                                defaultValues={defaults}
                                exercises={exerciseOptions}
                                hiddenFields={{ routineExerciseId: exercise.id }}
                                showSortOrder={false}
                                submitLabel={t("coaching.routines.saveExercise")}
                              />
                            </div>
                          ) : null}
                        </article>
                      )}
                    </SortableExerciseItem>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gap: 14,
          paddingTop: 14,
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        {!isAddingExercise ? (
          <div>
            <button
              type="button"
              className={buttonSecondary}
              onClick={() => setIsAddingExercise(true)}
            >
              {t("coaching.routines.addExerciseAction")}
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 12,
              padding: 16,
              borderRadius: 18,
              border: "1px solid rgba(255, 255, 255, 0.06)",
              background: "rgba(255, 255, 255, 0.02)",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <strong style={{ display: "block" }}>{t("coaching.routines.addExerciseTitle")}</strong>
              <button
                type="button"
                className={buttonGhost}
                onClick={() => setIsAddingExercise(false)}
              >
                {t("coaching.routines.closeEditor")}
              </button>
            </div>

            <RoutineExerciseForm
              action={createExerciseAction}
              exercises={exerciseOptions}
              showSortOrder={false}
              submitLabel={t("coaching.routines.addExerciseAction")}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function getExerciseOrderSignature(exercises: ClientRoutineExercise[]) {
  return exercises.map((exercise) => `${exercise.id}:${exercise.sortOrder}`).join("|");
}

function SortableExerciseItem({
  children,
  exerciseId,
}: {
  children: (args: { dragHandleProps: DragHandleProps; isDragging: boolean }) => ReactNode;
  exerciseId: string;
}) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: exerciseId,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.65 : 1,
      }}
    >
      {children({
        dragHandleProps: {
          ...attributes,
          ...listeners,
          className: buttonGhost,
          style: { cursor: isDragging ? "grabbing" : "grab" },
        },
        isDragging,
      })}
    </div>
  );
}

type DragHandleProps = ComponentPropsWithoutRef<"button">;

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
