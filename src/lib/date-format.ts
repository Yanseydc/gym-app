const APP_TIME_ZONE = "America/Tijuana";
const MEXICO_LOCALE = "es-MX";

const dateTimeFormatter = new Intl.DateTimeFormat(MEXICO_LOCALE, {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: APP_TIME_ZONE,
});

// en-CA formats as YYYY-MM-DD, matching the `date` columns' string
// representation, so it can be compared with start_date/end_date directly.
const isoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatDateTimeMexico(value: string) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return value;
  }

  return dateTimeFormatter.format(date);
}

/**
 * Formats a civil YYYY-MM-DD value without allowing the runtime time zone to
 * move it to the previous or following day.
 */
export function formatCivilDate(value: string, locale: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return value;
  }

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Today's date (YYYY-MM-DD) in the app's operating time zone, not UTC.
 * Accepts an explicit reference Date for testability.
 */
export function getTodayInAppTimeZone(referenceDate: Date = new Date()): string {
  return isoDateFormatter.format(referenceDate);
}
