"use client";

import type { CSSProperties } from "react";

import { useProgressCheckInForm } from "@/modules/coaching/hooks/use-progress-checkin-form";
import type {
  ProgressCheckIn,
  ProgressCheckInFormValues,
  ProgressCheckInMutationState,
  ProgressPhotoType,
} from "@/modules/coaching/types";

type ProgressCheckInFormProps = {
  action: (
    state: ProgressCheckInMutationState,
    formData: FormData,
  ) => Promise<ProgressCheckInMutationState>;
  defaultValues?: ProgressCheckInFormValues;
  existingCheckIn?: ProgressCheckIn | null;
  submitLabel: string;
};

const emptyValues: ProgressCheckInFormValues = {
  checkinDate: new Date().toISOString().slice(0, 10),
  weightKg: "",
  clientNotes: "",
  coachNotes: "",
};

const photoTypes: ProgressPhotoType[] = ["front", "side", "back"];

export function ProgressCheckInForm({
  action,
  defaultValues = emptyValues,
  existingCheckIn,
  submitLabel,
}: ProgressCheckInFormProps) {
  const { state, formAction, pending } = useProgressCheckInForm(action);

  return (
    <form action={formAction} style={{ display: "grid", gap: 20 }}>
      <div style={gridStyles}>
        <Field
          label="Check-in date"
          name="checkinDate"
          type="date"
          defaultValue={defaultValues.checkinDate}
          error={state.fieldErrors?.checkinDate}
        />
        <Field
          label="Weight (kg)"
          name="weightKg"
          type="number"
          step="0.01"
          defaultValue={defaultValues.weightKg}
          error={state.fieldErrors?.weightKg}
        />
      </div>

      <TextAreaField
        label="Client notes"
        name="clientNotes"
        rows={4}
        defaultValue={defaultValues.clientNotes}
        error={state.fieldErrors?.clientNotes}
      />
      <TextAreaField
        label="Coach notes"
        name="coachNotes"
        rows={4}
        defaultValue={defaultValues.coachNotes}
        error={state.fieldErrors?.coachNotes}
      />

      <section style={{ display: "grid", gap: 16 }}>
        <div>
          <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>Photos</h2>
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
            Upload or replace front, side and back photos. Replacements create a new storage path.
          </p>
        </div>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {photoTypes.map((photoType) => {
            const existingPhoto = existingCheckIn?.photos.find((photo) => photo.photoType === photoType) ?? null;

            return (
              <label
                key={photoType}
                style={{
                  display: "grid",
                  gap: 10,
                  padding: 16,
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                  background: "rgba(255, 255, 255, 0.03)",
                }}
              >
                <span style={labelStyles}>
                  {photoType[0].toUpperCase() + photoType.slice(1)} photo
                </span>

                {existingPhoto?.signedUrl ? (
                  <img
                    src={existingPhoto.signedUrl}
                    alt={`${photoType} progress photo`}
                    style={{
                      width: "100%",
                      aspectRatio: "3 / 4",
                      objectFit: "cover",
                      borderRadius: 14,
                      border: "1px solid var(--border)",
                      background: "var(--surface-soft)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      display: "grid",
                      placeItems: "center",
                      minHeight: 180,
                      borderRadius: 14,
                      border: "1px dashed var(--border)",
                      color: "var(--muted)",
                      background: "var(--surface-soft)",
                    }}
                  >
                    No photo uploaded
                  </div>
                )}

                <input name={`${photoType}Photo`} type="file" accept="image/*" />
              </label>
            );
          })}
        </div>
      </section>

      {state.error ? (
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: 12,
            background: "var(--danger-bg)",
            color: "var(--danger-fg)",
          }}
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        style={{
          width: "fit-content",
          border: 0,
          padding: "14px 18px",
          borderRadius: 14,
          background: "var(--accent)",
          color: "#121513",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

function Field({
  defaultValue,
  error,
  label,
  name,
  step,
  type = "text",
}: {
  defaultValue: string;
  error?: string;
  label: string;
  name: string;
  step?: string;
  type?: string;
}) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={labelStyles}>{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        style={inputStyles}
      />
      {error ? <FieldError message={error} /> : null}
    </label>
  );
}

function TextAreaField({
  defaultValue,
  error,
  label,
  name,
  rows,
}: {
  defaultValue: string;
  error?: string;
  label: string;
  name: string;
  rows: number;
}) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={labelStyles}>{label}</span>
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        style={{ ...inputStyles, resize: "vertical" }}
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

const labelStyles: CSSProperties = {
  fontWeight: 600,
};

const inputStyles: CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "var(--input)",
  font: "inherit",
};
