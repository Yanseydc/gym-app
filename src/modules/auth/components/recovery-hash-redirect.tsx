"use client";

import { useEffect } from "react";

export function RecoveryHashRedirect() {
  useEffect(() => {
    const hash = window.location.hash;

    if (!hash) {
      return;
    }

    const params = new URLSearchParams(hash.replace(/^#/, ""));

    if (params.has("access_token") && params.get("type") === "recovery") {
      window.location.replace(`/auth/update-password${hash}`);
    }
  }, []);

  return null;
}
