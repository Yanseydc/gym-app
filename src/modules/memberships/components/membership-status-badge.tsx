"use client";

import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";
import { statusDanger, statusNeutral, statusSuccess, statusWarning } from "@/lib/ui";
import type { MembershipStatus } from "@/modules/memberships/types";

export function MembershipStatusBadge({ status }: { status: MembershipStatus }) {
  const { t } = useAdminText();
  const badgeClass =
    status === "active"
      ? statusSuccess
      : status === "pending_payment"
        ? statusWarning
        : status === "partial"
          ? statusWarning
      : status === "expired"
        ? statusNeutral
        : statusDanger;

  return (
    <span className={badgeClass}>
      {t(`common.status.${status}`)}
    </span>
  );
}
