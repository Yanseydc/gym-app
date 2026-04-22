import { duplicateRoutine } from "@/modules/coaching/services/duplicate-routine";

const actionButtonStyles = {
  padding: "10px 14px",
  borderRadius: 12,
  background: "var(--surface-alt)",
  fontWeight: 700,
  border: "none",
  cursor: "pointer",
  font: "inherit",
} as const;

type DuplicateRoutineButtonProps = {
  routineId: string;
  returnPath: string;
};

export function DuplicateRoutineButton({
  routineId,
  returnPath,
}: DuplicateRoutineButtonProps) {
  return (
    <form action={duplicateRoutine.bind(null, routineId, returnPath)}>
      <button type="submit" style={actionButtonStyles}>
        Duplicate routine
      </button>
    </form>
  );
}
