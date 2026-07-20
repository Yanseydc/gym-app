"use client";

import { Button } from "@/components/ui/button";
import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";

type ClientsErrorProps = {
  error: Error;
  reset: () => void;
};

export default function ClientsError({ error, reset }: ClientsErrorProps) {
  const { t } = useAdminText();

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        padding: 24,
        borderRadius: 24,
        border: "1px solid var(--danger-border)",
        background: "var(--danger-bg)",
      }}
    >
      <div>
        <h1 style={{ margin: "0 0 8px" }}>{t("clients.loadError")}</h1>
        <p style={{ margin: 0, color: "var(--danger-fg)" }}>{error.message}</p>
      </div>
      <Button variant="primary" onClick={reset} style={{ width: "fit-content" }}>
        {t("clients.tryAgain")}
      </Button>
    </div>
  );
}
