import type { ReactNode } from "react";
import clsx from "clsx";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { BORDER_300, SURFACE_BRAND_LIGHT, SURFACE_WHITE, TEXT_PRIMARY, TEXT_SEC_GRAY } from "../../../_shared/theme";

export interface StatItem {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}

/** The frames' own stat glyphs, sized to sit in the 24px slot of the 40px
 *  disc. Pass one as a `StatItem.icon`. */
export const STAT_ICONS = {
  tables: <ShellIcon name="fp-builder-stat-tables.svg" size={22} />,
  capacity: <ShellIcon name="fp-builder-stat-capacity.svg" size={24} />,
  categories: <ShellIcon name="fp-builder-stat-categories.svg" size={18} />,
  blocked: <ShellIcon name="fp-builder-stat-blocked.svg" size={24} />,
  edited: <ShellIcon name="fp-builder-stat-edited.svg" size={24} />,
} as const;

/** The rounded summary strip under the canvas. */
export function StatsBar({ items, className }: { items: StatItem[]; className?: string }) {
  return (
    <section
      className={clsx(
        "grid grid-cols-1 gap-y-1 rounded-[24px] border px-4 py-3 shadow-[0px_0px_4px_rgba(0,0,0,0.08)] sm:grid-cols-2 md:grid-cols-3 lg:flex lg:items-center lg:justify-between",
        BORDER_300,
        SURFACE_WHITE,
        className
      )}
    >
      {items.map((item, index) => (
        <div
          key={index}
          className={clsx(
            "flex min-h-[70px] min-w-0 items-center gap-2 p-2 lg:flex-auto lg:border-s lg:first:border-s-0",
            BORDER_300
          )}
        >
          <span
            className={clsx(
              "grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#0d6efd] [&>svg]:h-6 [&>svg]:w-6",
              SURFACE_BRAND_LIGHT
            )}
          >
            {item.icon}
          </span>
          <span className={clsx("flex min-w-0 flex-col", item.sub ? "gap-1.5" : "gap-2")}>
            <span className={clsx("block truncate text-[14px] font-medium leading-[14px]", TEXT_SEC_GRAY)}>{item.label}</span>
            <span className={clsx("block truncate text-[16px] font-semibold leading-[16px]", TEXT_PRIMARY)}>{item.value}</span>
            {item.sub && <span className={clsx("block truncate text-[12px] leading-[12px]", TEXT_PRIMARY)}>{item.sub}</span>}
          </span>
        </div>
      ))}
    </section>
  );
}
