"use client";

import clsx from "clsx";
import { House, LayoutGrid, Menu as MenuIcon, ShoppingBag, User, X } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/app/providers";
import type { CategoryStyle, NavStyle } from "./menu-theme";
import type { SectionView } from "./menu-model";

const STOCK = "/images/storefront/all.png";

function Chip({ section, style, active, onClick }: { section: SectionView; style: CategoryStyle; active: boolean; onClick: () => void }) {
  const image = section.imageUrl ?? STOCK;
  const ring = active ? "var(--octo-brand)" : (section.color ?? "var(--octo-border-card)");
  if (style === "text-only") {
    return (
      <button type="button" onClick={onClick} className={clsx("shrink-0 rounded-full border px-4 py-1.5 text-[13px] font-semibold", active ? "bg-[var(--octo-brand)] text-white" : "text-[var(--octo-text-secondary)]")} style={{ borderColor: ring }}>
        {section.name}
      </button>
    );
  }
  if (style === "image-text") {
    return (
      <button type="button" onClick={onClick} className="relative h-[72px] w-[120px] shrink-0 overflow-hidden rounded-xl border-b-[3px] text-start" style={{ borderBottomColor: ring }}>
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <span className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" aria-hidden />
        <span className="absolute inset-x-2 bottom-1.5 truncate text-[12px] font-semibold text-white">{section.name}</span>
      </button>
    );
  }
  return (
    <button type="button" onClick={onClick} title={section.name} className="flex w-[64px] shrink-0 flex-col items-center gap-1">
      <span className="grid h-[52px] w-[52px] place-items-center overflow-hidden rounded-full border-2 bg-[var(--octo-store-soft)]" style={{ borderColor: ring }}>
        <img src={image} alt="" className="h-full w-full object-cover" />
      </span>
      {style === "icon-text" && <span className={clsx("w-full truncate text-center text-[11px] font-medium", active ? "text-[var(--octo-brand)]" : "text-[var(--octo-text-secondary)]")}>{section.name}</span>}
    </button>
  );
}

export interface CategoryNavProps {
  sections: SectionView[];
  nav: NavStyle;
  category: CategoryStyle;
  active: string | null;
  onJump: (ref: string) => void;
}

/** The strip (top bar, pills), the side drawer, or the bottom bar — how a customer moves between sections. */
export function CategoryNav({ sections, nav, category, active, onJump }: CategoryNavProps) {
  const { t } = useI18n();
  const [drawer, setDrawer] = useState(false);
  const chips = sections.map((s) => <Chip key={s.ref} section={s} style={category} active={active === s.ref} onClick={() => onJump(s.ref)} />);

  if (nav === "pill-scroll") {
    return (
      <nav className="sticky top-0 z-20 flex gap-2 overflow-x-auto border-b border-[var(--octo-border-card)] bg-[var(--octo-card)] px-4 py-2.5">
        {sections.map((s) => (
          <button key={s.ref} type="button" onClick={() => onJump(s.ref)} className={clsx("shrink-0 rounded-full px-3.5 py-1 text-[12.5px] font-semibold", active === s.ref ? "bg-[var(--octo-brand)] text-white" : "bg-[var(--octo-store-soft)] text-[var(--octo-text-secondary)]")}>
            {s.name}
          </button>
        ))}
      </nav>
    );
  }
  if (nav === "side-drawer") {
    return (
      <>
        <button type="button" onClick={() => setDrawer(true)} className="inline-flex items-center gap-2 rounded-full border border-[var(--octo-border-input)] px-4 py-2 text-[13px] font-medium">
          <MenuIcon size={16} aria-hidden />
          {t("store.menu.sections")}
        </button>
        {drawer && (
          <div className="fixed inset-0 z-40 flex" role="dialog">
            <aside className="flex w-[280px] flex-col gap-1 bg-[var(--octo-card)] p-4 shadow-xl">
              <button type="button" aria-label={t("store.menu.close")} onClick={() => setDrawer(false)} className="mb-2 self-end">
                <X size={18} />
              </button>
              {sections.map((s) => (
                <button key={s.ref} type="button" onClick={() => { setDrawer(false); onJump(s.ref); }} className={clsx("rounded-lg px-3 py-2 text-start text-[14px]", active === s.ref ? "bg-[var(--octo-store-soft)] font-semibold text-[var(--octo-brand)]" : "text-[var(--octo-text-secondary)]")}>
                  {s.name}
                </button>
              ))}
            </aside>
            <button type="button" aria-label={t("store.menu.close")} className="flex-1 bg-black/40" onClick={() => setDrawer(false)} />
          </div>
        )}
      </>
    );
  }
  return <nav className="flex gap-3 overflow-x-auto pb-1">{chips}</nav>;
}

/** The bottom bar of the "BottomBar" navigation style: fixed, four destinations, sections highlighted. */
export function BottomBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-[var(--octo-border-card)] bg-[var(--octo-card)] py-2" aria-hidden>
      {[House, LayoutGrid, ShoppingBag, User].map((Icon, i) => (
        <span key={i} className={clsx("grid place-items-center", i === 1 ? "text-[var(--octo-brand)]" : "text-[var(--octo-text-muted)]")}>
          <Icon size={20} />
        </span>
      ))}
    </div>
  );
}
