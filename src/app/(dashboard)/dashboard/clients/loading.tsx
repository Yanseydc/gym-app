"use client";

import { LoadingState } from "@/components/ui/loading-state";
import { useAdminText } from "@/modules/admin/components/admin-i18n-provider";

export default function ClientsLoading() {
  const { t } = useAdminText();

  return <LoadingState label={`${t("clients.title")}...`} />;
}
