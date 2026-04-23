import { cookies } from "next/headers";

import { ADMIN_LOCALES, type AdminLocale } from "@/lib/i18n/admin-shared";
import { coachingText } from "@/lib/i18n/coaching";
import { commonText } from "@/lib/i18n/common";
import { dashboardText } from "@/lib/i18n/dashboard";
import { exercisesText } from "@/lib/i18n/exercises";
import { membershipsText } from "@/lib/i18n/memberships";
import { paymentsText } from "@/lib/i18n/payments";

export const DEFAULT_LOCALE: AdminLocale = "es";

const dictionaries = {
  common: commonText,
  dashboard: dashboardText,
  payments: paymentsText,
  memberships: membershipsText,
  exercises: exercisesText,
  coaching: coachingText,
} as const;

export type I18nNamespace = keyof typeof dictionaries;
type Dictionaries = typeof dictionaries;
type NamespaceTree<N extends I18nNamespace> = Dictionaries[N][AdminLocale];

type TextTree = Record<string, unknown>;
type TextAccessor<T extends TextTree> = ((key: string, values?: Record<string, string | number>) => string) & {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends TextTree
      ? TextAccessor<T[K]>
      : T[K];
};

function interpolate(template: string, values?: Record<string, string | number>) {
  if (!values) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

function getByPath(source: unknown, path: string) {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (current && typeof current === "object" && segment in current) {
      return (current as Record<string, unknown>)[segment];
    }

    return undefined;
  }, source);
}

function materializeTree<T extends TextTree>(source: T): T {
  const result: TextTree = {};

  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "string") {
      result[key] = value;
      continue;
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = materializeTree(value as TextTree);
      continue;
    }

    result[key] = value;
  }

  return result as T;
}

function createAccessor<T extends TextTree>(source: T): TextAccessor<T> {
  const accessor = ((key: string, values?: Record<string, string | number>) => {
    const resolved = getByPath(source, key);

    if (typeof resolved !== "string") {
      return key;
    }

    return interpolate(resolved, values);
  }) as TextAccessor<T>;

  return Object.assign(accessor, materializeTree(source));
}

export function resolveLocale(value?: string | null): AdminLocale {
  return ADMIN_LOCALES.includes(value as AdminLocale)
    ? (value as AdminLocale)
    : DEFAULT_LOCALE;
}

export function getTextForLocale(namespace: undefined, locale?: string | null): TextAccessor<TextTree>;
export function getTextForLocale<N extends I18nNamespace>(namespace: N, locale?: string | null): TextAccessor<NamespaceTree<N>>;
export function getTextForLocale(namespace?: I18nNamespace, locale?: string | null) {
  const resolvedLocale = resolveLocale(locale);

  if (!namespace) {
    const merged = Object.values(dictionaries).reduce<TextTree>((accumulator, dictionary) => {
      Object.assign(accumulator, dictionary[resolvedLocale]);
      return accumulator;
    }, {});

    return createAccessor(merged);
  }

  return createAccessor(dictionaries[namespace][resolvedLocale] as NamespaceTree<typeof namespace>);
}

export async function getText(namespace: undefined): Promise<TextAccessor<TextTree>>;
export async function getText<N extends I18nNamespace>(namespace: N): Promise<TextAccessor<NamespaceTree<N>>>;
export async function getText(namespace?: I18nNamespace) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("admin_locale")?.value ?? DEFAULT_LOCALE;

  if (!namespace) {
    return getTextForLocale(undefined, locale);
  }

  return getTextForLocale(namespace, locale);
}
