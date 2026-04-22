"use client";

import type { CSSProperties } from "react";

import { buttonPrimary, fileInput, input } from "@/lib/ui";
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
      <div
        style={{
          display: "grid",
          gap: 6,
          paddingBottom: 6,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <strong style={{ fontSize: 18 }}>Check-in details</strong>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          Save body metrics, coaching notes and a clean three-angle photo snapshot in one place.
        </p>
      </div>

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

        <div className="coaching-photo-grid">
          {photoTypes.map((photoType) => {
            const existingPhoto = existingCheckIn?.photos.find((photo) => photo.photoType === photoType) ?? null;

            return (
              <section
                key={photoType}
                style={{
                  display: "grid",
                  gap: 12,
                  padding: 16,
                  borderRadius: 18,
                  border: "1px solid var(--border)",
                  background: "rgba(255, 255, 255, 0.03)",
                }}
              >
                <div style={{ display: "grid", gap: 4 }}>
                  <span style={labelStyles}>
                    {photoType[0].toUpperCase() + photoType.slice(1)} photo
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5 }}>
                    {existingPhoto ? "Upload a new file to replace the current image." : "Add a clear image for this angle."}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    placeItems: "center",
                    minHeight: 260,
                    borderRadius: 16,
                    border: existingPhoto ? "1px solid var(--border)" : "1px dashed var(--border)",
                    background: "linear-gradient(180deg, rgba(20, 24, 21, 0.96), rgba(15, 18, 16, 0.92))",
                    overflow: "hidden",
                  }}
                >
                  {existingPhoto?.signedUrl ? (
                    <img
                      src={existingPhoto.signedUrl}
                      alt={`${photoType} progress photo`}
                      style={{
                        width: "100%",
                        height: "100%",
                        aspectRatio: "3 / 4",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gap: 8,
                        placeItems: "center",
                        padding: 18,
                        textAlign: "center",
                        color: "var(--muted)",
                      }}
                    >
                      <strong style={{ color: "var(--foreground)" }}>No photo uploaded</strong>
                      <span style={{ maxWidth: 220, lineHeight: 1.5 }}>
                        Use a vertical image with the subject centered for a clean comparison later.
                      </span>
                    </div>
                  )}
                </div>

                <label
                  style={{
                    display: "grid",
                    gap: 8,
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    background: "rgba(255, 255, 255, 0.02)",
                  }}
                >
                  <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Upload file
                  </span>
                  <input name={`${photoType}Photo`} type="file" accept="image/*" className={fileInput} />
                </label>
              </section>
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
        className={buttonPrimary}
        style={{ width: "fit-content" }}
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
        className={input}
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
        className={input}
        style={{ resize: "vertical" }}
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
