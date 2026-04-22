"use client";

import { createContext, useContext, useMemo } from "react";

import {
  createAdminTranslator,
  type AdminDictionary,
  type AdminLocale,
} from "@/lib/i18n/admin-shared";

type AdminI18nContextValue = ReturnType<typeof createAdminTranslator>;

const AdminI18nContext = createContext<AdminI18nContextValue | null>(null);

export function AdminI18nProvider({
  children,
  dictionary,
  locale,
}: {
  children: React.ReactNode;
  dictionary: AdminDictionary;
  locale: AdminLocale;
}) {
  const value = useMemo(() => createAdminTranslator(dictionary, locale), [dictionary, locale]);

  return <AdminI18nContext.Provider value={value}>{children}</AdminI18nContext.Provider>;
}

export function useAdminText() {
  const value = useContext(AdminI18nContext);

  if (!value) {
    throw new Error("useAdminText must be used inside AdminI18nProvider");
  }

  return value;
}
