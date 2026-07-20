import { forwardRef } from "react";
import type { HTMLAttributes } from "react";

import { card, cardSubtle, cardElevated } from "@/lib/ui";
import { cx } from "@/components/ui/cx";

export type CardVariant = "default" | "subtle" | "elevated";
export type CardPadding = "none" | "sm" | "md" | "lg";

const variantClassName: Record<CardVariant, string> = {
  default: card,
  subtle: cardSubtle,
  elevated: cardElevated,
};

const paddingClassName: Record<CardPadding, string> = {
  none: "ui-card-pad-none",
  sm: "ui-card-pad-sm",
  md: "ui-card-pad-md",
  lg: "ui-card-pad-lg",
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = "default", padding = "md", className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cx(
        variantClassName[variant],
        "ui-card-radius",
        paddingClassName[padding],
        className,
      )}
      {...rest}
    />
  );
});
