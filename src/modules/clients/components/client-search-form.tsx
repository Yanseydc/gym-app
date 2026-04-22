"use client";

import { buttonPrimary, input } from "@/lib/ui";
import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";

type ClientSearchFormProps = {
  defaultValue: string;
};

export function ClientSearchForm({ defaultValue }: ClientSearchFormProps) {
  const { t } = useAdminText();
  return (
    <form
      method="get"
      className="clients-search-bar"
    >
      <input
        type="search"
        name="search"
        defaultValue={defaultValue}
        placeholder={t("clients.searchPlaceholder")}
        className={input}
        style={{ minWidth: 0 }}
      />
      <button type="submit" className={buttonPrimary} style={{ width: "fit-content" }}>
        {t("common.search")}
      </button>
    </form>
  );
}
