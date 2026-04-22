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
  padding: "9px 12px",
  borderRadius: 12,
  background: "rgba(239, 229, 212, 0.48)",
  fontWeight: 700,
  fontSize: 14,
} as const;
