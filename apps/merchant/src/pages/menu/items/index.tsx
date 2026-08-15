import { useMemo, useState } from "react";
import { GripVertical, Plus, Search, UtensilsCrossed, ArrowUp, ArrowDown, X } from "lucide-react";
import { Badge, Checkbox, EmptyState, Input, Modal, Select } from "@ui/primitives";
import {
  menuCategoryCounts,
  menuItems,
  type MenuChannel,
  type MenuItemRow,
  type MenuItemStatus,
} from "@/shared/api/mock-menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { labelKey } from "@/shared/lib/labels";

const STATUS_TONE: Record<MenuItemStatus, "success" | "error" | "warning" | "neutral"> = {
  Available: "success",
  "86'd": "error",
  Scheduled: "warning",
  Draft: "neutral",
};

const CHANNEL_OPTIONS: readonly MenuChannel[] = ["Dine-in", "Delivery", "Takeaway", "Kiosk", "Aggregator"];
const STATUS_OPTIONS: readonly MenuItemStatus[] = ["Available", "86'd", "Scheduled", "Draft"];

type SortColumn = "price" | "margin";
type SortDir = "asc" | "desc";

function marginClass(pct: number): string {
  if (pct >= 60) return "text-[#16a34a]";
  if (pct >= 40) return "text-[var(--octo-text-primary)]";
  return "text-[#c2660a]";
}

