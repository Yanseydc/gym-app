"use client";

import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";
import { statusArchived, statusDanger, statusNeutral, statusSuccess, statusWarning } from "@/lib/ui";
import type { ClientMembershipAccessStatus } from "@/modules/checkins/types";

export function CheckInStatusBadge({
  status,
}: {
  status: ClientMembershipAccessStatus;
}) {
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
        : status === "cancelled"
          ? statusDanger
          : statusNeutral;

  return (
    <span className={badgeClass}>
      {t(`common.status.${status}`)}
    </span>
  );
}
