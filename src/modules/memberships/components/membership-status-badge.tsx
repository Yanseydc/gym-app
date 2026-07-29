"use client";

import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";
import { statusArchived, statusDanger, statusNeutral, statusSuccess, statusWarning } from "@/lib/ui";
import type { MembershipDisplayStatus } from "@/modules/memberships/lib/membership-lifecycle";

export function MembershipStatusBadge({ status }: { status: MembershipDisplayStatus }) {
  const { t } = useAdminText();
  const badgeClass =
    status === "active"
      ? statusSuccess
      : status === "pending_payment"
        ? statusWarning
        : status === "partial"
          ? statusWarning
      : status === "expired"
        ? statusArchived
      : status === "future"
        ? statusNeutral
        : statusDanger;

  return (
    <span className={badgeClass}>
      {t(`common.status.${status}`)}
    </span>
  );
}