export function MenuItemsPage() {
  const { t } = useI18n();
  const [items, setItems] = useState(menuItems);
  const [categories, setCategories] = useState(menuCategoryCounts);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ column: SortColumn; dir: SortDir } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategoryTarget, setBulkCategoryTarget] = useState("");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const categoryCounts = useMemo(
    () => categories.map((c) => ({ ...c, count: items.filter((i) => i.category === c.id).length })),
    [categories, items]
  );

  const filteredRows = useMemo(() => {
    let rows: MenuItemRow[] = activeCategory === "all" ? [...items] : items.filter((i) => i.category === activeCategory);
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (i) => i.nameEn.toLowerCase().includes(q) || i.nameAr.includes(q)
      );
    }
    if (sort) {
      const key = sort.column === "price" ? "price" : "marginPct";
      rows = [...rows].sort((a, b) => (sort.dir === "asc" ? a[key] - b[key] : b[key] - a[key]));
    }
    return rows;
  }, [items, activeCategory, query, sort]);

  const drawerItem = drawerId ? items.find((i) => i.id === drawerId) ?? null : null;
  const allVisibleSelected = filteredRows.length > 0 && filteredRows.every((r) => selected.has(r.id));

  function toggleSort(column: SortColumn) {
    setSort((prev) =>
      prev?.column === column ? { column, dir: prev.dir === "asc" ? "desc" : "asc" } : { column, dir: "desc" }
    );
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      filteredRows.forEach((r) => {
        if (allVisibleSelected) next.delete(r.id);
        else next.add(r.id);
      });
      return next;
    });
  }

  function applyBulkStatus(status: MenuItemStatus) {
    setItems((prev) => prev.map((i) => (selected.has(i.id) ? { ...i, status } : i)));
    setSelected(new Set());
  }

  function applyBulkCategory(categoryId: string) {
    if (!categoryId) return;
    const target = categoryCounts.find((c) => c.id === categoryId);
    if (!target) return;
    setItems((prev) =>
      prev.map((i) => (selected.has(i.id) ? { ...i, category: target.id, categoryLabel: target.label } : i))
    );
    setSelected(new Set());
    setBulkCategoryTarget("");
  }

  function addCategory() {
    const n = categories.length + 1;
    setCategories((prev) => [
      ...prev,
      { id: `custom-${n}`, label: t("menu.items.newCategory").replace("{n}", String(n)), count: 0 },
    ]);
  }

  function addItem(row: MenuItemRow) {
    setItems((prev) => [row, ...prev]);
    setAddOpen(false);
    setActiveCategory(row.category);
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("menu.items.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">{t("menu.items.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 rounded-[9px] bg-[#0D6EFD] px-3 py-[7px] text-[12px] font-medium text-white transition-colors hover:opacity-90"
          >
            <Plus size={13} />
            {t("menu.items.addItem")}
          </button>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[220px_1fr] lg:items-start">
        {/* -------------------------------------------------- category rail */}
        <aside className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-2 lg:sticky lg:top-0">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={`flex w-full items-center justify-between rounded-[9px] px-2.5 py-2 text-start text-[12.5px] font-medium transition-colors ${
              activeCategory === "all" ? "bg-[var(--octo-selected)] text-[#0D6EFD]" : "text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
            }`}
          >
            <span>{t("menu.items.allCategories")}</span>
            <span className="text-[11px] text-[var(--octo-text-faint)]">{items.length}</span>
          </button>

          <div className="mt-1 flex flex-col gap-0.5">
            {categoryCounts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategory(c.id)}
                className={`flex w-full items-center gap-1.5 rounded-[9px] px-2.5 py-2 text-start text-[12.5px] font-medium transition-colors ${
                  activeCategory === c.id ? "bg-[var(--octo-selected)] text-[#0D6EFD]" : "text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
                }`}
              >
                <GripVertical size={13} className="shrink-0 text-[var(--octo-text-faint)]" />
                <span className="flex-1 truncate">{t(labelKey(c.label))}</span>
                <span className="text-[11px] text-[var(--octo-text-faint)]">{c.count}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={addCategory}
            className="mt-2 flex w-full items-center gap-1.5 rounded-[9px] px-2.5 py-2 text-start text-[12px] font-medium text-[#0D6EFD] transition-colors hover:bg-[var(--octo-hover)]"
          >
            <Plus size={13} />
            {t("menu.items.addCategory")}
          </button>
        </aside>

        {/* --------------------------------------------------------- table */}
        <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
          <div className="flex flex-wrap items-center gap-2">
            <UtensilsCrossed size={15} className="text-[var(--octo-text-muted)]" />
            <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("menu.items.categoriesAndItems")}</h2>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("menu.items.searchPlaceholder")}
              icon={<Search size={13} />}
              className="ms-2 flex-1 min-w-[200px]"
            />
          </div>

          {selected.size > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[9px] bg-[var(--octo-selected)] px-3 py-2">
              <span className="text-[12px] font-medium text-[#0D6EFD]">
                {t("menu.items.selectedCount").replace("{n}", String(selected.size))}
              </span>
              <button
                type="button"
                onClick={() => applyBulkStatus("Available")}
                className="ms-2 rounded-[7px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
              >
                {t("menu.items.bulkSetAvailable")}
              </button>
              <button
                type="button"
                onClick={() => applyBulkStatus("86'd")}
                className="rounded-[7px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2.5 py-1 text-[11.5px] font-medium text-[#dc2626] hover:bg-[var(--octo-hover)]"
              >
                {t("menu.items.bulk86").replace("{n}", String(selected.size))}
              </button>
              <Select
                value={bulkCategoryTarget}
                onChange={(e) => applyBulkCategory(e.target.value)}
                className="!w-auto"
              >
                <option value="">{t("menu.items.bulkChangeCategory")}</option>
                {categoryCounts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {t(labelKey(c.label))}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="ms-auto flex items-center gap-1 text-[11.5px] font-medium text-[var(--octo-text-muted)] hover:text-[var(--octo-text-primary)]"
              >
                <X size={12} />
                {t("common.clear")}
              </button>
            </div>
          )}

          <div className="octo-scroll mt-3 overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-[var(--octo-divider)] text-start">
                  <th className="w-8 px-2 py-2">
                    <Checkbox checked={allVisibleSelected} onChange={toggleAllVisible} aria-label={t("common.selectAll")} />
                  </th>
                  <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                    {t("menu.items.col.item")}
                  </th>
                  <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                    {t("menu.items.col.category")}
                  </th>
                  <SortableHeader label={t("menu.items.col.price")} active={sort?.column === "price"} dir={sort?.dir} onClick={() => toggleSort("price")} />
                  <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                    {t("menu.items.col.cost")}
                  </th>
                  <SortableHeader label={t("menu.items.col.margin")} active={sort?.column === "margin"} dir={sort?.dir} onClick={() => toggleSort("margin")} />
                  <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                    {t("menu.items.col.modifiers")}
                  </th>
                  <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                    {t("menu.items.col.channels")}
                  </th>
                  <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                    {t("menu.items.col.status")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setDrawerId(item.id)}
                    className="cursor-pointer border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]"
                  >
                    <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.has(item.id)} onChange={() => toggleRow(item.id)} aria-label={item.nameEn} />
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5">
                      <div className="font-medium text-[var(--octo-text-primary)]">{item.nameEn}</div>
                      <div className="text-[11px] text-[var(--octo-text-faint)]">{item.nameAr}</div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{t(labelKey(item.categoryLabel))}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">SAR {item.price.toFixed(2)}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">SAR {item.cost.toFixed(2)}</td>
                    <td className={`whitespace-nowrap px-2 py-2.5 font-semibold ${marginClass(item.marginPct)}`}>
                      {item.marginPct.toFixed(1)}%
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{item.modifiers}</td>
                    <td className="px-2 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {item.channels.map((ch) => (
                          <span key={ch} className="whitespace-nowrap rounded-full bg-[var(--octo-track)] px-1.5 py-0.5 text-[10px] text-[var(--octo-text-secondary)]">
                            {t(labelKey(ch))}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5">
                      <Badge tone={STATUS_TONE[item.status]}>{t(labelKey(item.status))}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredRows.length === 0 && (
              <EmptyState
                icon={<UtensilsCrossed size={18} />}
                title={t("menu.items.emptyTitle")}
                description={t("menu.items.emptyDescription")}
                action={
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setActiveCategory("all");
                    }}
                    className="rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-[7px] text-[12px] font-medium text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
                  >
                    {t("menu.items.clearFilters")}
                  </button>
                }
              />
            )}
          </div>
        </section>
      </div>

      {drawerItem && (
        <ItemDrawer item={drawerItem} onClose={() => setDrawerId(null)} />
      )}

      {addOpen && (
        <AddItemModal
          categories={categoryCounts}
          onClose={() => setAddOpen(false)}
          onSave={addItem}
        />
      )}
    </div>
  );
}

function SortableHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active?: boolean;
  dir?: SortDir;
  onClick: () => void;
}) {
  return (
    <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
      <button type="button" onClick={onClick} className="flex items-center gap-1 hover:text-[var(--octo-text-secondary)]">
        {label}
        {active && (dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
      </button>
    </th>
  );
}

function ItemDrawer({ item, onClose }: { item: MenuItemRow; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item.nameEn}
        onClick={(e) => e.stopPropagation()}
        className="octo-scroll flex h-full w-full flex-col overflow-y-auto bg-[var(--octo-card)] transition-transform duration-200 sm:w-[420px]"
      >
        <div className="flex items-center justify-between border-b border-[var(--octo-divider)] px-[18px] py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{item.nameEn}</h2>
            <p className="text-[12px] text-[var(--octo-text-faint)]">{item.nameAr}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.cancel")}
            className="grid h-8 w-8 place-items-center rounded-[9px] text-[var(--octo-text-muted)] hover:bg-[var(--octo-hover)]"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 space-y-3 px-[18px] py-4">
          <div className="grid grid-cols-2 gap-3">
            <DrawerStat label={t("menu.items.col.price")} value={`SAR ${item.price.toFixed(2)}`} />
            <DrawerStat label={t("menu.items.col.cost")} value={`SAR ${item.cost.toFixed(2)}`} />
            <DrawerStat label={t("menu.items.col.margin")} value={`${item.marginPct.toFixed(1)}%`} valueClassName={marginClass(item.marginPct)} />
            <DrawerStat label={t("menu.items.col.modifiers")} value={String(item.modifiers)} />
          </div>

          <div>
            <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              {t("menu.items.col.category")}
            </h3>
            <p className="mt-1 text-[12.5px] text-[var(--octo-text-primary)]">{t(labelKey(item.categoryLabel))}</p>
          </div>

          <div>
            <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              {t("menu.items.col.channels")}
            </h3>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {item.channels.map((ch) => (
                <span key={ch} className="rounded-full bg-[var(--octo-track)] px-2 py-0.5 text-[11px] text-[var(--octo-text-secondary)]">
                  {t(labelKey(ch))}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              {t("menu.items.col.status")}
            </h3>
            <div className="mt-1.5">
              <Badge tone={STATUS_TONE[item.status]}>{t(labelKey(item.status))}</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DrawerStat({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="rounded-[9px] border border-[var(--octo-divider)] px-3 py-2">
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{label}</dt>
      <dd className={`mt-0.5 text-[14px] font-semibold text-[var(--octo-text-primary)] ${valueClassName ?? ""}`}>{value}</dd>
    </div>
  );
}

function AddItemModal({
  categories,
  onClose,
  onSave,
}: {
  categories: readonly { id: string; label: string; count: number }[];
  onClose: () => void;
  onSave: (row: MenuItemRow) => void;
}) {
  const { t } = useI18n();
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [category, setCategory] = useState(categories[0]?.id ?? "");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [modifiers, setModifiers] = useState("0");
  const [channels, setChannels] = useState<Set<MenuChannel>>(new Set(["Dine-in"]));
  const [status, setStatus] = useState<MenuItemStatus>("Available");
  const [error, setError] = useState("");

  const priceNum = Number(price);
  const costNum = Number(cost);
  const modifiersNum = Math.max(0, Math.floor(Number(modifiers) || 0));
  const valid = nameEn.trim().length > 0 && category.length > 0 && Number.isFinite(priceNum) && priceNum > 0;

  function toggleChannel(ch: MenuChannel) {
    setChannels((prev) => {
      const next = new Set(prev);
      if (next.has(ch)) next.delete(ch);
      else next.add(ch);
      return next;
    });
  }

  function submit() {
    if (!valid) {
      setError(t("menu.items.modal.errors.required"));
      return;
    }
    onSave({
      id: `itm-new-${Date.now()}`,
      nameEn: nameEn.trim(),
      nameAr: nameAr.trim(),
      category,
      categoryLabel: categories.find((c) => c.id === category)?.label ?? category,
      price: priceNum,
      cost: Number.isFinite(costNum) && costNum >= 0 ? costNum : 0,
      modifiers: modifiersNum,
      channels: [...channels],
      status,
      marginPct: Math.round(((priceNum - (Number.isFinite(costNum) && costNum >= 0 ? costNum : 0)) / priceNum) * 1000) / 10,
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t("menu.items.modal.title")}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-[7px] text-[12px] font-medium text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded-[9px] bg-[#0D6EFD] px-3 py-[7px] text-[12px] font-medium text-white transition-opacity hover:opacity-90"
          >
            {t("menu.items.modal.create")}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label={t("menu.items.modal.nameEn")}
            value={nameEn}
            onChange={(e) => {
              setNameEn(e.target.value);
              setError("");
            }}
            placeholder="Chicken Shawarma"
          />
          <Input
            label={t("menu.items.modal.nameAr")}
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            placeholder="شاورما دجاج"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              {t("menu.items.modal.category")}
            </span>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {t(labelKey(c.label))}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              {t("menu.items.modal.status")}
            </span>
            <Select value={status} onChange={(e) => setStatus(e.target.value as MenuItemStatus)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {t(labelKey(s))}
                </option>
              ))}
            </Select>
          </label>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Input
            label={t("menu.items.modal.price")}
            type="number"
            min={0}
            step="0.5"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
              setError("");
            }}
          />
          <Input
            label={t("menu.items.modal.cost")}
            type="number"
            min={0}
            step="0.5"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
          <Input
            label={t("menu.items.modal.modifiers")}
            type="number"
            min={0}
            step={1}
            value={modifiers}
            onChange={(e) => setModifiers(e.target.value)}
          />
        </div>

        <div>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
            {t("menu.items.modal.channels")}
          </span>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
            {CHANNEL_OPTIONS.map((ch) => (
              <Checkbox
                key={ch}
                label={t(labelKey(ch))}
                checked={channels.has(ch)}
                onChange={() => toggleChannel(ch)}
              />
            ))}
          </div>
        </div>

        {error && (
          <p className="text-[11.5px] text-[#EF4444]">{error}</p>
        )}
      </div>
    </Modal>
  );
}
