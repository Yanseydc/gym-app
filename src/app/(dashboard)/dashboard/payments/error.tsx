"use client";

type PaymentsErrorProps = {
  error: Error;
  reset: () => void;
};

export default function PaymentsError({ error, reset }: PaymentsErrorProps) {
  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        padding: 24,
        borderRadius: 24,
        border: "1px solid #dba7a7",
        background: "#fff2f2",
      }}
    >
      <div>
        <h1 style={{ margin: "0 0 8px" }}>Unable to load payments</h1>
        <p style={{ margin: 0, color: "#8a1c1c" }}>{error.message}</p>
      </div>
      <button
        type="button"
        onClick={reset}
        style={{
          width: "fit-content",
          border: 0,
          padding: "12px 16px",
          borderRadius: 14,
          background: "var(--accent)",
          color: "#fff",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Try again
      </button>
    </div>
  );
}
