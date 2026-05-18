"use client";

import type { CSSProperties } from "react";

import { buttonPrimary, fieldError, formError, input } from "@/lib/ui";
import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";
import { useCheckInForm } from "@/modules/checkins/hooks/use-checkin-form";
import type { CheckInMutationState } from "@/modules/checkins/types";

type CheckInFormProps = {
  action: (
    state: CheckInMutationState,
    formData: FormData,
  ) => Promise<CheckInMutationState>;
};

export function CheckInForm({ action }: CheckInFormProps) {
  const { t } = useAdminText();
  const { state, formAction, pending } = useCheckInForm(action);

  return (
    <form action={formAction} style={{ display: "grid", gap: 16 }}>
      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ fontWeight: 600 }}>{t("checkins.notes")}</span>
        <textarea
          name="notes"
          rows={3}
          placeholder={t("checkins.placeholder")}
          className={input}
          style={{ resize: "vertical" }}
        />
        {state.fieldErrors?.notes ? (
          <span className={fieldError}>{state.fieldErrors.notes}</span>
        ) : null}
      </label>

      {state.error ? (
        <p className={formError}>
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={buttonPrimary}
        style={{ width: "fit-content" }}
      >
        {pending ? t("common.saving") : t("checkins.saveCheckin")}
      </button>
    </form>
  );
}
