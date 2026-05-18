"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";

import {
  buttonDanger,
  buttonSecondary,
  infoRow,
  metaChip,
  statusInactive,
  statusNeutral,
  statusSuccess,
} from "@/lib/ui";
import { deactivateExercise } from "@/modules/coaching/services/deactivate-exercise";
import { duplicateExercise } from "@/modules/coaching/services/duplicate-exercise";
import type { ExerciseLibraryItem } from "@/modules/coaching/types";

type ExerciseFilter = "all" | "system" | "gym";

type ExerciseListText = {
  noExercises: string;
  systemExercise: string;
  gymExercise: string;
  duplicateExercise: string;
  allExercises: string;
  systemExercises: string;
  customExercises: string;
  duplicateDialogTitle: string;
  duplicateDialogMessage: string;
  createCopy: string;
  deactivateExercise: string;
  deactivateDialogTitle: string;
  deactivateDialogMessage: string;
  cancel: string;
  edit: string;
  active: string;
  inactive: string;
  noPrimaryMuscle: string;
  noEquipment: string;
  noDifficulty: string;
};

type ExerciseListClientProps = {
  exercises: ExerciseLibraryItem[];
  text: ExerciseListText;
};

type PendingAction =
  | { type: "duplicate"; exercise: ExerciseLibraryItem }
  | { type: "deactivate"; exercise: ExerciseLibraryItem }
  | null;

export function ExerciseListClient({ exercises, text }: ExerciseListClientProps) {
  const [filter, setFilter] = useState<ExerciseFilter>("all");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isPending, startTransition] = useTransition();

  const filteredExercises = useMemo(() => {
    if (filter === "all") {
      return exercises;
    }

    return exercises.filter((exercise) => exercise.source === filter);
  }, [exercises, filter]);

  function confirmAction() {
    if (!pendingAction) {
      return;
    }

    const action = pendingAction;

    startTransition(async () => {
      if (action.type === "duplicate") {
        await duplicateExercise(action.exercise.id);
        return;
      }

      await deactivateExercise(action.exercise.id);
      setPendingAction(null);
    });
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div
        aria-label="Filtrar ejercicios"
        style={{
          display: "inline-flex",
          gap: 4,
          width: "fit-content",
          maxWidth: "100%",
          padding: 4,
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--surface-row)",
          overflowX: "auto",
        }}
      >
        <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
          {text.allExercises}
        </FilterButton>
        <FilterButton active={filter === "system"} onClick={() => setFilter("system")}>
          {text.systemExercises}
        </FilterButton>
        <FilterButton active={filter === "gym"} onClick={() => setFilter("gym")}>
          {text.customExercises}
        </FilterButton>
      </div>

      {filteredExercises.length === 0 ? (
        <article
          className={infoRow}
          style={{
            padding: 14,
            borderRadius: 12,
            color: "var(--muted)",
          }}
        >
          {text.noExercises}
        </article>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filteredExercises.map((exercise) => (
            <article
              key={exercise.id}
              className={infoRow}
              style={{
                display: "grid",
                gap: 9,
                padding: "12px 14px",
                borderRadius: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ display: "grid", gap: 6, minWidth: 0, flex: "1 1 320px" }}>
                  <strong style={{ fontSize: 16 }}>{exercise.name}</strong>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <SourcePill
                      source={exercise.source}
                      systemLabel={text.systemExercise}
                      gymLabel={text.gymExercise}
                    />
                    <StatusPill
                      isActive={exercise.isActive}
                      activeLabel={text.active}
                      inactiveLabel={text.inactive}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                  }}
                >
                  {exercise.canEdit ? (
                    <Link href={`/dashboard/coaching/exercises/${exercise.id}/edit`} className={buttonSecondary}>
                      {text.edit}
                    </Link>
                  ) : null}
                  {exercise.canDuplicate ? (
                    <button
                      type="button"
                      className={buttonSecondary}
                      onClick={() => setPendingAction({ type: "duplicate", exercise })}
                    >
                      {text.duplicateExercise}
                    </button>
                  ) : null}
                  {exercise.canDeactivate ? (
                    <button
                      type="button"
                      className={buttonDanger}
                      onClick={() => setPendingAction({ type: "deactivate", exercise })}
                    >
                      {text.deactivateExercise}
                    </button>
                  ) : null}
                </div>
              </div>

              <div style={{ color: "var(--muted)", display: "flex", gap: 6, flexWrap: "wrap" }}>
                <MetaChip value={exercise.primaryMuscle || text.noPrimaryMuscle} />
                <MetaChip value={exercise.equipment || text.noEquipment} />
                <MetaChip value={exercise.difficulty || text.noDifficulty} />
              </div>

              {exercise.description ? (
                <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5, fontSize: 14 }}>
                  {exercise.description}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}

      {pendingAction ? (
        <ConfirmDialog
          title={
            pendingAction.type === "duplicate"
              ? text.duplicateDialogTitle
              : text.deactivateDialogTitle
          }
          message={
            pendingAction.type === "duplicate"
              ? text.duplicateDialogMessage
              : text.deactivateDialogMessage
          }
          cancelLabel={text.cancel}
          confirmLabel={pendingAction.type === "duplicate" ? text.createCopy : text.deactivateExercise}
          destructive={pendingAction.type === "deactivate"}
          disabled={isPending}
          onCancel={() => setPendingAction(null)}
          onConfirm={confirmAction}
        />
      ) : null}
    </div>
  );
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        padding: "8px 12px",
        borderRadius: 10,
        border: "0",
        background: active ? "var(--surface-interactive)" : "transparent",
        color: active ? "var(--foreground)" : "var(--muted)",
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function ConfirmDialog({
  title,
  message,
  cancelLabel,
  confirmLabel,
  destructive,
  disabled,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  destructive: boolean;
  disabled: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exercise-action-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "grid",
        placeItems: "center",
        padding: 20,
        background: "rgba(0, 0, 0, 0.58)",
      }}
    >
      <div
        style={{
          width: "min(100%, 420px)",
          padding: 20,
          borderRadius: 16,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          boxShadow: "0 22px 70px rgba(0, 0, 0, 0.45)",
        }}
      >
        <h2 id="exercise-action-title" style={{ margin: "0 0 8px", fontSize: 20 }}>
          {title}
        </h2>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>{message}</p>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 20,
          }}
        >
          <button type="button" className={buttonSecondary} onClick={onCancel} disabled={disabled}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={destructive ? buttonDanger : buttonSecondary}
            onClick={onConfirm}
            disabled={disabled}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function SourcePill({
  source,
  systemLabel,
  gymLabel,
}: {
  source: ExerciseLibraryItem["source"];
  systemLabel: string;
  gymLabel: string;
}) {
  return (
    <span className={source === "system" ? statusNeutral : metaChip}>
      {source === "system" ? systemLabel : gymLabel}
    </span>
  );
}

function MetaChip({ value }: { value: string }) {
  return <span className={metaChip}>{value}</span>;
}

function StatusPill({
  isActive,
  activeLabel,
  inactiveLabel,
}: {
  isActive: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <span className={isActive ? statusSuccess : statusInactive}>
      {isActive ? activeLabel : inactiveLabel}
    </span>
  );
}
