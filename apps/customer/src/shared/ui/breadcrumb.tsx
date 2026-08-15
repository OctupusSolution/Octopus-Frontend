import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-[11.5px] text-[var(--octo-text-muted)]">
      {items.map((item, index) => (
        <Fragment key={`${item.label}-${index}`}>
          {index > 0 && <ChevronRight size={13} className="rtl:-scale-x-100" aria-hidden="true" />}
          {item.href ? (
            <Link href={item.href} className="transition-colors hover:text-[var(--octo-text-primary)]">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-[var(--octo-text-primary)]">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
