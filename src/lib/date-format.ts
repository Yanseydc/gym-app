const APP_TIME_ZONE = "America/Tijuana";
const MEXICO_LOCALE = "es-MX";

const dateTimeFormatter = new Intl.DateTimeFormat(MEXICO_LOCALE, {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: APP_TIME_ZONE,
});

export function formatDateTimeMexico(value: string) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return value;
  }

  return dateTimeFormatter.format(date);
}
