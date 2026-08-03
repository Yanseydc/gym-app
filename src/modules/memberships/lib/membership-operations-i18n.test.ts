// Run with: npx tsx --test src/modules/memberships/lib/membership-operations-i18n.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";

import { formatCivilDate } from "@/lib/date-format";
import { getTextForLocale } from "@/lib/i18n";
import {
  createAdminTranslator,
  getAdminDictionaryForLocale,
  type AdminLocale,
} from "@/lib/i18n/admin-shared";

const operationKeys = [
  "memberships.operations.stats.expired",
  "memberships.operations.stats.expiring",
  "memberships.operations.stats.active",
  "memberships.operations.stats.future",
  "memberships.operations.searchLabel",
  "memberships.operations.searchPlaceholder",
  "memberships.operations.filters.all",
  "memberships.operations.filters.active",
  "memberships.operations.filters.expired",
  "memberships.operations.filters.expiring",
  "memberships.operations.filters.future",
  "memberships.operations.empty",
  "memberships.operations.showing",
  "memberships.operations.expires",
  "memberships.operations.currentMembershipConflict",
  "memberships.operations.balance",
  "memberships.operations.status.expired",
  "memberships.operations.status.expiring",
  "memberships.operations.status.active",
  "memberships.operations.status.future",
  "memberships.operations.status.cancelled",
  "memberships.operations.actions.registerPayment",
  "memberships.operations.actions.renew",
  "memberships.operations.actions.extend",
  "memberships.operations.actions.cancel",
  "memberships.operations.actions.loadMore",
  "memberships.operations.actions.close",
  "memberships.operations.actions.processing",
  "memberships.operations.actions.confirm",
  "memberships.operations.renewalBlocked",
  "memberships.operations.nextPeriodExists",
  "memberships.operations.extensionBlocked",
  "memberships.operations.modal.paymentTitle",
  "memberships.operations.modal.renewTitle",
  "memberships.operations.modal.extendTitle",
  "memberships.operations.modal.cancelTitle",
  "memberships.operations.modal.amount",
  "memberships.operations.modal.extensionDays",
  "memberships.operations.modal.extensionLimitOne",
  "memberships.operations.modal.extensionLimit",
  "memberships.operations.modal.renewNotice",
  "memberships.operations.modal.cancelNotice",
  "memberships.operations.feedback.invalidAmount",
  "memberships.operations.feedback.paymentSuccess",
  "memberships.operations.feedback.membershipRequired",
  "memberships.operations.feedback.renewSuccess",
  "memberships.operations.feedback.invalidDays",
  "memberships.operations.feedback.extendSuccess",
  "memberships.operations.feedback.cancelSuccess",
  "memberships.operations.feedback.invalidRequest",
  "memberships.operations.feedback.paymentFailed",
  "memberships.operations.feedback.extendFailed",
  "memberships.operations.feedback.extendOverlap",
  "memberships.operations.feedback.renewFailed",
  "memberships.operations.feedback.renewOverlap",
] as const;

function getTranslator(locale: AdminLocale) {
  return createAdminTranslator(getAdminDictionaryForLocale(locale), locale);
}

for (const locale of ["en", "es"] as const) {
  test(`membership operations resolves every visible translation in ${locale}`, () => {
    const { t } = getTranslator(locale);

    for (const key of operationKeys) {
      assert.notEqual(t(key), key, `Missing ${locale} translation for ${key}`);
    }
  });
}

test("membership operation counters interpolate in both languages", () => {
  assert.equal(
    getTranslator("en").t("memberships.operations.showing", { visible: 20, total: 24 }),
    "Showing 20 of 24",
  );
  assert.equal(
    getTranslator("es").t("memberships.operations.showing", { visible: 20, total: 24 }),
    "Mostrando 20 de 24",
  );
});

test("the membership plan section title is localized in both languages", () => {
  assert.equal(getTextForLocale("memberships", "en").plansTitle, "Plans");
  assert.equal(getTextForLocale("memberships", "es").plansTitle, "Planes");
});

test("civil membership dates are localized without changing the calendar day", () => {
  assert.equal(formatCivilDate("2026-07-29", "en-US"), "Jul 29, 2026");
  assert.equal(formatCivilDate("2026-07-29", "es-MX"), "29 jul 2026");
  assert.equal(formatCivilDate("invalid", "es-MX"), "invalid");
});

test("extension-overlap copy interpolates days/date correctly in both languages", () => {
  assert.equal(
    getTranslator("en").t("memberships.operations.extensionBlocked", { date: "Aug 16, 2026" }),
    "Can't extend: this client's next membership starts on Aug 16, 2026.",
  );
  assert.equal(
    getTranslator("es").t("memberships.operations.extensionBlocked", { date: "16 ago 2026" }),
    "No se puede extender: la siguiente membresía de este cliente comienza el 16 ago 2026.",
  );
  assert.equal(
    getTranslator("en").t("memberships.operations.modal.extensionLimit", { days: 5, date: "Aug 21, 2026" }),
    "You can extend up to 5 days before the next membership, which starts on Aug 21, 2026.",
  );
  assert.equal(
    getTranslator("es").t("memberships.operations.modal.extensionLimitOne", { date: "16 ago 2026" }),
    "Puedes extender hasta 1 día antes de la siguiente membresía, que comienza el 16 ago 2026.",
  );
});
