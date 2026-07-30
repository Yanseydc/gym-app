// Run with: npx tsx --test src/modules/dashboard/lib/attention-required-i18n.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";

import { formatCivilDate } from "@/lib/date-format";
import {
  createAdminTranslator,
  getAdminDictionaryForLocale,
  type AdminLocale,
} from "@/lib/i18n/admin-shared";

const attentionKeys = [
  "dashboard.attention.title",
  "dashboard.attention.description",
  "dashboard.attention.viewAll",
  "dashboard.attention.expiring.title",
  "dashboard.attention.expiring.description",
  "dashboard.attention.expiring.empty",
  "dashboard.attention.expiring.dueToday",
  "dashboard.attention.expiring.dueInOneDay",
  "dashboard.attention.expiring.dueInDays",
  "dashboard.attention.pending.title",
  "dashboard.attention.pending.description",
  "dashboard.attention.pending.empty",
  // Reused from other namespaces - must still resolve for this screen.
  "memberships.operations.expires",
  "memberships.operations.status.expiring",
  "memberships.operations.balance",
  "common.status.pending_payment",
  "common.status.partial",
] as const;

function getTranslator(locale: AdminLocale) {
  return createAdminTranslator(getAdminDictionaryForLocale(locale), locale);
}

for (const locale of ["en", "es"] as const) {
  test(`attention required panels resolve every visible translation in ${locale}`, () => {
    const { t } = getTranslator(locale);

    for (const key of attentionKeys) {
      assert.notEqual(t(key), key, `Missing ${locale} translation for ${key}`);
    }
  });
}

test("dueInDays interpolates the day count in both languages", () => {
  assert.equal(getTranslator("en").t("dashboard.attention.expiring.dueInDays", { count: 4 }), "Expires in 4 days");
  assert.equal(getTranslator("es").t("dashboard.attention.expiring.dueInDays", { count: 4 }), "Vence en 4 días");
});

test("Spanish keeps the established 'Por vencer' / 'Vence en N días' phrasing", () => {
  const { t } = getTranslator("es");
  assert.equal(t("memberships.operations.status.expiring"), "Por vencer");
  assert.equal(t("dashboard.attention.expiring.dueInDays", { count: 3 }), "Vence en 3 días");
});

test("balance line interpolates a pre-formatted currency amount in both languages", () => {
  assert.equal(
    getTranslator("en").t("memberships.operations.balance", { amount: "MX$1,234.56" }),
    "Balance: MX$1,234.56",
  );
  assert.equal(
    getTranslator("es").t("memberships.operations.balance", { amount: "$1,234.56" }),
    "Saldo: $1,234.56",
  );
});

test("expiring membership end dates are localized without shifting the calendar day", () => {
  assert.equal(formatCivilDate("2026-08-03", "en-US"), "Aug 3, 2026");
  assert.equal(formatCivilDate("2026-08-03", "es-MX"), "3 ago 2026");
});
