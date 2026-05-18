import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";

type Breadcrumb = {
  href?: string;
  label: string;
};

type BackNavigationProps = {
  href: string;
  label: string;
  breadcrumbs?: Breadcrumb[];
};

export function BackNavigation({ breadcrumbs = [], href, label }: BackNavigationProps) {
  return (
    <nav className="app-back-navigation" aria-label={label}>
      <Link href={href} className="app-back-link">
        <ArrowLeft size={17} strokeWidth={2.2} aria-hidden="true" />
        <span>{label}</span>
      </Link>

      {breadcrumbs.length > 0 ? (
        <ol className="app-breadcrumbs" aria-label="Breadcrumb">
          {breadcrumbs.map((breadcrumb, index) => {
            const isLast = index === breadcrumbs.length - 1;

            return (
              <li key={`${breadcrumb.label}-${index}`} className="app-breadcrumb-item">
                {breadcrumb.href && !isLast ? (
                  <Link href={breadcrumb.href}>{breadcrumb.label}</Link>
                ) : (
                  <span aria-current={isLast ? "page" : undefined}>{breadcrumb.label}</span>
                )}
                {!isLast ? <ChevronRight size={13} strokeWidth={2.2} aria-hidden="true" /> : null}
              </li>
            );
          })}
        </ol>
      ) : null}
    </nav>
  );
}
