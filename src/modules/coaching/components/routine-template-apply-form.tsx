"use client";

import { buttonPrimary, input } from "@/lib/ui";
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
        <select name="clientId" defaultValue="" className={input}>
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
        {pending ? "Applying..." : "Apply template"}
      </button>
    </form>
  );
}

function FieldError({ message }: { message: string }) {
  return <span style={{ color: "var(--danger-fg)", fontSize: 14 }}>{message}</span>;
}
