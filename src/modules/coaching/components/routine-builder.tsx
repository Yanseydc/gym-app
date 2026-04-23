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

import { buttonGhost, buttonSecondary } from "@/lib/ui";
import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";
import { RoutineDayForm } from "@/modules/coaching/components/routine-day-form";
import { RoutineDayManager } from "@/modules/coaching/components/routine-day-manager";
import { createRoutineDay } from "@/modules/coaching/services/create-routine-day";
import { createRoutineExercise } from "@/modules/coaching/services/create-routine-exercise";
import { deleteRoutineDay } from "@/modules/coaching/services/delete-routine-day";
import { deleteRoutineExercise } from "@/modules/coaching/services/delete-routine-exercise";
import { reorderRoutineDays } from "@/modules/coaching/services/reorder-routine-days";
import { updateRoutineDay } from "@/modules/coaching/services/update-routine-day";
import { updateRoutineExercise } from "@/modules/coaching/services/update-routine-exercise";
import type {
  ClientRoutineDay,
  RoutineExerciseOption,
} from "@/modules/coaching/types";

type RoutineBuilderProps = {
  days: ClientRoutineDay[];
  exerciseOptions: RoutineExerciseOption[];
  routineId: string;
};

export function RoutineBuilder({
  days,
  exerciseOptions,
  routineId,
}: RoutineBuilderProps) {
  const { t } = useAdminText();
  const [orderedDays, setOrderedDays] = useState(days);
  const [activeDayEditorId, setActiveDayEditorId] = useState<string | null>(null);
  const [isAddingDay, setIsAddingDay] = useState(false);
  const [highlightedDayId, setHighlightedDayId] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const pendingOrderSignatureRef = useRef<string | null>(null);
  const previousDayIdsRef = useRef(days.map((day) => day.id));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    const incomingSignature = getDayOrderSignature(days);

    setOrderedDays((currentDays) => {
      const currentSignature = getDayOrderSignature(currentDays);

      if (pendingOrderSignatureRef.current) {
        if (incomingSignature === pendingOrderSignatureRef.current) {
          pendingOrderSignatureRef.current = null;
          return days;
        }

        return currentDays;
      }

      return incomingSignature === currentSignature ? currentDays : days;
    });

    const previousDayIds = previousDayIdsRef.current;
    const nextDayIds = days.map((day) => day.id);
    const createdDayId = nextDayIds.find((dayId) => !previousDayIds.includes(dayId)) ?? null;

    if (createdDayId) {
      setIsAddingDay(false);
      setHighlightedDayId(createdDayId);
      window.setTimeout(() => {
        setHighlightedDayId((current) => (current === createdDayId ? null : current));
      }, 1800);
    }

    if (activeDayEditorId && !nextDayIds.includes(activeDayEditorId)) {
      setActiveDayEditorId(null);
    }

    previousDayIdsRef.current = nextDayIds;
  }, [activeDayEditorId, days]);

  async function persistDayOrder(nextDays: ClientRoutineDay[], previousDays: ClientRoutineDay[]) {
    const changedDays = nextDays.filter((day, index) => previousDays[index]?.id !== day.id);

    if (changedDays.length === 0) {
      return;
    }

    const result = await reorderRoutineDays(
      routineId,
      nextDays.map((day) => day.id),
    );

    if (result.error) {
      pendingOrderSignatureRef.current = null;
      setOrderedDays(previousDays);
      setReorderError("No se pudo guardar el nuevo orden. Intenta nuevamente.");
      return;
    }

    setReorderError(null);
  }

  function handleDayDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = orderedDays.findIndex((day) => day.id === active.id);
    const newIndex = orderedDays.findIndex((day) => day.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const previousDays = orderedDays;
    const nextDays = arrayMove(orderedDays, oldIndex, newIndex).map((day, index) => ({
      ...day,
      dayIndex: index + 1,
    }));

    pendingOrderSignatureRef.current = getDayOrderSignature(nextDays);
    setReorderError(null);
    setOrderedDays(nextDays);

    startTransition(() => {
      void persistDayOrder(nextDays, previousDays);
    });
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
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

      {orderedDays.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDayDragEnd}>
          <SortableContext items={orderedDays.map((day) => day.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: "grid", gap: 20 }}>
              {orderedDays.map((day) => (
                <SortableDayItem key={day.id} dayId={day.id}>
                  {({ dragHandleProps }) => (
                    <RoutineDayManager
                      routineId={routineId}
                      day={day}
                      highlighted={highlightedDayId === day.id}
                      isEditingDay={activeDayEditorId === day.id}
                      onToggleEdit={() =>
                        setActiveDayEditorId((current) => (current === day.id ? null : day.id))
                      }
                      dragHandleProps={dragHandleProps}
                      exerciseOptions={exerciseOptions}
                      createExerciseAction={createRoutineExercise.bind(null, routineId, day.id)}
                      updateDayAction={updateRoutineDay.bind(null, routineId)}
                      deleteDayAction={deleteRoutineDay.bind(null, routineId)}
                      exerciseRows={day.exercises}
                      updateExerciseAction={updateRoutineExercise.bind(null, routineId)}
                      deleteExerciseAction={deleteRoutineExercise.bind(null, routineId)}
                    />
                  )}
                </SortableDayItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : null}

      <div
        style={{
          display: "grid",
          gap: 16,
          paddingTop: 20,
          borderTop: "1px solid var(--border)",
        }}
      >
        {!isAddingDay ? (
          <div>
            <button
              type="button"
              className={buttonSecondary}
              onClick={() => setIsAddingDay(true)}
            >
              + {t("coaching.routines.addDayAction")}
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
            <strong style={{ display: "block" }}>{t("coaching.routines.addDayTitle")}</strong>
            <RoutineDayForm
              action={createRoutineDay.bind(null, routineId)}
              onCancel={() => setIsAddingDay(false)}
              showDayIndex={false}
              submitLabel={t("coaching.routines.addDayAction")}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function getDayOrderSignature(days: ClientRoutineDay[]) {
  return days.map((day) => `${day.id}:${day.dayIndex}`).join("|");
}

function SortableDayItem({
  children,
  dayId,
}: {
  children: (args: { dragHandleProps: DragHandleProps }) => ReactNode;
  dayId: string;
}) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: dayId,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
    >
      {children({
        dragHandleProps: {
          ...attributes,
          ...listeners,
          className: buttonGhost,
          style: {
            cursor: isDragging ? "grabbing" : "grab",
          },
        },
      })}
    </div>
  );
}

type DragHandleProps = ComponentPropsWithoutRef<"button">;
