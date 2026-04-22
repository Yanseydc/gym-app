import en from "../../../locales/en.json";
import es from "../../../locales/es.json";

export const ADMIN_LOCALE_COOKIE = "admin_locale";
export const ADMIN_LOCALES = ["en", "es"] as const;
export type AdminLocale = (typeof ADMIN_LOCALES)[number];
export const DEFAULT_ADMIN_LOCALE: AdminLocale = "en";

const dictionaries = { en, es } as const;

export type AdminDictionary = typeof en;

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

export function resolveAdminLocale(value?: string | null): AdminLocale {
  return ADMIN_LOCALES.includes(value as AdminLocale)
    ? (value as AdminLocale)
    : DEFAULT_ADMIN_LOCALE;
}

export function getAdminDictionaryForLocale(locale: AdminLocale) {
  return dictionaries[locale];
}

export function createAdminTranslator(dictionary: AdminDictionary, locale: AdminLocale) {
  return {
    locale,
    dictionary,
    t(key: string, values?: Record<string, string | number>) {
      const resolved = getByPath(dictionary, key);

      if (typeof resolved !== "string") {
        return key;
      }

      return interpolate(resolved, values);
    },
  };
}
