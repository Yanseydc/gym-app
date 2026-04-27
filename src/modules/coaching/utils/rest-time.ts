export function formatRestTime(restSeconds: number | null | undefined, fallback = "N/D") {
  if (restSeconds == null) {
    return fallback;
  }

  if (restSeconds < 60) {
    return `${restSeconds} sec`;
  }

  const minutes = restSeconds / 60;

  if (Number.isInteger(minutes)) {
    return `${minutes} min`;
  }

  return `${Number(minutes.toFixed(1))} min`;
}

export function secondsToRestMinutes(restSeconds: number | null | undefined) {
  if (restSeconds == null) {
    return "";
  }

  const minutes = restSeconds / 60;
  return Number.isInteger(minutes) ? String(minutes) : String(Number(minutes.toFixed(2)));
}

export function restMinutesToSeconds(restMinutes: string) {
  if (!restMinutes) {
    return null;
  }

  return Math.round(Number(restMinutes) * 60);
}
