"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";

export function AdminLanguageSwitcher() {
  const { locale, t } = useAdminText();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
      <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
        {t("common.language")}
      </span>
      <div className="responsive-actions-wrap">
        {(["en", "es"] as const).map((nextLocale) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("lang", nextLocale);
          const href = params.toString() ? `${pathname}?${params.toString()}` : pathname;
          const isActive = locale === nextLocale;

          return (
            <button
              key={nextLocale}
              type="button"
              onClick={() => {
                if (!isActive) {
                  window.location.assign(href);
                }
              }}
              disabled={isActive}
              style={{
                padding: "8px 12px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: isActive ? "var(--accent)" : "var(--surface-alt)",
                color: isActive ? "#121513" : "var(--foreground)",
                fontWeight: 700,
                fontSize: 13,
                cursor: isActive ? "default" : "pointer",
                opacity: isActive ? 1 : undefined,
              }}
            >
              {nextLocale.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
