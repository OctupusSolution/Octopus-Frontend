import type { ReactNode } from "react";

export interface SectionHeadingProps {
  title: string;
  action?: ReactNode;
}

export function SectionHeading({ title, action }: SectionHeadingProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[var(--octo-text-primary)]">
        <span className="h-4 w-1 rounded-full bg-[#0D6EFD]" aria-hidden="true" />
        {title}
      </h2>
      {action}
    </div>
  );
}
