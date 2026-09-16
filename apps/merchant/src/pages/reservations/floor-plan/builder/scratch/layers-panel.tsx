// The Layers tab: every item on the plan, grouped, with visibility (for this
// editing session only — hiding a layer never hides it from guests) and lock.
import { useState, type ElementType } from "react";
import { Armchair, ChevronDown, DoorOpen, Eye, EyeOff, Lock, LockOpen, Minus, Search, Sprout, Square, SquareDashedBottom, Store, TreePine, Type } from "lucide-react";
import clsx from "clsx";
import type { FloorItem, FloorPlanDoc, ObjectType } from "@/entities/floor-plan";
import { useI18n } from "@/app/providers/i18n-provider";
import { TableIcon } from "../../_shared/icons";

const OBJECT_ICON: Record<ObjectType, ElementType> = {
  chair: Armchair,
  armchair: Armchair,
  sofa: Armchair,
  majlisFloor: Armchair,
  wall: Minus,
  halfWall: Minus,
  door: DoorOpen,
  doubleDoor: DoorOpen,
  plantSmall: Sprout,
  plantLarge: Sprout,
  planterBox: Sprout,
  tree: TreePine,
  bar: Store,
  counter: Store,
  hostStand: Store,
  station: Store,
  text: Type,
  room: Square,
};

export function itemName(item: FloorItem, t: (key: string) => string): string {
  if (item.kind === "table") return item.number || "—";
  if (item.kind === "zone") return item.name || t("floorPlan.layers.untitledZone");
  return item.label || t(`floorPlan.object.${item.type}`);
}

export function itemIcon(item: FloorItem): ElementType {
  if (item.kind === "table") return TableIcon;
  if (item.kind === "zone") return SquareDashedBottom;
  return OBJECT_ICON[item.type];
}

export function LayersPanel({
  doc,
  selection,
  hiddenIds,
  onSelect,
  onToggleHidden,
  onToggleLock,
}: {
  doc: FloorPlanDoc;
  selection: readonly string[];
  hiddenIds: ReadonlySet<string>;
  onSelect: (ids: string[]) => void;
  onToggleHidden: (id: string) => void;
  onToggleLock: (id: string) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const q = query.trim().toLowerCase();

  const groups: { id: string; label: string; items: FloorItem[] }[] = [
    { id: "tables", label: t("floorPlan.layers.tables"), items: [...doc.tables].reverse() },
    { id: "objects", label: t("floorPlan.layers.objects"), items: [...doc.objects].reverse() },
    { id: "zones", label: t("floorPlan.layers.zones"), items: [...doc.zones].reverse() },
  ];

  const total = doc.tables.length + doc.objects.length + doc.zones.length;

  return (
    <div className="flex flex-col gap-3">
      <label className="relative">
        <span className="sr-only">{t("floorPlan.layers.search")}</span>
        <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--octo-text-muted)]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("floorPlan.layers.search")}
          className="h-10 w-full rounded-[10px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] pe-3 ps-9 text-[13.5px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-faint)] focus:border-[#0D6EFD] focus:outline-none"
        />
      </label>

      {total === 0 && <p className="rounded-xl bg-[var(--octo-soft-bg)] p-4 text-center text-[13px] text-[var(--octo-text-muted)]">{t("floorPlan.layers.empty")}</p>}

      {groups.map((group) => {
        const items = group.items.filter((item) => !q || itemName(item, t).toLowerCase().includes(q));
        if (group.items.length === 0) return null;
        const open = !collapsed[group.id];
        return (
          <section key={group.id}>
            <button
              type="button"
              onClick={() => setCollapsed((c) => ({ ...c, [group.id]: open }))}
              className="flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-[13px] font-semibold uppercase tracking-[0.05em] text-[var(--octo-text-faint)]"
            >
              <span>
                {group.label} <span className="font-medium normal-case tracking-normal">({group.items.length})</span>
              </span>
              <ChevronDown size={16} className={clsx("transition-transform", !open && "-rotate-90 rtl:rotate-90")} />
            </button>
            {open && (
              <ul className="mt-1 flex flex-col gap-0.5">
                {items.map((item) => {
                  const Icon = itemIcon(item);
                  const selected = selection.includes(item.id);
                  const hidden = hiddenIds.has(item.id);
                  return (
                    <li
                      key={item.id}
                      className={clsx(
                        "group flex items-center gap-1 rounded-lg pe-1 transition-colors",
                        selected ? "bg-[var(--octo-selected)]" : "hover:bg-[var(--octo-hover)]"
                      )}
                    >
                      <button
                        type="button"
                        onClick={(event) =>
                          onSelect(
                            event.shiftKey || event.metaKey || event.ctrlKey
                              ? selected
                                ? selection.filter((id) => id !== item.id)
                                : [...selection, item.id]
                              : [item.id]
                          )
                        }
                        className={clsx(
                          "flex min-w-0 flex-1 items-center gap-2.5 px-2 py-2 text-start text-[13.5px]",
                          selected ? "font-medium text-[#0D6EFD]" : "text-[var(--octo-text-primary)]",
                          hidden && "opacity-50"
                        )}
                      >
                        <Icon size={16} className="shrink-0" />
                        <span className="truncate">{itemName(item, t)}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleHidden(item.id)}
                        aria-label={hidden ? t("floorPlan.layers.show") : t("floorPlan.layers.hide")}
                        title={hidden ? t("floorPlan.layers.show") : t("floorPlan.layers.hide")}
                        className={clsx(
                          "grid h-7 w-7 place-items-center rounded-md text-[var(--octo-text-muted)] hover:text-[var(--octo-text-primary)]",
                          !hidden && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                        )}
                      >
                        {hidden ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleLock(item.id)}
                        aria-label={item.locked ? t("floorPlan.tools.unlock") : t("floorPlan.tools.lock")}
                        title={item.locked ? t("floorPlan.tools.unlock") : t("floorPlan.tools.lock")}
                        className={clsx(
                          "grid h-7 w-7 place-items-center rounded-md text-[var(--octo-text-muted)] hover:text-[var(--octo-text-primary)]",
                          !item.locked && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                        )}
                      >
                        {item.locked ? <Lock size={15} /> : <LockOpen size={15} />}
                      </button>
                    </li>
                  );
                })}
                {items.length === 0 && <li className="px-2 py-1.5 text-[12.5px] text-[var(--octo-text-muted)]">{t("floorPlan.layers.noMatch")}</li>}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
