"use client";

import { useActionState, useMemo, useState } from "react";

import { buttonDanger, buttonPrimary, buttonSecondary, input } from "@/lib/ui";
import type {
  ExerciseMediaItem,
  ExerciseMediaMutationState,
} from "@/modules/coaching/types";

type ExerciseGalleryManagerProps = {
  createAction: (
    state: ExerciseMediaMutationState,
    formData: FormData,
  ) => Promise<ExerciseMediaMutationState>;
  deleteAction: (formData: FormData) => void | Promise<void>;
  items: ExerciseMediaItem[];
  updateActionFactory: (
    mediaId: string,
  ) => (
    state: ExerciseMediaMutationState,
    formData: FormData,
  ) => Promise<ExerciseMediaMutationState>;
};

const initialState: ExerciseMediaMutationState = {
  error: undefined,
  fieldErrors: {},
};

export function ExerciseGalleryManager({
  createAction,
  deleteAction,
  items,
  updateActionFactory,
}: ExerciseGalleryManagerProps) {
  const [createState, createFormAction, createPending] = useActionState(createAction, initialState);
  const nextSortOrder = useMemo(
    () => (items.length === 0 ? 1 : Math.max(...items.map((item) => item.sortOrder)) + 1),
    [items],
  );

  return (
    <div id="exercise-gallery" style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 24 }}>Exercise gallery</h2>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          Manage additional exercise images shown in the client portal detail modal.
        </p>
      </div>

      <section
        style={{
          display: "grid",
          gap: 16,
          padding: 18,
          borderRadius: 20,
          border: "1px solid var(--border)",
          background: "rgba(255, 255, 255, 0.03)",
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <strong style={{ fontSize: 18 }}>Add gallery image</strong>
          <span style={{ color: "var(--muted)", lineHeight: 1.6 }}>
            Use image URLs only. The main `thumbnail_url` remains the cover image in the exercise list.
          </span>
        </div>

        <form action={createFormAction} style={{ display: "grid", gap: 16 }}>
          <div style={gridStyles}>
            <Field
              label="Image URL"
              name="url"
              type="url"
              placeholder="https://..."
              error={createState.fieldErrors?.url}
            />
            <Field
              label="Sort order"
              name="sortOrder"
              type="number"
              defaultValue={String(nextSortOrder)}
              error={createState.fieldErrors?.sortOrder}
            />
          </div>
          <Field
            label="Alt text"
            name="altText"
            placeholder="Optional short description"
            error={createState.fieldErrors?.altText}
          />

          {createState.error ? <FormError message={createState.error} /> : null}

          <button
            type="submit"
            disabled={createPending}
            className={buttonPrimary}
            style={{ width: "fit-content" }}
          >
            {createPending ? "Adding..." : "Add image"}
          </button>
        </form>
      </section>

      {items.length === 0 ? (
        <div
          style={{
            padding: 18,
            borderRadius: 18,
            border: "1px dashed var(--border)",
            color: "var(--muted)",
          }}
        >
          No gallery images yet.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {items.map((item) => (
            <ExerciseGalleryRow
              key={item.id}
              item={item}
              updateAction={updateActionFactory(item.id)}
              deleteAction={deleteAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ExerciseGalleryRow({
  item,
  updateAction,
  deleteAction,
}: {
  item: ExerciseMediaItem;
  updateAction: (
    state: ExerciseMediaMutationState,
    formData: FormData,
  ) => Promise<ExerciseMediaMutationState>;
  deleteAction: (formData: FormData) => void | Promise<void>;
}) {
  const [state, formAction, pending] = useActionState(updateAction, initialState);

  return (
    <article
      style={{
        display: "grid",
        gap: 16,
        padding: 18,
        borderRadius: 20,
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "minmax(120px, 160px) minmax(0, 1fr)",
          alignItems: "start",
        }}
      >
        <CompactImagePreview src={item.url} alt={item.altText || "Exercise gallery image"} />

        <div style={{ display: "grid", gap: 16 }}>
          <form action={formAction} style={{ display: "grid", gap: 16 }}>
            <div style={gridStyles}>
              <Field
                label="Image URL"
                name="url"
                type="url"
                defaultValue={item.url}
                placeholder="https://..."
                error={state.fieldErrors?.url}
              />
              <Field
                label="Sort order"
                name="sortOrder"
                type="number"
                defaultValue={String(item.sortOrder)}
                error={state.fieldErrors?.sortOrder}
              />
            </div>

            <Field
              label="Alt text"
              name="altText"
              defaultValue={item.altText ?? ""}
              placeholder="Optional short description"
              error={state.fieldErrors?.altText}
            />

            {state.error ? <FormError message={state.error} /> : null}

            <button
              type="submit"
              disabled={pending}
              className={buttonSecondary}
              style={{ width: "fit-content" }}
            >
              {pending ? "Saving..." : "Save image"}
            </button>
          </form>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <form action={deleteAction}>
              <input type="hidden" name="mediaId" value={item.id} />
              <button type="submit" className={buttonDanger} style={{ width: "fit-content" }}>
                Delete
              </button>
            </form>
          </div>
        </div>
      </div>
    </article>
  );
}

function CompactImagePreview({ src, alt }: { src: string; alt: string }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        style={{
          width: "100%",
          minHeight: 120,
          borderRadius: 18,
          border: "1px solid var(--border)",
          background: "rgba(255, 255, 255, 0.03)",
          display: "grid",
          placeItems: "center",
          textAlign: "center",
          color: "var(--muted)",
          padding: 16,
        }}
      >
        Preview unavailable
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      style={{
        width: "100%",
        minHeight: 120,
        maxHeight: 160,
        objectFit: "cover",
        display: "block",
        borderRadius: 18,
        border: "1px solid var(--border)",
        background: "rgba(255, 255, 255, 0.03)",
      }}
    />
  );
}

function Field({
  defaultValue,
  error,
  label,
  name,
  placeholder,
  type = "text",
}: {
  defaultValue?: string;
  error?: string;
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={input}
      />
      {error ? <span style={{ color: "var(--danger-fg)", fontSize: 14 }}>{error}</span> : null}
    </label>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <p
      style={{
        margin: 0,
        padding: "12px 14px",
        borderRadius: 12,
        background: "var(--danger-bg)",
        color: "var(--danger-fg)",
      }}
    >
      {message}
    </p>
  );
}

const gridStyles = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
};
