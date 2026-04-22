import Link from "next/link";

import { buttonSecondary } from "@/lib/ui";

type SaveRoutineTemplateLinkProps = {
  routineId: string;
  returnPath: string;
};

export function SaveRoutineTemplateLink({
  routineId,
  returnPath,
}: SaveRoutineTemplateLinkProps) {
  return (
    <Link
      href={`/dashboard/coaching/templates/new?routineId=${routineId}&returnTo=${encodeURIComponent(returnPath)}`}
      className={buttonSecondary}
    >
      Save as template
    </Link>
  );
}
