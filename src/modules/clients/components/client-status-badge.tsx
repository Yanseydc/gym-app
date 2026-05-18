"use client";

import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";
import { statusInactive, statusSuccess } from "@/lib/ui";
import type { ClientStatus } from "@/modules/clients/types";

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const { t } = useAdminText();

  return (
    <span className={status === "active" ? statusSuccess : statusInactive}>
      {t(`common.status.${status}`)}
    </span>
  );
}
