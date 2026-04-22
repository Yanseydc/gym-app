"use client";

import Link from "next/link";

import { buttonSecondary } from "@/lib/ui";
import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";

type SaveRoutineTemplateLinkProps = {
  routineId: string;
  returnPath: string;
};

export function SaveRoutineTemplateLink({
  routineId,
  returnPath,
}: SaveRoutineTemplateLinkProps) {
  const { t } = useAdminText();

  return (
    <Link
      href={`/dashboard/coaching/templates/new?routineId=${routineId}&returnTo=${encodeURIComponent(returnPath)}`}
      className={buttonSecondary}
    >
      {t("coaching.routines.saveTemplate")}
    </Link>
  );
}
