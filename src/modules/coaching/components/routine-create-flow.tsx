"use client";

import { useActionState, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";

import { buttonGhost, buttonPrimary, buttonSecondary, input } from "@/lib/ui";
import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";
import { RoutineForm } from "@/modules/coaching/components/routine-form";
import { parseRoutineText, matchExerciseByName } from "@/modules/coaching/utils/routine-text-import";
import type {
  RoutineClientOption,
  RoutineExerciseOption,
  RoutineFormValues,
  RoutineMutationState,
  RoutineTextImportDay,
  RoutineTextImportMutationState,
  RoutineTextImportValues,
} from "@/modules/coaching/types";

type RoutineCreateFlowProps = {
  createAction: (
    state: RoutineMutationState,
    formData: FormData,
  ) => Promise<RoutineMutationState>;
  importAction: (
    state: RoutineTextImportMutationState,
    formData: FormData,
  ) => Promise<RoutineTextImportMutationState>;
  clients: RoutineClientOption[];
  defaultValues: RoutineFormValues;
  exercises: RoutineExerciseOption[];
  lockClient?: boolean;
};

const initialImportState: RoutineTextImportMutationState = {
  error: undefined,
  fieldErrors: {},
};

const exampleText = `Rutina: Fuerza tren superior
Día 1: Empuje
Press banca | 4x8 | descanso 90s | notas: Controlar la bajada
Press militar | 3x10 | descanso 75s | notas: Mantener core firme
Día 2: Jalón
Remo con barra | 4x8 | descanso 90s | notas: Pausa arriba`;

export function RoutineCreateFlow({
  createAction,
  importAction,
  clients,
  defaultValues,
  exercises,
  lockClient = false,
}: RoutineCreateFlowProps) {
  const { t } = useAdminText();
  const [mode, setMode] = useState<"manual" | "import">("manual");

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div
        aria-label={t("coaching.createPage.creationMode")}
        style={{
          display: "inline-flex",
          gap: 4,
          width: "fit-content",
          maxWidth: "100%",
          padding: 4,
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          overflowX: "auto",
        }}
      >
        <ModeButton active={mode === "manual"} onClick={() => setMode("manual")}>
          {t("coaching.createPage.manualMode")}
        </ModeButton>
        <ModeButton active={mode === "import"} onClick={() => setMode("import")}>
          {t("coaching.createPage.importFromText")}
        </ModeButton>
      </div>

      {mode === "manual" ? (
        <RoutineForm
          action={createAction}
          clients={clients}
          defaultValues={defaultValues}
          submitLabel={t("clients.detail.createRoutine")}
          lockClient={lockClient}
        />
      ) : (
        <RoutineTextImportForm
          action={importAction}
          clients={clients}
          defaultValues={defaultValues}
          exercises={exercises}
          lockClient={lockClient}
        />
      )}
    </div>
  );
}

