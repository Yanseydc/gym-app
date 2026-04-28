import "server-only";

import { serverEnv } from "@/lib/env-server";

export function buildAppUrl(path: `/${string}`) {
  const baseUrl = serverEnv.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  return `${baseUrl}${path}`;
}
