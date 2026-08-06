"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { useToast } from "@/components/ui/toast";
import { buttonSecondary } from "@/lib/ui";
import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";
import { duplicateRoutine } from "@/modules/coaching/services/duplicate-routine";

type DuplicateRoutineButtonProps = {
  routineId: string;
};

/** Duplicate stays a direct action (no confirmation) -- its effect is
 * recoverable, the duplicate is just another draft the coach can delete.
 * Entrega A0 #4 still requires: blocked double-submit, a pending state,
 * a success toast, and clearly landing on/revealing the new copy, plus a
 * safe error instead of a silent redirect on failure. */
export function DuplicateRoutineButton({ routineId }: DuplicateRoutineButtonProps) {
  const { t } = useAdminText();
  const toast = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (isPending) {
      return;
    }

    startTransition(async () => {
      const result = await duplicateRoutine(routineId);

      if (!result.ok) {
        toast.error(t("coaching.routines.duplicateErrorToastTitle"), {
          description: t(`coaching.routines.duplicateError.${result.errorKey}`),
        });
        return;
      }

      toast.success(t("coaching.routines.duplicateSuccessToast"));
      router.push(`/dashboard/coaching/routines/${result.newRoutineId}/edit`);
    });
  }

  return (
    <button type="button" className={buttonSecondary} onClick={handleClick} disabled={isPending}>
      {isPending ? t("coaching.routines.duplicating") : t("coaching.routines.duplicate")}
    </button>
  );
}
