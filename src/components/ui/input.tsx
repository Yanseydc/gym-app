import { forwardRef } from "react";
import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { input as inputClassName } from "@/lib/ui";
import { cx } from "@/components/ui/cx";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid = false, className, "aria-invalid": ariaInvalid, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cx(inputClassName, invalid && "ui-input-invalid", className)}
      aria-invalid={ariaInvalid ?? (invalid || undefined)}
      {...rest}
    />
  );
});

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { invalid = false, className, "aria-invalid": ariaInvalid, ...rest },
    ref,
  ) {
    return (
      <textarea
        ref={ref}
        className={cx(inputClassName, invalid && "ui-input-invalid", className)}
        aria-invalid={ariaInvalid ?? (invalid || undefined)}
        {...rest}
      />
    );
  },
);

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    { invalid = false, className, "aria-invalid": ariaInvalid, ...rest },
    ref,
  ) {
    return (
      <select
        ref={ref}
        className={cx(inputClassName, invalid && "ui-input-invalid", className)}
        aria-invalid={ariaInvalid ?? (invalid || undefined)}
        {...rest}
      />
    );
  },
);
