import Link from "next/link";

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
      style={actionLinkStyles}
    >
      Save as template
    </Link>
  );
}

const actionLinkStyles = {
  padding: "10px 14px",
  borderRadius: 12,
  background: "var(--surface-alt)",
  fontWeight: 700,
} as const;
