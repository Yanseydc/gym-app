"use client";

import { Button } from "@/components/ui/button";
import { getTextForLocale } from "@/lib/i18n";
import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";

type PaymentsErrorProps = {
  error: Error;
  reset: () => void;
};

export default function PaymentsError({ error, reset }: PaymentsErrorProps) {
  const { locale } = useAdminText();
  const t = getTextForLocale("payments", locale);
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
        <h1 style={{ margin: "0 0 8px" }}>{t("title")} error</h1>
        <p style={{ margin: 0, color: "var(--danger-fg)" }}>{error.message}</p>
      </div>
      <Button variant="primary" onClick={reset} style={{ width: "fit-content" }}>
        {locale === "en" ? "Try again" : "Intentar de nuevo"}
      </Button>
    </div>
  );
}
