import { cookies } from "next/headers";
import {
  createAdminTranslator,
  getAdminDictionaryForLocale,
  resolveAdminLocale,
  type AdminLocale,
} from "@/lib/i18n/admin-shared";

export { ADMIN_LOCALE_COOKIE, DEFAULT_ADMIN_LOCALE } from "@/lib/i18n/admin-shared";

export async function getAdminLocale() {
  const cookieStore = await cookies();
  return resolveAdminLocale(cookieStore.get("admin_locale")?.value);
}

export async function getAdminDictionary(locale?: AdminLocale) {
  const resolvedLocale = locale ?? (await getAdminLocale());
  return getAdminDictionaryForLocale(resolvedLocale);
}

export async function getAdminText(locale?: AdminLocale) {
  const resolvedLocale = locale ?? (await getAdminLocale());
  const dictionary = await getAdminDictionary(resolvedLocale);

  return createAdminTranslator(dictionary, resolvedLocale);
}
