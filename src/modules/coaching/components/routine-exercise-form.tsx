"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { buttonGhost, buttonPrimary, input } from "@/lib/ui";
import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";
import { useRoutineExerciseForm } from "@/modules/coaching/hooks/use-routine-exercise-form";
import type {
  RoutineExerciseFormValues,
  RoutineExerciseMutationState,
  RoutineExerciseOption,
} from "@/modules/coaching/types";

type RoutineExerciseFormProps = {
  action: (
    state: RoutineExerciseMutationState,
    formData: FormData,
  ) => Promise<RoutineExerciseMutationState>;
  defaultValues?: Partial<RoutineExerciseFormValues>;
  exercises: RoutineExerciseOption[];
  hiddenFields?: Record<string, string>;
  onCancel?: (() => void) | undefined;
  onSuccess?: ((values: RoutineExerciseFormValues, result: RoutineExerciseMutationState) => void) | undefined;
  showSortOrder?: boolean;
  submitLabel?: string;
};

export function RoutineExerciseForm({
  action,
  defaultValues,
  exercises,
  hiddenFields,
  onCancel,
  onSuccess,
  showSortOrder = true,
  submitLabel = "Add exercise",
}: RoutineExerciseFormProps) {
  const { t } = useAdminText();
  const submittedValuesRef = useRef<RoutineExerciseFormValues | null>(null);
  const handledSuccessRef = useRef(false);
  const wrappedAction = useMemo(
    () => async (state: RoutineExerciseMutationState, formData: FormData) => {
      submittedValuesRef.current = {
        exerciseId: String(formData.get("exerciseId") ?? ""),
        sortOrder: Number(formData.get("sortOrder") ?? defaultValues?.sortOrder ?? 0),
        setsText: String(formData.get("setsText") ?? ""),
        repsText: String(formData.get("repsText") ?? ""),
        targetWeightText: String(formData.get("targetWeightText") ?? ""),
        restSeconds: String(formData.get("restSeconds") ?? ""),
        notes: String(formData.get("notes") ?? ""),
      };
      handledSuccessRef.current = false;
      return action(state, formData);
    },
    [action, defaultValues?.sortOrder],
  );
  const { state, formAction, pending } = useRoutineExerciseForm(wrappedAction);
  const resolvedSubmitLabel = submitLabel ?? t("coaching.routines.addExerciseAction");

  useEffect(() => {
    if (!onSuccess || pending || handledSuccessRef.current || state.error || !submittedValuesRef.current) {
      return;
    }

    handledSuccessRef.current = true;
    onSuccess(submittedValuesRef.current, state);
  }, [onSuccess, pending, state]);

  return (
    <form action={formAction} style={{ display: "grid", gap: 16 }}>
      {hiddenFields
        ? Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} defaultValue={value} />
          ))
        : null}
      <div style={gridStyles}>
        <label style={{ display: "grid", gap: 8, gridColumn: "1 / -1" }}>
          <span style={labelStyles}>{t("coaching.routines.exerciseLabel")}</span>
          <ExerciseCombobox
            exercises={exercises}
            name="exerciseId"
            defaultValue={defaultValues?.exerciseId ?? ""}
            labels={{
              placeholder: t("coaching.routines.selectExercise"),
              searchPlaceholder: t("coaching.routines.searchExercise"),
              all: t("coaching.routines.allExercises"),
              system: t("coaching.routines.systemExercises"),
              custom: t("coaching.routines.customExercises"),
              systemBadge: t("coaching.routines.systemExercise"),
              customBadge: t("coaching.routines.customExercise"),
              noResults: t("coaching.routines.noExerciseResults"),
            }}
          />
          {state.fieldErrors?.exerciseId ? (
            <FieldError message={state.fieldErrors.exerciseId} />
          ) : null}
        </label>

        {showSortOrder ? (
          <Field
            label={t("coaching.routines.sortOrder")}
            name="sortOrder"
            type="number"
            defaultValue={defaultValues?.sortOrder ? String(defaultValues.sortOrder) : ""}
            error={state.fieldErrors?.sortOrder}
          />
        ) : defaultValues?.sortOrder ? (
          <input type="hidden" name="sortOrder" defaultValue={String(defaultValues.sortOrder)} />
        ) : null}
        <Field
          label={t("coaching.routines.sets")}
          name="setsText"
          defaultValue={defaultValues?.setsText ?? ""}
          error={state.fieldErrors?.setsText}
        />
        <Field
          label={t("coaching.routines.reps")}
          name="repsText"
          defaultValue={defaultValues?.repsText ?? ""}
          error={state.fieldErrors?.repsText}
        />
        <Field
          label={t("coaching.routines.targetWeight")}
          name="targetWeightText"
          defaultValue={defaultValues?.targetWeightText ?? ""}
          error={state.fieldErrors?.targetWeightText}
        />
        <Field
          label={t("coaching.routines.restSeconds")}
          name="restSeconds"
          type="number"
          defaultValue={defaultValues?.restSeconds ?? ""}
          error={state.fieldErrors?.restSeconds}
        />
      </div>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={labelStyles}>{t("common.notes")}</span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={defaultValues?.notes ?? ""}
          className={input}
          style={{ resize: "vertical" }}
        />
        {state.fieldErrors?.notes ? <FieldError message={state.fieldErrors.notes} /> : null}
      </label>

      {state.error ? <p style={errorStyles}>{state.error}</p> : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button type="submit" disabled={pending} className={buttonPrimary} style={{ width: "fit-content" }}>
          {pending ? t("common.saving") : resolvedSubmitLabel}
        </button>
        {onCancel ? (
          <button type="button" className={buttonGhost} onClick={onCancel}>
            {t("common.cancel")}
          </button>
        ) : null}
      </div>
    </form>
  );
}

