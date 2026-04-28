import "server-only";

import { serverEnv } from "@/lib/env-server";

export function buildAppUrl(path: `/${string}`) {
  const appUrl = new URL(serverEnv.NEXT_PUBLIC_APP_URL);
  const basePath = appUrl.pathname === "/" ? "" : appUrl.pathname.replace(/\/+$/, "");
  const baseUrl = `${appUrl.origin}${basePath}`;
  return `${baseUrl}${path}`;
}

export function buildPasswordRecoveryRedirectUrl() {
  const redirectUrl = buildAppUrl("/auth/update-password");
  const url = new URL(redirectUrl);

  if (url.searchParams.has("redirect_to")) {
    throw new Error("Password recovery redirect URL must not contain redirect_to.");
  }

  return redirectUrl;
}

export function assertSingleRedirectToParam(
  actionLink: string,
  expectedRedirectTo: string,
) {
  const url = new URL(actionLink);
  const redirectToValues = url.searchParams.getAll("redirect_to");

  if (redirectToValues.length !== 1) {
    throw new Error(
      `Generated recovery link must contain exactly one redirect_to parameter. Found ${redirectToValues.length}.`,
    );
  }

  if (redirectToValues[0] !== expectedRedirectTo) {
    throw new Error("Generated recovery link redirect_to does not match the expected redirect URL.");
  }
}
