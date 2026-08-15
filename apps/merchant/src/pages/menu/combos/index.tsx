import { useMemo, useState } from "react";
import { Layers3, Plus, Trash2 } from "lucide-react";
import { StatCard } from "@/widgets/sales-summary-chart";
import { Badge, Modal, Segmented, Select } from "@ui/primitives";
import {
  combos as initialCombos,
  comboStats,
  menuItems,
  type ComboRow,
  type ComboStatus,
} from "@/shared/api/mock-menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { labelKey } from "@/shared/lib/labels";

const STATUS_TONE: Record<ComboStatus, "success" | "neutral" | "warning"> = {
  Active: "success",
  Inactive: "neutral",
  Draft: "warning",
};

function marginClass(pct: number): string {
  if (pct >= 60) return "text-[#16a34a]";
  if (pct >= 40) return "text-[var(--octo-text-primary)]";
  return "text-[#c2660a]";
}

interface DraftLine {
  itemId: string;
  qty: number;
}

export function MenuCombosPage() {
  const { t } = useI18n();
  const [combos, setCombos] = useState<readonly ComboRow[]>(initialCombos);
  const [filter, setFilter] = useState<ComboStatus>("Active");
  const [modalOpen, setModalOpen] = useState(false);
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [price, setPrice] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([{ itemId: menuItems[0]?.id ?? "", qty: 1 }]);

  const rows = useMemo(() => combos.filter((c) => c.status === filter), [combos, filter]);

  const individualTotal = lines.reduce((sum, l) => {
    const item = menuItems.find((i) => i.id === l.itemId);
    return sum + (item ? item.price * l.qty : 0);
  }, 0);
  const costTotal = lines.reduce((sum, l) => {
    const item = menuItems.find((i) => i.id === l.itemId);
    return sum + (item ? item.cost * l.qty : 0);
  }, 0);
  const priceNum = Number(price) || 0;
  const liveSaving = Math.max(individualTotal - priceNum, 0);
  const liveMargin = priceNum > 0 ? ((priceNum - costTotal) / priceNum) * 100 : 0;

  function updateLine(index: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function addLine() {
    setLines((prev) => [...prev, { itemId: menuItems[0]?.id ?? "", qty: 1 }]);
  }

  function resetModal() {
    setNameEn("");
    setNameAr("");
    setPrice("");
    setLines([{ itemId: menuItems[0]?.id ?? "", qty: 1 }]);
  }

  function createCombo() {
    if (!nameEn.trim() || priceNum <= 0) return;
    const components = lines
      .map((l) => {
        const item = menuItems.find((i) => i.id === l.itemId);
        return item ? { itemNameEn: item.nameEn, qty: l.qty } : null;
      })
      .filter((c): c is { itemNameEn: string; qty: number } => c !== null);

    const newCombo: ComboRow = {
      id: `cmb-custom-${combos.length + 1}`,
      nameEn: nameEn.trim(),
      nameAr: nameAr.trim() || nameEn.trim(),
      components,
      individualTotal,
      comboPrice: priceNum,
      cost: costTotal,
      availabilityWindow: "All day",
      status: "Draft",
      unitsSoldMonth: 0,
      saving: Math.round((individualTotal - priceNum) * 100) / 100,
      marginPct: Math.round(liveMargin * 10) / 10,
    };

    setCombos((prev) => [newCombo, ...prev]);
    setFilter("Draft");
    setModalOpen(false);
    resetModal();
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("menu.combos.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">{t("menu.combos.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 rounded-[9px] bg-[#0D6EFD] px-3 py-[7px] text-[12px] font-medium text-white transition-colors hover:opacity-90"
        >
          <Plus size={13} />
          {t("menu.combos.createCombo")}
        </button>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {comboStats.map((card) => (
          <StatCard key={card.id} data={card} />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers3 size={15} className="text-[var(--octo-text-muted)]" />
          <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("menu.combos.allCombos")}</h2>
        </div>
        <Segmented
          value={filter}
          onChange={(id) => setFilter(id as ComboStatus)}
          options={[
            { id: "Active", label: t("menu.combos.filter.active") },
            { id: "Inactive", label: t("menu.combos.filter.inactive") },
            { id: "Draft", label: t("menu.combos.filter.draft") },
          ]}
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((combo) => (
          <article key={combo.id} className="flex flex-col overflow-hidden rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)]">
            <div className="flex h-24 items-center justify-center bg-gradient-to-br from-[#0D6EFD]/10 to-[#6C4DFF]/10 text-[#0D6EFD]">
              <Layers3 size={26} strokeWidth={1.5} />
            </div>
            <div className="flex flex-1 flex-col gap-2.5 px-[16px] py-[13px]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{combo.nameEn}</h3>
                  <p className="text-[11px] text-[var(--octo-text-faint)]">{combo.nameAr}</p>
                </div>
                <Badge tone={STATUS_TONE[combo.status]}>{t(labelKey(combo.status))}</Badge>
              </div>

              <p className="text-[11.5px] leading-relaxed text-[var(--octo-text-secondary)]">
                {combo.components.map((c) => `${c.qty}× ${c.itemNameEn}`).join(", ")}
              </p>

              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[11px] text-[var(--octo-text-faint)] line-through">SAR {combo.individualTotal.toFixed(2)}</span>
                  <span className="text-[16px] font-bold text-[var(--octo-text-primary)]">SAR {combo.comboPrice.toFixed(2)}</span>
                </div>
                <span className="text-[11px] font-semibold text-[#16a34a]">
                  {t("menu.combos.save").replace("{amount}", combo.saving.toFixed(2))}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-[var(--octo-text-muted)]">{t(labelKey(combo.availabilityWindow))}</span>
                <span className={`font-semibold ${marginClass(combo.marginPct)}`}>{combo.marginPct.toFixed(1)}%</span>
              </div>
            </div>
          </article>
        ))}
      </div>

      {rows.length === 0 && (
        <p className="mt-6 text-center text-[12.5px] text-[var(--octo-text-muted)]">{t("menu.combos.emptyFilter")}</p>
      )}

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); resetModal(); }}
        title={t("menu.combos.createCombo")}
        className="max-w-xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => { setModalOpen(false); resetModal(); }}
              className="rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-[7px] text-[12px] font-medium text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={createCombo}
              disabled={!nameEn.trim() || priceNum <= 0}
              className="rounded-[9px] bg-[#0D6EFD] px-3 py-[7px] text-[12px] font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("menu.combos.createCombo")}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                {t("menu.combos.modal.nameEn")}
              </span>
              <input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="rounded-[9px] border border-[var(--octo-border-input)] px-3 py-2 text-[12.5px]"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                {t("menu.combos.modal.nameAr")}
              </span>
              <input
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                dir="rtl"
                className="rounded-[9px] border border-[var(--octo-border-input)] px-3 py-2 text-[12.5px]"
              />
            </label>
          </div>

          <div>
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              {t("menu.combos.modal.items")}
            </span>
            <div className="mt-1.5 flex flex-col gap-1.5">
              {lines.map((line, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <Select
                    value={line.itemId}
                    onChange={(e) => updateLine(index, { itemId: e.target.value })}
                    className="flex-1"
                  >
                    {menuItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nameEn} — SAR {item.price.toFixed(2)}
                      </option>
                    ))}
                  </Select>
                  <input
                    type="number"
                    min={1}
                    value={line.qty}
                    onChange={(e) => updateLine(index, { qty: Math.max(1, Number(e.target.value)) })}
                    className="w-16 rounded-[9px] border border-[var(--octo-border-input)] px-2 py-2 text-[12.5px]"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    aria-label={t("menu.combos.modal.removeItem")}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-[var(--octo-text-muted)] hover:bg-[var(--octo-hover)] hover:text-[#dc2626]"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addLine}
              className="mt-1.5 flex items-center gap-1 text-[11.5px] font-medium text-[#0D6EFD]"
            >
              <Plus size={12} />
              {t("menu.combos.modal.addItem")}
            </button>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              {t("menu.combos.modal.price")}
            </span>
            <input
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="rounded-[9px] border border-[var(--octo-border-input)] px-3 py-2 text-[12.5px]"
            />
          </label>

          <div className="grid grid-cols-3 gap-2 rounded-[9px] bg-[var(--octo-hover)] px-3 py-2.5">
            <div>
              <p className="text-[10px] uppercase text-[var(--octo-text-faint)]">{t("menu.combos.modal.individualTotal")}</p>
              <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">SAR {individualTotal.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-[var(--octo-text-faint)]">{t("menu.combos.modal.saving")}</p>
              <p className="text-[13px] font-semibold text-[#16a34a]">SAR {liveSaving.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-[var(--octo-text-faint)]">{t("menu.combos.modal.margin")}</p>
              <p className={`text-[13px] font-semibold ${marginClass(liveMargin)}`}>{liveMargin.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
