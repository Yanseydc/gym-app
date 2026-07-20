import type { HTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { cx } from "@/components/ui/cx";

export interface LoadingStateProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
}

export function LoadingState({ label, className, ...rest }: LoadingStateProps) {
  return (
    <div role="status" className={cx("ui-loading-state", className)} {...rest}>
      <Loader2 className="ui-button-spinner" width={18} height={18} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
