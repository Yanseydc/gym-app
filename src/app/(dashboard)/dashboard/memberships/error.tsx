"use client";

import { getTextForLocale } from "@/lib/i18n";
import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";

type MembershipsErrorProps = {
  error: Error;
  reset: () => void;
};

export default function MembershipsError({
  error,
  reset,
}: MembershipsErrorProps) {
  const { locale } = useAdminText();
  const t = getTextForLocale("memberships", locale);
  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        padding: 24,
        borderRadius: 24,
        border: "1px solid #dba7a7",
        background: "#fff2f2",
      }}
    >
      <div>
        <h1 style={{ margin: "0 0 8px" }}>{t.title} error</h1>
        <p style={{ margin: 0, color: "#8a1c1c" }}>{error.message}</p>
      </div>
      <button
        type="button"
        onClick={reset}
        style={{
          width: "fit-content",
          border: 0,
          padding: "12px 16px",
          borderRadius: 14,
          background: "var(--accent)",
          color: "#fff",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {locale === "en" ? "Try again" : "Intentar de nuevo"}
      </button>
    </div>
  );
}
