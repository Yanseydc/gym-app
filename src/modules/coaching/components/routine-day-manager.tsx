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
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";

import { buttonDanger, buttonGhost, buttonSecondary } from "@/lib/ui";
import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";
import { RoutineDayForm } from "@/modules/coaching/components/routine-day-form";
import { RoutineExerciseForm } from "@/modules/coaching/components/routine-exercise-form";
import { reorderRoutineExercises } from "@/modules/coaching/services/reorder-routine-exercises";
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
  highlighted?: boolean;
  isEditingDay: boolean;
  onToggleEdit: () => void;
  routineId: string;
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
  onDayDeleted: (dayId: string) => void;
  onDayUpdated: (dayId: string, values: RoutineDayFormValues) => void;
  onExercisesUpdated: (dayId: string, exercises: ClientRoutineExercise[]) => void;
};

export function RoutineDayManager({
  createExerciseAction,
  day,
  highlighted = false,
  isEditingDay,
  onToggleEdit,
  routineId,
  deleteDayAction,
  exerciseOptions,
  deleteExerciseAction,
  exerciseRows,
  updateDayAction,
  updateExerciseAction,
  dragHandleProps,
  onDayDeleted,
  onDayUpdated,
  onExercisesUpdated,
}: RoutineDayManagerProps) {
  const { t } = useAdminText();
  const router = useRouter();
  const [localDay, setLocalDay] = useState(day);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [orderedExercises, setOrderedExercises] = useState(exerciseRows);
  const [highlightedExerciseId, setHighlightedExerciseId] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [dayActionError, setDayActionError] = useState<string | null>(null);
  const [exerciseActionError, setExerciseActionError] = useState<string | null>(null);
  const pendingOrderSignatureRef = useRef<string | null>(null);
  const previousExerciseIdsRef = useRef(exerciseRows.map((exercise) => exercise.id));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const dayDefaults: RoutineDayFormValues = {
    dayIndex: localDay.dayIndex,
    title: localDay.title,
    notes: localDay.notes ?? "",
  };

  useEffect(() => {
    setLocalDay(day);
  }, [day]);

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

    const previousExerciseIds = previousExerciseIdsRef.current;
    const nextExerciseIds = exerciseRows.map((exercise) => exercise.id);
    const createdExerciseId =
      nextExerciseIds.find((exerciseId) => !previousExerciseIds.includes(exerciseId)) ?? null;

    if (createdExerciseId) {
      setIsAddingExercise(false);
      setHighlightedExerciseId(createdExerciseId);
      window.setTimeout(() => {
        setHighlightedExerciseId((current) => (current === createdExerciseId ? null : current));
      }, 1800);
    }

    previousExerciseIdsRef.current = nextExerciseIds;
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

    const result = await reorderRoutineExercises(
      routineId,
      day.id,
      nextExercises.map((exercise) => exercise.id),
    );

    if (result.error) {
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

  function highlightExercise(exerciseId: string) {
    setHighlightedExerciseId(exerciseId);
    window.setTimeout(() => {
      setHighlightedExerciseId((current) => (current === exerciseId ? null : current));
    }, 1800);
  }

  function updateExercisesLocally(
    updater: (currentExercises: ClientRoutineExercise[]) => ClientRoutineExercise[],
  ) {
    setOrderedExercises((currentExercises) => {
      const nextExercises = updater(currentExercises);
      onExercisesUpdated(day.id, nextExercises);
      return nextExercises;
    });
  }

  function getExerciseName(exerciseId: string, fallback: string) {
    return exerciseOptions.find((exercise) => exercise.id === exerciseId)?.label ?? fallback;
  }

  async function handleDeleteDay() {
    const message = orderedExercises.length > 0
      ? t("coaching.routines.deleteDayWithExercisesConfirm", { count: orderedExercises.length })
      : t("coaching.routines.deleteDayConfirm");

    if (!window.confirm(message)) {
      return;
    }

    setDayActionError(null);

    try {
      const formData = new FormData();
      formData.set("routineDayId", day.id);
      await deleteDayAction(formData);
      onDayDeleted(day.id);

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setDayActionError("No se pudo eliminar el día. Intenta nuevamente.");
    }
  }

  async function handleDeleteExercise(exerciseId: string) {
    if (!window.confirm(t("coaching.routines.deleteExerciseConfirm"))) {
      return;
    }

    setExerciseActionError(null);

    try {
      const formData = new FormData();
      formData.set("routineExerciseId", exerciseId);
      await deleteExerciseAction(formData);

      updateExercisesLocally((currentExercises) =>
        currentExercises
          .filter((exercise) => exercise.id !== exerciseId)
          .map((exercise, index) => ({
            ...exercise,
            sortOrder: index + 1,
          })),
      );
      setEditingExerciseId((current) => (current === exerciseId ? null : current));
    } catch {
      setExerciseActionError("No se pudo eliminar el ejercicio. Intenta nuevamente.");
    }
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
        boxShadow: highlighted ? "0 0 0 1px rgba(236, 140, 88, 0.28), 0 18px 34px rgba(0, 0, 0, 0.18)" : "none",
        transition: "box-shadow 180ms ease",
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
            {t("coaching.routines.day", { index: localDay.dayIndex })}
          </span>
          <h3 style={{ margin: 0, fontSize: 24, lineHeight: 1.1 }}>{localDay.title}</h3>
          {localDay.notes ? (
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>{localDay.notes}</p>
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
            onClick={() => {
              setDayActionError(null);
              onToggleEdit();
            }}
          >
            {isEditingDay ? t("coaching.routines.closeEditor") : t("common.edit")}
          </button>
          <button type="button" className={buttonDanger} onClick={() => void handleDeleteDay()}>
            {t("common.delete")}
          </button>
        </div>
      </div>

      {dayActionError ? (
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: 12,
            background: "var(--danger-bg)",
            color: "var(--danger-fg)",
          }}
        >
          {dayActionError}
        </p>
      ) : null}

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
            onCancel={onToggleEdit}
            onSuccess={(values) => {
              setLocalDay((current) => ({
                ...current,
                dayIndex: values.dayIndex || current.dayIndex,
                title: values.title,
                notes: values.notes || null,
              }));
              onDayUpdated(day.id, values);
              onToggleEdit();
            }}
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

        {exerciseActionError ? (
          <p
            style={{
              margin: 0,
              padding: "12px 14px",
              borderRadius: 12,
              background: "var(--danger-bg)",
              color: "var(--danger-fg)",
            }}
          >
            {exerciseActionError}
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
                            outline: highlightedExerciseId === exercise.id ? "1px solid rgba(236, 140, 88, 0.38)" : "none",
                            transition: "outline-color 180ms ease",
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
                                onClick={() => {
                                  setExerciseActionError(null);
                                  setEditingExerciseId((current) => (current === exercise.id ? null : exercise.id));
                                }}
                              >
                                {isEditingExercise ? t("coaching.routines.closeEditor") : t("common.edit")}
                              </button>
                              <button
                                type="button"
                                className={buttonDanger}
                                onClick={() => void handleDeleteExercise(exercise.id)}
                              >
                                {t("common.delete")}
                              </button>
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
                                onCancel={() => setEditingExerciseId(null)}
                                onSuccess={(values) => {
                                  setExerciseActionError(null);
                                  updateExercisesLocally((currentExercises) =>
                                    currentExercises.map((currentExercise) =>
                                      currentExercise.id === exercise.id
                                        ? {
                                            ...currentExercise,
                                            exerciseId: values.exerciseId,
                                            exerciseName: getExerciseName(values.exerciseId, currentExercise.exerciseName),
                                            sortOrder: values.sortOrder || currentExercise.sortOrder,
                                            setsText: values.setsText,
                                            repsText: values.repsText,
                                            targetWeightText: values.targetWeightText || null,
                                            restSeconds: values.restSeconds ? Number(values.restSeconds) : null,
                                            notes: values.notes || null,
                                          }
                                        : currentExercise,
                                    ),
                                  );
                                  setEditingExerciseId(null);
                                }}
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
              + {t("coaching.routines.addExerciseAction")}
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
              onCancel={() => setIsAddingExercise(false)}
              onSuccess={(values) => {
                const tempExerciseId = `temp-exercise-${Date.now()}`;

                setExerciseActionError(null);
                updateExercisesLocally((currentExercises) => [
                  ...currentExercises,
                  {
                    id: tempExerciseId,
                    exerciseId: values.exerciseId,
                    exerciseName: getExerciseName(values.exerciseId, t("coaching.routines.exerciseLabel")),
                    exerciseSlug: "",
                    videoUrl: null,
                    thumbnailUrl: null,
                    instructions: null,
                    coachTips: null,
                    commonMistakes: null,
                    media: [],
                    sortOrder: currentExercises.length + 1,
                    setsText: values.setsText,
                    repsText: values.repsText,
                    targetWeightText: values.targetWeightText || null,
                    restSeconds: values.restSeconds ? Number(values.restSeconds) : null,
                    notes: values.notes || null,
                    createdAt: new Date().toISOString(),
                  },
                ]);
                setIsAddingExercise(false);
                highlightExercise(tempExerciseId);

                startTransition(() => {
                  router.refresh();
                });
              }}
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
