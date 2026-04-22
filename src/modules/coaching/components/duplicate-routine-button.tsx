import { duplicateRoutine } from "@/modules/coaching/services/duplicate-routine";

const actionButtonStyles = {
  padding: "9px 12px",
  borderRadius: 12,
  background: "rgba(239, 229, 212, 0.48)",
  fontWeight: 700,
  fontSize: 14,
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
