import { useNavigate } from "react-router-dom";
import {
  UtensilsCrossed,
  SlidersHorizontal,
  Layers,
  Tags,
  CalendarClock,
  ClipboardX,
  ArrowRight,
} from "lucide-react";
import {
  menuItems,
  modifierGroups,
  combos,
  priceLists,
  dayParts,
  availabilityBoard,
} from "@/shared/api/mock-menu";
import { useI18n } from "@/app/providers/i18n-provider";

interface MenuSection {
  id: string;
  path: string;
  icon: typeof UtensilsCrossed;
  titleKey: string;
  subtitleKey: string;
  countKey: string;
  count: number;
}

const SECTIONS: readonly MenuSection[] = [
  {
    id: "items",
    path: "/menu/items",
    icon: UtensilsCrossed,
    titleKey: "menu.items.title",
    subtitleKey: "menu.items.subtitle",
    countKey: "menu.hub.count.items",
    count: menuItems.length,
  },
  {
    id: "modifiers",
    path: "/menu/modifiers",
    icon: SlidersHorizontal,
    titleKey: "menu.modifiers.title",
    subtitleKey: "menu.modifiers.subtitle",
    countKey: "menu.hub.count.groups",
    count: modifierGroups.length,
  },
  {
    id: "combos",
    path: "/menu/combos",
    icon: Layers,
    titleKey: "menu.combos.title",
    subtitleKey: "menu.combos.subtitle",
    countKey: "menu.hub.count.combos",
    count: combos.length,
  },
  {
    id: "pricing",
    path: "/menu/pricing",
    icon: Tags,
    titleKey: "menu.pricing.title",
    subtitleKey: "menu.pricing.subtitle",
    countKey: "menu.hub.count.lists",
    count: priceLists.length,
  },
  {
    id: "schedules",
    path: "/menu/schedules",
    icon: CalendarClock,
    titleKey: "menu.schedules.title",
    subtitleKey: "menu.schedules.subtitle",
    countKey: "menu.hub.count.dayParts",
    count: dayParts.length,
  },
  {
    id: "availability",
    path: "/menu/availability",
    icon: ClipboardX,
    titleKey: "menu.availability.title",
    subtitleKey: "menu.availability.subtitle",
    countKey: "menu.hub.count.board",
    count: availabilityBoard.length,
  },
];

export function MenuPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header>
        <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
          {t("nav.menu")}
        </h1>
        <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
          {t("menu.hub.subtitle")}
        </p>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => navigate(section.path)}
              className="group flex flex-col rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-[18px] text-start transition-colors hover:border-[#0D6EFD]/50 hover:bg-[var(--octo-hover)]"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[var(--octo-selected)] text-[#0D6EFD]">
                  <Icon size={17} />
                </span>
                <span className="rounded-full bg-[var(--octo-track)] px-2.5 py-1 text-[11px] font-medium text-[var(--octo-text-secondary)]">
                  {t(section.countKey).replace("{n}", String(section.count))}
                </span>
              </div>

              <h2 className="mt-3 text-[13px] font-semibold text-[var(--octo-text-primary)]">
                {t(section.titleKey)}
              </h2>
              <p className="mt-1 flex-1 text-[11.5px] leading-relaxed text-[var(--octo-text-muted)]">
                {t(section.subtitleKey)}
              </p>

              <span className="mt-3 flex items-center gap-1 text-[11.5px] font-medium text-[#0D6EFD]">
                {t("menu.hub.view")}
                <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
