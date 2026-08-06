"use client";

import type { CSSProperties } from "react";

import { REST_SECONDS_QUICK_PICKS } from "@/modules/coaching/utils/rest-time";

type RestSecondsFieldProps = {
  label: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  inputClassName?: string;
  inputStyle?: CSSProperties;
  labelStyle?: CSSProperties;
  ariaLabel?: string;
};

/** Shared "descanso en segundos" input: quick-pick chips for the common
 * values plus manual entry, used by both the manual builder
 * (routine-exercise-form.tsx) and the text-import review table
 * (routine-create-flow.tsx) so the two paths present an identical contract
 * (Entrega A0 #1) even though each embeds it in its own visual theme. */
export function RestSecondsField({
  label,
  name,
  value,
  onChange,
  error,
  inputClassName,
  inputStyle,
  labelStyle,
  ariaLabel,
}: RestSecondsFieldProps) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <span style={labelStyle}>{label}</span>
      <input
        type="number"
        inputMode="numeric"
        step={1}
        min={0}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
        style={inputStyle}
        aria-label={ariaLabel ?? label}
      />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {REST_SECONDS_QUICK_PICKS.map((seconds) => (
          <button
            key={seconds}
            type="button"
            onClick={() => onChange(String(seconds))}
            aria-pressed={value === String(seconds)}
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              border: "1px solid var(--border, rgba(120, 110, 95, 0.35))",
              background: value === String(seconds) ? "var(--accent, #d16c43)" : "transparent",
              color: value === String(seconds) ? "var(--accent-foreground, #121513)" : "inherit",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {seconds}s
          </button>
        ))}
      </div>
      {error ? <span style={{ color: "var(--danger-fg, #c23c3c)", fontSize: 14 }}>{error}</span> : null}
    </div>
  );
}
