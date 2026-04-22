"use client";

import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";

export default function ClientsLoading() {
  const { t } = useAdminText();

  return (
    <div
      style={{
        padding: 24,
        borderRadius: 24,
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      {t("clients.title")}...
    </div>
  );
}
