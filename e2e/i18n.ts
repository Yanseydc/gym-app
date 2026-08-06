// Mirrors src/lib/i18n/admin-shared.ts's key resolution exactly, so tests
// assert against the real dictionaries instead of hardcoded copies of the
// copy (which would silently drift from the source of truth).

import en from "../locales/en.json";
import es from "../locales/es.json";

export type Locale = "en" | "es";

const dictionaries = { en, es } as const;

function getByPath(source: unknown, path: string) {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (current && typeof current === "object" && segment in current) {
      return (current as Record<string, unknown>)[segment];
    }
    return undefined;
  }, source);
}

function interpolate(template: string, values?: Record<string, string | number>) {
  if (!values) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

export function text(locale: Locale, key: string, values?: Record<string, string | number>): string {
  const resolved = getByPath(dictionaries[locale], key);
  if (typeof resolved !== "string") {
    throw new Error(`Missing i18n key "${key}" in locale "${locale}" -- fix the test or the dictionary`);
  }
  return interpolate(resolved, values);
}
