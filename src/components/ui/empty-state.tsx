import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "@/components/ui/cx";

export interface EmptyStateProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({
  title,
  description,
  action,
  className,
  ...rest
}: EmptyStateProps) {
  return (
    <div className={cx("ui-empty-state", className)} {...rest}>
      <p className="ui-empty-state-title">{title}</p>
      {description ? (
        <p className="ui-empty-state-description">{description}</p>
      ) : null}
      {action ? <div className="ui-empty-state-action">{action}</div> : null}
    </div>
  );
}
