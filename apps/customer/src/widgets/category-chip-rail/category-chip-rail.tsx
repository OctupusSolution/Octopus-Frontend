"use client";

import type { MenuGroup, MenuGroupId } from "@octopus/api-client";
import { useI18n } from "@/app/providers";

export interface CategoryChipRailProps {
  groups: MenuGroup[];
  activeGroup: MenuGroupId | null;
  onSelect: (id: MenuGroupId) => void;
}

export function CategoryChipRail({ groups, activeGroup, onSelect }: CategoryChipRailProps) {
  const { t } = useI18n();

  return (
    <div className="rounded-[20px] bg-[var(--octo-store-soft)] p-5">
      <ul className="flex items-start gap-6 overflow-x-auto pb-1">
        {groups.map((group) => {
          // "all" is the resting state, so it lights up when nothing is chosen.
          const active = group.id === "all" ? activeGroup === null : activeGroup === group.id;

          return (
            <li key={group.id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(group.id)}
                className="flex w-[86px] shrink-0 flex-col items-center gap-2"
              >
                <span
                  className={`grid h-[74px] w-[74px] place-items-center overflow-hidden rounded-full bg-[var(--octo-card)] transition-shadow ${
                    active ? "ring-2 ring-[#0D6EFD]" : "ring-1 ring-transparent"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={group.imageUrl}
                    alt=""
                    loading="lazy"
                    className="h-[52px] w-[52px] object-contain"
                  />
                </span>

                <span
                  className={`truncate text-[12px] font-bold ${
                    active ? "text-[#0D6EFD]" : "text-[var(--octo-text-primary)]"
                  }`}
                >
                  {t(`store.group.${group.id}`)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