type ExerciseFilter = "all" | "system" | "gym";

function ExerciseCombobox({
  defaultValue,
  exercises,
  labels,
  name,
}: {
  defaultValue: string;
  exercises: RoutineExerciseOption[];
  labels: {
    placeholder: string;
    searchPlaceholder: string;
    all: string;
    system: string;
    custom: string;
    systemBadge: string;
    customBadge: string;
    noResults: string;
  };
  name: string;
}) {
  const listboxId = useId();
  const [selectedId, setSelectedId] = useState(defaultValue);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ExerciseFilter>("all");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedExercise = useMemo(
    () => exercises.find((exercise) => exercise.id === selectedId) ?? null,
    [exercises, selectedId],
  );

  const filteredExercises = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);

    return exercises.filter((exercise) => {
      if (filter !== "all" && exercise.source !== filter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return normalizeSearch([
        exercise.label,
        exercise.primaryMuscle,
        exercise.equipment,
        exercise.difficulty,
        exercise.source === "system" ? labels.systemBadge : labels.customBadge,
      ].filter(Boolean).join(" ")).includes(normalizedQuery);
    });
  }, [exercises, filter, labels.customBadge, labels.systemBadge, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [filter, query]);

  function selectExercise(exercise: RoutineExerciseOption) {
    setSelectedId(exercise.id);
    setQuery("");
    setIsOpen(false);
    setActiveIndex(0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => Math.min(current + 1, filteredExercises.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter" && isOpen) {
      event.preventDefault();
      const exercise = filteredExercises[activeIndex];

      if (exercise) {
        selectExercise(exercise);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
    }
  }

  return (
    <div style={{ position: "relative", display: "grid", gap: 8 }}>
      <input type="hidden" name={name} value={selectedId} />

      {selectedExercise ? (
        <div style={selectedExerciseStyles}>
          <div style={{ minWidth: 0 }}>
            <strong style={{ display: "block" }}>{selectedExercise.label}</strong>
            <span style={{ display: "block", color: "var(--muted)", fontSize: 13 }}>
              {formatExerciseMeta(selectedExercise)}
            </span>
          </div>
          <SourceBadge
            source={selectedExercise.source}
            systemLabel={labels.systemBadge}
            customLabel={labels.customBadge}
          />
        </div>
      ) : null}

      <input
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        value={query}
        className={input}
        placeholder={selectedExercise ? labels.searchPlaceholder : labels.placeholder}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
      />

      {isOpen ? (
        <div style={popoverStyles}>
          <div style={filterRowStyles}>
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
              {labels.all}
            </FilterChip>
            <FilterChip active={filter === "system"} onClick={() => setFilter("system")}>
              {labels.system}
            </FilterChip>
            <FilterChip active={filter === "gym"} onClick={() => setFilter("gym")}>
              {labels.custom}
            </FilterChip>
          </div>

          {filteredExercises.length === 0 ? (
            <p style={{ margin: 0, padding: 12, color: "var(--muted)" }}>{labels.noResults}</p>
          ) : (
            <div id={listboxId} role="listbox" style={resultListStyles}>
              {filteredExercises.map((exercise, index) => (
                <button
                  key={exercise.id}
                  type="button"
                  role="option"
                  aria-selected={exercise.id === selectedId}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectExercise(exercise)}
                  style={{
                    ...resultButtonStyles,
                    background:
                      index === activeIndex || exercise.id === selectedId
                        ? "var(--surface-alt)"
                        : "transparent",
                  }}
                >
                  <span style={{ minWidth: 0 }}>
                    <strong style={{ display: "block" }}>{exercise.label}</strong>
                    <span style={{ display: "block", color: "var(--muted)", fontSize: 13 }}>
                      {formatExerciseMeta(exercise)}
                    </span>
                  </span>
                  <SourceBadge
                    source={exercise.source}
                    systemLabel={labels.systemBadge}
                    customLabel={labels.customBadge}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({
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
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid var(--border)",
        background: active ? "var(--surface-alt)" : "transparent",
        color: active ? "var(--foreground)" : "var(--muted)",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function SourceBadge({
  customLabel,
  source,
  systemLabel,
}: {
  customLabel: string;
  source: RoutineExerciseOption["source"];
  systemLabel: string;
}) {
  return (
    <span
      style={{
        flex: "0 0 auto",
        padding: "4px 8px",
        borderRadius: 999,
        border: "1px solid var(--border)",
        color: "var(--muted)",
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {source === "system" ? systemLabel : customLabel}
    </span>
  );
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatExerciseMeta(exercise: RoutineExerciseOption) {
  return [exercise.primaryMuscle, exercise.equipment, exercise.difficulty]
    .filter(Boolean)
    .join(" · ");
}

function Field({
  defaultValue,
  error,
  label,
  name,
  type = "text",
}: {
  defaultValue?: string;
  error?: string;
  label: string;
  name: string;
  type?: string;
}) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={labelStyles}>{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} className={input} />
      {error ? <FieldError message={error} /> : null}
    </label>
  );
}

function FieldError({ message }: { message: string }) {
  return <span style={{ color: "var(--danger-fg)", fontSize: 14 }}>{message}</span>;
}

const gridStyles: CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
};

const selectedExerciseStyles: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--surface-alt)",
};

const popoverStyles: CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  zIndex: 30,
  display: "grid",
  gap: 8,
  marginTop: 6,
  padding: 8,
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  boxShadow: "0 18px 50px rgba(0, 0, 0, 0.32)",
};

const filterRowStyles: CSSProperties = {
  display: "flex",
  gap: 6,
  overflowX: "auto",
  paddingBottom: 2,
};

const resultListStyles: CSSProperties = {
  display: "grid",
  gap: 4,
  maxHeight: 280,
  overflowY: "auto",
};

const resultButtonStyles: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "10px 12px",
  border: "0",
  borderRadius: 10,
  color: "var(--foreground)",
  cursor: "pointer",
  textAlign: "left",
};

const labelStyles: CSSProperties = {
  fontWeight: 600,
};

const errorStyles: CSSProperties = {
  margin: 0,
  padding: "12px 14px",
  borderRadius: 12,
  background: "var(--danger-bg)",
  color: "var(--danger-fg)",
};
