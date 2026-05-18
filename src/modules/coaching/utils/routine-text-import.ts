import type {
  RoutineExerciseOption,
  RoutineTextImportDay,
  RoutineTextImportValues,
} from "@/modules/coaching/types";

export type RoutineTextParseResult = {
  data?: Pick<RoutineTextImportValues, "title" | "days">;
  errors: string[];
};

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function parseExerciseLine(line: string) {
  const parts = line.split("|").map((part) => part.trim());

  if (parts.length < 2) {
    return null;
  }

  const [exerciseName, prescription = "", restPart = "", notesPart = ""] = parts;
  const prescriptionMatch = prescription.match(/^(.+?)\s*x\s*(.+)$/i);
  const restMatch = restPart.match(/descanso\s+(\d+)\s*s/i);
  const notesMatch = notesPart.match(/^notas:\s*(.*)$/i);

  return {
    exerciseName,
    setsText: prescriptionMatch?.[1]?.trim() ?? "",
    repsText: prescriptionMatch?.[2]?.trim() ?? "",
    restSeconds: restMatch?.[1] ?? "",
    notes: notesMatch?.[1]?.trim() ?? "",
  };
}

export function matchExerciseByName(
  exerciseName: string,
  exercises: RoutineExerciseOption[],
) {
  const normalizedName = normalizeName(exerciseName);
  return exercises.find((exercise) => normalizeName(exercise.label) === normalizedName) ?? null;
}

export function parseRoutineText(
  text: string,
  exercises: RoutineExerciseOption[],
  messages: {
    emptyText: string;
    missingRoutineTitle: string;
    missingDays: string;
    exerciseOutsideDay: string;
    invalidExerciseLine: string;
    dayWithoutExercises: string;
  },
): RoutineTextParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { errors: [messages.emptyText] };
  }

  const firstLineMatch = lines[0]?.match(/^Rutina:\s*(.+)$/i);

  if (!firstLineMatch?.[1]?.trim()) {
    return { errors: [messages.missingRoutineTitle] };
  }

  const days: RoutineTextImportDay[] = [];
  const errors: string[] = [];
  let currentDay: RoutineTextImportDay | null = null;

  for (const [index, line] of lines.slice(1).entries()) {
    const lineNumber = index + 2;
    const dayMatch = line.match(/^D[ií]a\s+(\d+):\s*(.+)$/i);

    if (dayMatch) {
      currentDay = {
        dayIndex: Number(dayMatch[1]),
        title: dayMatch[2]?.trim() ?? "",
        exercises: [],
      };
      days.push(currentDay);
      continue;
    }

    if (!currentDay) {
      errors.push(`${messages.exerciseOutsideDay} (${lineNumber})`);
      continue;
    }

    const parsedExercise = parseExerciseLine(line);

    if (
      !parsedExercise ||
      !parsedExercise.exerciseName ||
      !parsedExercise.setsText ||
      !parsedExercise.repsText
    ) {
      errors.push(`${messages.invalidExerciseLine} (${lineNumber})`);
      continue;
    }

    const matchedExercise = matchExerciseByName(parsedExercise.exerciseName, exercises);
    currentDay.exercises.push({
      ...parsedExercise,
      exerciseId: matchedExercise?.id ?? "",
    });
  }

  if (days.length === 0) {
    errors.push(messages.missingDays);
  }

  for (const day of days) {
    if (day.exercises.length === 0) {
      errors.push(`${messages.dayWithoutExercises}: ${day.title}`);
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    data: {
      title: firstLineMatch[1].trim(),
      days,
    },
    errors: [],
  };
}
