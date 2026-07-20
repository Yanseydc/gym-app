"use client";

import { Button } from "@/components/ui/button";

type CheckInsErrorProps = {
  error: Error;
  reset: () => void;
};

export default function CheckInsError({ error, reset }: CheckInsErrorProps) {
  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        padding: 24,
        borderRadius: 24,
        border: "1px solid var(--danger-border)",
        background: "var(--danger-bg)",
      }}
    >
      <div>
        <h1 style={{ margin: "0 0 8px" }}>Unable to load check-ins</h1>
        <p style={{ margin: 0, color: "var(--danger-fg)" }}>{error.message}</p>
      </div>
      <Button variant="primary" onClick={reset} style={{ width: "fit-content" }}>
        Try again
      </Button>
    </div>
  );
}
