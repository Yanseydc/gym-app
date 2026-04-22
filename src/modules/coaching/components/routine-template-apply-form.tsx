"use client";

import { useRoutineTemplateApplyForm } from "@/modules/coaching/hooks/use-routine-template-apply-form";
import type {
  RoutineClientOption,
  RoutineTemplateApplyMutationState,
} from "@/modules/coaching/types";

type RoutineTemplateApplyFormProps = {
  action: (
    state: RoutineTemplateApplyMutationState,
    formData: FormData,
  ) => Promise<RoutineTemplateApplyMutationState>;
  clients: RoutineClientOption[];
};

export function RoutineTemplateApplyForm({
  action,
  clients,
}: RoutineTemplateApplyFormProps) {
  const { state, formAction, pending } = useRoutineTemplateApplyForm(action);

  return (
    <form action={formAction} style={{ display: "grid", gap: 16 }}>
      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ fontWeight: 600 }}>Client</span>
        <select name="clientId" defaultValue="" style={inputStyles}>
          <option value="">Select a client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.label}
            </option>
          ))}
        </select>
        {state.fieldErrors?.clientId ? <FieldError message={state.fieldErrors.clientId} /> : null}
      </label>

      {state.error ? (
        <p
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: 12,
            background: "#fbe4e4",
            color: "#8a1c1c",
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
          color: "#fff",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {pending ? "Applying..." : "Apply template"}
      </button>
    </form>
  );
}

function FieldError({ message }: { message: string }) {
  return <span style={{ color: "#8a1c1c", fontSize: 14 }}>{message}</span>;
}

const inputStyles = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "#fff",
  font: "inherit",
} as const;
