"use client";

import { buttonSecondary } from "@/lib/ui";
import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";
import { duplicateRoutine } from "@/modules/coaching/services/duplicate-routine";

type DuplicateRoutineButtonProps = {
  routineId: string;
  returnPath: string;
};

export function DuplicateRoutineButton({
  routineId,
  returnPath,
}: DuplicateRoutineButtonProps) {
  const { t } = useAdminText();

  return (
    <form action={duplicateRoutine.bind(null, routineId, returnPath)}>
      <button type="submit" className={buttonSecondary}>
        {t("coaching.routines.duplicate")}
      </button>
    </form>
  );
}