function RoutineTextImportForm({
  action,
  clients,
  defaultValues,
  exercises,
  lockClient,
}: {
  action: (
    state: RoutineTextImportMutationState,
    formData: FormData,
  ) => Promise<RoutineTextImportMutationState>;
  clients: RoutineClientOption[];
  defaultValues: RoutineFormValues;
  exercises: RoutineExerciseOption[];
  lockClient?: boolean;
}) {
  const { t } = useAdminText();
  const [state, formAction, pending] = useActionState(action, initialImportState);
  const [routineText, setRoutineText] = useState("");
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [values, setValues] = useState<RoutineTextImportValues>({
    ...defaultValues,
    days: [],
  });

  const unresolvedCount = useMemo(
    () => values.days.reduce(
      (count, day) => count + day.exercises.filter((exercise) => !exercise.exerciseId).length,
      0,
    ),
    [values.days],
  );
  const payload = JSON.stringify(values);
  const canSave = values.days.length > 0 && unresolvedCount === 0;

  function parseText() {
    const result = parseRoutineText(routineText, exercises, {
      emptyText: t("coaching.createPage.importEmptyText"),
      missingRoutineTitle: t("coaching.createPage.importMissingRoutineTitle"),
      missingDays: t("coaching.createPage.importMissingDays"),
      exerciseOutsideDay: t("coaching.createPage.importExerciseOutsideDay"),
      invalidExerciseLine: t("coaching.createPage.importInvalidExerciseLine"),
      dayWithoutExercises: t("coaching.createPage.importDayWithoutExercises"),
    });

    setParseErrors(result.errors);

    const parsedData = result.data;

    if (!parsedData) {
      return;
    }

    setValues((current) => ({
      ...current,
      title: parsedData.title,
      days: parsedData.days,
    }));
  }

  function updateExercise(dayIndex: number, exerciseIndex: number, patch: Partial<RoutineTextImportDay["exercises"][number]>) {
    setValues((current) => ({
      ...current,
      days: current.days.map((day, currentDayIndex) => {
        if (currentDayIndex !== dayIndex) {
          return day;
        }

        return {
          ...day,
          exercises: day.exercises.map((exercise, currentExerciseIndex) => (
            currentExerciseIndex === exerciseIndex ? { ...exercise, ...patch } : exercise
          )),
        };
      }),
    }));
  }

  function updateExerciseName(dayIndex: number, exerciseIndex: number, exerciseName: string) {
    const matchedExercise = matchExerciseByName(exerciseName, exercises);
    updateExercise(dayIndex, exerciseIndex, {
      exerciseName,
      exerciseId: matchedExercise?.id ?? "",
    });
  }

  return (
    <form action={formAction} style={{ display: "grid", gap: 20 }}>
      <input type="hidden" name="payload" value={payload} />

      <div
        style={{
          display: "grid",
          gap: 6,
          paddingBottom: 6,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <strong style={{ fontSize: 18 }}>{t("coaching.createPage.importFromText")}</strong>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          {t("coaching.createPage.importDescription")}
        </p>
      </div>

      <div style={gridStyles}>
        {!lockClient ? (
          <label style={{ display: "grid", gap: 8 }}>
            <span style={labelStyles}>{t("payments.form.client")}</span>
            <select
              value={values.clientId}
              onChange={(event) => setValues((current) => ({ ...current, clientId: event.target.value }))}
              className={input}
            >
              <option value="">{t("payments.form.selectClient")}</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.label}
                </option>
              ))}
            </select>
            {state.fieldErrors?.clientId ? <FieldError message={state.fieldErrors.clientId} /> : null}
          </label>
        ) : null}

        <Field
          label={t("common.title")}
          value={values.title}
          onChange={(title) => setValues((current) => ({ ...current, title }))}
          error={state.fieldErrors?.title}
        />

        <label style={{ display: "grid", gap: 8 }}>
          <span style={labelStyles}>{t("clients.form.status")}</span>
          <select
            value={values.status}
            onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as RoutineFormValues["status"] }))}
            className={input}
          >
            <option value="draft">{t("common.status.draft")}</option>
            <option value="active">{t("common.status.active")}</option>
            <option value="archived">{t("common.status.archived")}</option>
          </select>
          {state.fieldErrors?.status ? <FieldError message={state.fieldErrors.status} /> : null}
        </label>

        <Field
          label={t("coaching.routines.startsOn")}
          type="date"
          value={values.startsOn}
          onChange={(startsOn) => setValues((current) => ({ ...current, startsOn }))}
          error={state.fieldErrors?.startsOn}
        />

        <Field
          label={t("coaching.routines.endsOn")}
          type="date"
          value={values.endsOn}
          onChange={(endsOn) => setValues((current) => ({ ...current, endsOn }))}
          error={state.fieldErrors?.endsOn}
        />
      </div>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={labelStyles}>{t("coaching.createPage.routineText")}</span>
        <textarea
          value={routineText}
          onChange={(event) => setRoutineText(event.target.value)}
          rows={9}
          className={input}
          placeholder={exampleText}
          style={{ resize: "vertical", fontFamily: "var(--font-mono, monospace)" }}
        />
      </label>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" className={buttonSecondary} onClick={parseText}>
          {t("coaching.createPage.previewImport")}
        </button>
        {values.days.length > 0 ? (
          <span style={{ color: "var(--muted)", fontSize: 14 }}>
            {t("coaching.createPage.previewSummary", {
              days: values.days.length,
              exercises: values.days.reduce((count, day) => count + day.exercises.length, 0),
            })}
          </span>
        ) : null}
      </div>

      {parseErrors.length > 0 ? (
        <div style={errorBoxStyles}>
          <strong>{t("coaching.createPage.importCouldNotParse")}</strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {parseErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {values.days.length > 0 ? (
        <section style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 4 }}>
            <strong style={{ fontSize: 18 }}>{t("coaching.createPage.importPreview")}</strong>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
              {unresolvedCount > 0
                ? t("coaching.createPage.resolveMissingExercises", { count: unresolvedCount })
                : t("coaching.createPage.importReady")}
            </p>
          </div>

          {values.days.map((day, dayIndex) => (
            <article key={`${day.dayIndex}-${dayIndex}`} style={cardStyles}>
              <div style={{ display: "grid", gap: 8 }}>
                <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>
                  {t("coaching.routines.day", { index: day.dayIndex })}
                </span>
                <Field
                  label={t("common.title")}
                  value={day.title}
                  onChange={(title) => setValues((current) => ({
                    ...current,
                    days: current.days.map((currentDay, currentDayIndex) => (
                      currentDayIndex === dayIndex ? { ...currentDay, title } : currentDay
                    )),
                  }))}
                />
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {day.exercises.map((exercise, exerciseIndex) => (
                  <div
                    key={`${exercise.exerciseName}-${exerciseIndex}`}
                    style={{
                      display: "grid",
                      gap: 12,
                      padding: 12,
                      borderRadius: 14,
                      border: "1px solid var(--border)",
                      background: "rgba(255,255,255,0.025)",
                    }}
                  >
                    <div style={exerciseGridStyles}>
                      <Field
                        label={t("coaching.routines.exerciseLabel")}
                        value={exercise.exerciseName}
                        onChange={(exerciseName) => updateExerciseName(dayIndex, exerciseIndex, exerciseName)}
                      />
                      <label style={{ display: "grid", gap: 8 }}>
                        <span style={labelStyles}>{t("coaching.createPage.exerciseMatch")}</span>
                        <select
                          value={exercise.exerciseId}
                          onChange={(event) => updateExercise(dayIndex, exerciseIndex, { exerciseId: event.target.value })}
                          className={input}
                        >
                          <option value="">{t("coaching.createPage.notFound")}</option>
                          {exercises.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Field
                        label={t("coaching.routines.sets")}
                        value={exercise.setsText}
                        onChange={(setsText) => updateExercise(dayIndex, exerciseIndex, { setsText })}
                      />
                      <Field
                        label={t("coaching.routines.reps")}
                        value={exercise.repsText}
                        onChange={(repsText) => updateExercise(dayIndex, exerciseIndex, { repsText })}
                      />
                      <Field
                        label={t("coaching.createPage.restSeconds")}
                        type="number"
                        value={exercise.restSeconds}
                        onChange={(restSeconds) => updateExercise(dayIndex, exerciseIndex, { restSeconds })}
                      />
                    </div>

                    {!exercise.exerciseId ? (
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={missingBadgeStyles}>{t("coaching.createPage.notFound")}</span>
                        <Link href="/dashboard/coaching/exercises/new" className={buttonGhost}>
                          {t("coaching.createPage.createExerciseLater")}
                        </Link>
                      </div>
                    ) : null}

                    <label style={{ display: "grid", gap: 8 }}>
                      <span style={labelStyles}>{t("common.notes")}</span>
                      <textarea
                        value={exercise.notes}
                        onChange={(event) => updateExercise(dayIndex, exerciseIndex, { notes: event.target.value })}
                        rows={2}
                        className={input}
                        style={{ resize: "vertical" }}
                      />
                    </label>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {state.error ? <p style={errorBoxStyles}>{state.error}</p> : null}
      {state.fieldErrors?.days ? <p style={errorBoxStyles}>{state.fieldErrors.days}</p> : null}

      <button
        type="submit"
        disabled={pending || !canSave}
        className={buttonPrimary}
        style={{ width: "fit-content" }}
      >
        {pending ? t("common.saving") : t("coaching.createPage.confirmImport")}
      </button>
    </form>
  );
}

function ModeButton({
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
        border: "none",
        borderRadius: 8,
        padding: "8px 12px",
        color: active ? "var(--background)" : "var(--foreground)",
        background: active ? "var(--primary)" : "transparent",
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function Field({
  error,
  label,
  onChange,
  type = "text",
  value,
}: {
  error?: string;
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={labelStyles}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={input}
      />
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
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
};

const exerciseGridStyles: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
};

const labelStyles: CSSProperties = {
  fontWeight: 600,
};

const cardStyles: CSSProperties = {
  display: "grid",
  gap: 14,
  padding: 16,
  borderRadius: 18,
  border: "1px solid var(--border)",
  background: "var(--surface)",
};

const errorBoxStyles: CSSProperties = {
  margin: 0,
  padding: "12px 14px",
  borderRadius: 12,
  background: "var(--danger-bg)",
  color: "var(--danger-fg)",
};

const missingBadgeStyles: CSSProperties = {
  display: "inline-flex",
  width: "fit-content",
  borderRadius: 999,
  padding: "4px 8px",
  background: "var(--danger-bg)",
  color: "var(--danger-fg)",
  fontSize: 12,
  fontWeight: 700,
};
