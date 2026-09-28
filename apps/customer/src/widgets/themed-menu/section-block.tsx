"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import type { SectionView } from "./menu-model";

export function SectionBlock({ section, selectable, children }: { section: SectionView; selectable: boolean; children: ReactNode[] }) {
  const accent = section.color ?? "var(--octo-brand)";
  const layout =
    section.displayStyle === "carousel"
      ? "flex snap-x gap-4 overflow-x-auto pb-2 [&>*]:w-[240px] [&>*]:shrink-0 [&>*]:snap-start"
      : section.displayStyle === "grid"
        ? "grid grid-cols-2 gap-4 lg:grid-cols-4"
        : "grid grid-cols-1 gap-3 md:grid-cols-2";
  return (
    <section
      id={section.ref}
      data-section-ref={section.ref}
      data-selectable={selectable ? "" : undefined}
      className="flex scroll-mt-24 flex-col gap-4"
    >
      <h2 className="flex items-center gap-3">
        <span className="h-[26px] w-[4px] shrink-0 rounded-full" style={{ backgroundColor: accent }} aria-hidden />
        <span className="text-[22px] font-bold text-[var(--octo-text-primary)] sm:text-[26px]">{section.name}</span>
      </h2>
      {section.description && <p className="-mt-2 text-[13px] text-[var(--octo-text-muted)]">{section.description}</p>}
      <div className={clsx(layout)}>{children}</div>
    </section>
  );
}
