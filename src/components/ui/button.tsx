import { forwardRef } from "react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import Link, { type LinkProps } from "next/link";
import { Loader2 } from "lucide-react";

import {
  buttonPrimary,
  buttonSecondary,
  buttonGhost,
  buttonDanger,
} from "@/lib/ui";
import { cx } from "@/components/ui/cx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variantClassName: Record<ButtonVariant, string> = {
  primary: buttonPrimary,
  secondary: buttonSecondary,
  ghost: buttonGhost,
  danger: buttonDanger,
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Shows a spinner and blocks interaction while a submission is in flight. */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      loading = false,
      disabled,
      className,
      children,
      type = "button",
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cx(variantClassName[variant], className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...rest}
      >
        {loading ? (
          <Loader2
            className="ui-button-spinner"
            width={16}
            height={16}
            aria-hidden="true"
          />
        ) : null}
        {children}
      </button>
    );
  },
);

export interface ButtonLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">,
    Pick<LinkProps, "href" | "replace" | "scroll" | "prefetch"> {
  variant?: ButtonVariant;
}

export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  function ButtonLink({ variant = "primary", className, children, ...rest }, ref) {
    return (
      <Link ref={ref} className={cx(variantClassName[variant], className)} {...rest}>
        {children}
      </Link>
    );
  },
);
