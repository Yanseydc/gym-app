"use client";

import { cloneElement, isValidElement, useId } from "react";
import type { ReactElement, ReactNode } from "react";

import { fieldError as fieldErrorClassName } from "@/lib/ui";
import { cx } from "@/components/ui/cx";

type FieldControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
  invalid?: boolean;
};

export interface FieldProps {
  label: ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactElement<FieldControlProps>;
}

export function Field({
  label,
  error,
  hint,
  required,
  className,
  children,
}: FieldProps) {
  const generatedId = useId();

  if (!isValidElement<FieldControlProps>(children)) {
    return null;
  }

  const controlId = children.props.id ?? generatedId;
  const errorId = `${controlId}-error`;
  const hintId = `${controlId}-hint`;
  const describedBy =
    [error ? errorId : null, hint && !error ? hintId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  const control = cloneElement(children, {
    id: controlId,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
    invalid: Boolean(error),
  });

  return (
    <div className={cx("ui-field", className)}>
      <label htmlFor={controlId} className="ui-field-label">
        {label}
        {required ? (
          <span className="ui-field-required" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </label>
      {control}
      {hint && !error ? (
        <span id={hintId} className="ui-field-hint">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className={fieldErrorClassName} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
