import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "@/components/ui/cx";

export type InlineAlertVariant = "danger" | "warning" | "success";

const variantClassName: Record<InlineAlertVariant, string> = {
  danger: "ui-inline-alert-danger",
  warning: "ui-inline-alert-warning",
  success: "ui-inline-alert-success",
};

export interface InlineAlertProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  variant: InlineAlertVariant;
  title?: ReactNode;
  action?: ReactNode;
  /**
   * Marks this as a message that just appeared as a direct result of
   * something the user did (e.g. a failed form submission) and should
   * interrupt assistive tech to announce it (role="alert").
   * Defaults to false: most inline alerts in this app are persistent,
   * already-on-render notices, which use the gentler role="status".
   */
  urgent?: boolean;
  children: ReactNode;
}

export function InlineAlert({
  variant,
  title,
  action,
  urgent = false,
  className,
  children,
  ...rest
}: InlineAlertProps) {
  return (
    <div
      role={urgent ? "alert" : "status"}
      className={cx("ui-inline-alert", variantClassName[variant], className)}
      {...rest}
    >
      {title ? <p className="ui-inline-alert-title">{title}</p> : null}
      <div>{children}</div>
      {action ? <div className="ui-inline-alert-action">{action}</div> : null}
    </div>
  );
}
