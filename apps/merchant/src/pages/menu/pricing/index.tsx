import { useMemo, useState } from "react";
import { Grid3x3 } from "lucide-react";
import { Select } from "@ui/primitives";
import {
  branches,
  branchPriceFactor,
  effectiveDateRanges,
  priceChannels,
  priceLists,
  pricingItems,
  type Branch,
  type PriceChannel,
} from "@/shared/api/mock-menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { labelKey } from "@/shared/lib/labels";

function roundHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

function cellKey(listId: string, itemId: string, channel: PriceChannel): string {
  return `${listId}:${itemId}:${channel}`;
}

export function MenuPricingPage() {
  const { t } = useI18n();
  const [listId, setListId] = useState(priceLists[0].id);
  const [branch, setBranch] = useState<Branch>(branches[0]);
  const [effectiveRange, setEffectiveRange] = useState<string>(effectiveDateRanges[0]);
  const [pending, setPending] = useState<Record<string, number>>({});
  const [published, setPublished] = useState<Record<string, number>>({});

  const list = priceLists.find((l) => l.id === listId) ?? priceLists[0];
  const branchFactor = branchPriceFactor[branch];

  const rows = useMemo(
    () =>
      pricingItems.map((item) => {
        const formula = Object.fromEntries(
          priceChannels.map((ch) => [
            ch.id,
            roundHalf(item.basePrice * list.channelMultipliers[ch.id] * branchFactor),
          ])
        ) as Record<PriceChannel, number>;
        return { ...item, formula };
      }),
    [list, branchFactor]
  );

  const dirtyCount = Object.keys(pending).length;

  function effectivePrice(itemId: string, channel: PriceChannel, formula: number): number {
    const key = cellKey(listId, itemId, channel);
    return pending[key] ?? published[key] ?? formula;
  }

  function commitCell(itemId: string, channel: PriceChannel, value: number) {
    const key = cellKey(listId, itemId, channel);
    setPending((prev) => ({ ...prev, [key]: value }));
  }

  function discard() {
    setPending({});
  }

  function publish() {
    setPublished((prev) => ({ ...prev, ...pending }));
    setPending({});
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("menu.pricing.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">{t("menu.pricing.subtitle")}</p>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Select value={listId} onChange={(e) => setListId(e.target.value)} className="w-[180px]">
          {priceLists.map((l) => (
            <option key={l.id} value={l.id}>
              {t(labelKey(l.nameEn))}
            </option>
          ))}
        </Select>
        <Select value={branch} onChange={(e) => setBranch(e.target.value as Branch)} className="w-[170px]">
          {branches.map((b) => (
            <option key={b} value={b}>
              {t(labelKey(b))}
            </option>
          ))}
        </Select>
        <Select value={effectiveRange} onChange={(e) => setEffectiveRange(e.target.value)} className="w-[160px]">
          {effectiveDateRanges.map((r) => (
            <option key={r} value={r}>
              {t(labelKey(r))}
            </option>
          ))}
        </Select>
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center gap-2">
          <Grid3x3 size={15} className="text-[var(--octo-text-muted)]" />
          <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("menu.pricing.matrix")}</h2>
        </div>

        <div className="octo-scroll mt-3 overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--octo-divider)] text-start">
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                  {t("menu.pricing.col.item")}
                </th>
                <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                  {t("menu.pricing.col.basePrice")}
                </th>
                {priceChannels.map((ch) => (
                  <th
                    key={ch.id}
                    className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]"
                  >
                    {t(labelKey(ch.label))}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.itemId} className="border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]">
                  <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">{row.itemNameEn}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">SAR {row.basePrice.toFixed(2)}</td>
                  {priceChannels.map((ch) => {
                    const value = effectivePrice(row.itemId, ch.id, row.formula[ch.id]);
                    return (
                      <PriceCell
                        key={ch.id}
                        base={row.basePrice}
                        value={value}
                        onCommit={(v) => commitCell(row.itemId, ch.id, v)}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {dirtyCount > 0 && (
        <div className="sticky bottom-0 z-10 mt-3 flex items-center gap-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-3 shadow-[0_-4px_16px_rgba(15,23,42,0.06)]">
          <span className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">
            {t("menu.pricing.changedCount").replace("{n}", String(dirtyCount))}
          </span>
          <div className="ms-auto flex items-center gap-2">
            <button
              type="button"
              onClick={discard}
              className="rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-[7px] text-[12px] font-medium text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
            >
              {t("menu.pricing.discard")}
            </button>
            <button
              type="button"
              onClick={publish}
              className="rounded-[9px] bg-[#0D6EFD] px-3 py-[7px] text-[12px] font-medium text-white hover:opacity-90"
            >
              {t("menu.pricing.publish")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PriceCell({ base, value, onCommit }: { base: number; value: number; onCommit: (v: number) => void }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value.toFixed(2));

  const deltaPct = ((value - base) / base) * 100;
  const deltaLabel = Math.abs(deltaPct) < 0.05 ? "=" : `${deltaPct > 0 ? "+" : "−"}${Math.abs(deltaPct).toFixed(0)}%`;
  const tint = deltaPct > 0.05 ? "bg-info/10" : deltaPct < -0.05 ? "bg-warning/10" : "";

  function commit() {
    const n = Number(draft);
    if (Number.isFinite(n) && n > 0) onCommit(Math.round(n * 100) / 100);
    setEditing(false);
  }

  return (
    <td className={`whitespace-nowrap px-2 py-2 ${tint}`}>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setDraft(value.toFixed(2)); setEditing(false); }
          }}
          className="w-20 rounded-[6px] border border-[#0D6EFD] px-1.5 py-1 text-[12.5px]"
        />
      ) : (
        <button
          type="button"
          onClick={() => { setDraft(value.toFixed(2)); setEditing(true); }}
          aria-label={t("menu.pricing.editCell")}
          className="w-full rounded-[6px] px-1.5 py-1 text-start font-medium text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
        >
          SAR {value.toFixed(2)}
        </button>
      )}
      <div className="px-1.5 text-[10.5px] text-[var(--octo-text-faint)]">{deltaLabel}</div>
    </td>
  );
}
