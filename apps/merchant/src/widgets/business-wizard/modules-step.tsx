// Step 4 — which operating modules the OS ships with.
//
// One flat grid, the way the frame draws it: every module that applies to this
// business type as an equal card with a switch. Modules the type marks `na`
// never appear at all — offering a cloud kitchen a table-reservations upsell
// would be noise, not revenue.
//
// Base modules appear here too, switched on and not switchable: they ship with
// the subscription and cannot be removed, so their switch is `disabled` and
// says why on hover rather than silently refusing the click.
import { useState } from "react";
import { Search } from "lucide-react";
import clsx from "clsx";
import {
  addOnModules, availabilityFor, baseModuleIds, getModule,
  type CatalogModule, type ModuleId, type TypeCode,
} from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { CatalogIcon } from "@/shared/lib/catalog-icon";
import type { Answers } from "./questions-step";

type Filter = "all" | "selected";

export function ModulesStep({
  type,
  enabled,
  onToggle,
  searchable = false,
}: {
  type: TypeCode;
  /** Unused by the grid, kept in the signature because the wizard passes the
   *  whole draft slice and a later "why is this on" affordance will want it. */
  answers?: Answers;
  enabled: readonly ModuleId[];
  onToggle: (id: ModuleId, next: boolean) => void;
  /** Onboarding shows the search field and the All/Selected filter; a host
   *  with less room can leave both out. */
  searchable?: boolean;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const base = baseModuleIds
    .map((id) => getModule(id))
    .filter((m): m is CatalogModule => Boolean(m));
  const addOns = addOnModules.filter((m) => availabilityFor(type, m.id) !== "na");
  const all = [...base, ...addOns];

  const isOn = (m: CatalogModule) => m.inBase || enabled.includes(m.id);
  const needle = query.trim().toLowerCase();
  const shown = all.filter(
    (m) => (!needle || t(m.nameKey).toLowerCase().includes(needle)) && (filter === "all" || isOn(m))
  );

  // The count is of everything switched on, independent of the search query —
  // it must not shrink just because a query narrows what is on screen.
  const selectedCount = all.filter(isOn).length;

  return (
    <div className="flex flex-col gap-6">
      {searchable && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="relative flex min-w-[240px] flex-1 items-center">
            <span className="pointer-events-none absolute start-4 text-[var(--octo-text-muted)]"><Search size={17} /></span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("onboarding.modules.search")}
              aria-label={t("onboarding.modules.search")}
              className="w-full rounded-[12px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] py-3.5 ps-12 pe-4 text-[14px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-faint)] focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/25"
            />
          </span>

          <div className="flex items-center gap-1 rounded-[12px] bg-[var(--octo-seg-bg)] p-1">
            <FilterTab active={filter === "all"} onClick={() => setFilter("all")}>
              {t("onboarding.modules.all")}
            </FilterTab>
            <FilterTab active={filter === "selected"} onClick={() => setFilter("selected")}>
              {t("onboarding.modules.selected").replace("{n}", String(selectedCount))}
            </FilterTab>
          </div>
        </div>
      )}

      <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((module) => {
          const on = isOn(module);
          return (
            <article
              key={module.id}
              className="flex flex-col rounded-[14px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[11px] bg-[var(--octo-selected)] text-[#0D6EFD]">
                  <CatalogIcon name={module.icon} size={20} />
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={t(module.nameKey)}
                  disabled={module.inBase}
                  title={module.inBase ? t("onboarding.baseSection") : undefined}
                  onClick={() => onToggle(module.id, !on)}
                  className={clsx(
                    "relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors",
                    on ? "bg-[#0D6EFD]" : "bg-[var(--octo-switch-off)]",
                    module.inBase ? "cursor-default" : "cursor-pointer"
                  )}
                >
                  <span
                    className={clsx(
                      "absolute top-[3px] h-5 w-5 rounded-full bg-[var(--octo-knob)] shadow transition-all",
                      on ? "start-[23px]" : "start-[3px]"
                    )}
                  />
                </button>
              </div>

              <h3 className="mt-4 text-[17px] font-bold leading-tight tracking-tight text-[var(--octo-text-primary)]">
                {t(module.nameKey)}
              </h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--octo-text-muted)]">
                {t(module.descKey)}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function FilterTab({
  active, onClick, children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "rounded-[9px] px-4 py-2 text-[13px] font-semibold transition-colors",
        active ? "bg-[#0D6EFD] text-white" : "text-[var(--octo-text-secondary)] hover:text-[var(--octo-text-primary)]"
      )}
    >
      {children}
    </button>
  );
}
