import { useMemo, useState } from "react";
import { CircleAlert, Clock3, RefreshCw, RotateCcw, TriangleAlert } from "lucide-react";
import { Modal, Select } from "@ui/primitives";
import {
  availabilityBoard,
  branches,
  type AvailabilityCard,
  type AvailabilityStatus,
  type Branch,
  type EightySixReason,
} from "@/shared/api/mock-menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { labelKey } from "@/shared/lib/labels";

const COLUMNS: { id: AvailabilityStatus; accent: string; dot: string }[] = [
  { id: "Available", accent: "border-s-[#22C55E]", dot: "bg-[#22C55E]" },
  { id: "Low Stock", accent: "border-s-[#F59E0B]", dot: "bg-[#F59E0B]" },
  { id: "86'd", accent: "border-s-[#EF4444]", dot: "bg-[#EF4444]" },
];

const REASONS: EightySixReason[] = ["Out of stock", "Quality issue", "Supplier delay", "Prep time"];

export function MenuAvailabilityPage() {
  const { t } = useI18n();
  const [cards, setCards] = useState<AvailabilityCard[]>(availabilityBoard as unknown as AvailabilityCard[]);
  const [branchFilter, setBranchFilter] = useState<Branch | "all">("all");
  const [reasonPrompt, setReasonPrompt] = useState<string | null>(null);
  const [reason, setReason] = useState<EightySixReason>("Out of stock");

  const visibleCards = useMemo(
    () => (branchFilter === "all" ? cards : cards.filter((c) => c.branch === branchFilter)),
    [cards, branchFilter]
  );

  const eightySixCards = cards.filter((c) => c.status === "86'd");
  const affectedBranches = new Set(eightySixCards.map((c) => c.branch)).size;

  function moveCard(id: string, status: AvailabilityStatus, withReason?: EightySixReason) {
    setCards((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status,
              remainingCount: status === "Available" ? undefined : c.remainingCount,
              reason: status === "86'd" ? withReason : undefined,
              by: status === "86'd" ? "You" : undefined,
              at: status === "86'd" ? t("common.justNow") : undefined,
            }
          : c
      )
    );
  }

  function confirmEightySix() {
    if (!reasonPrompt) return;
    moveCard(reasonPrompt, "86'd", reason);
    setReasonPrompt(null);
    setReason("Out of stock");
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("menu.availability.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">{t("menu.availability.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[11.5px] text-[var(--octo-text-muted)]">
            <RefreshCw size={12} />
            {t("menu.availability.updatedAgo")}
          </span>
          <Select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value as Branch | "all")} className="w-[170px]">
            <option value="all">{t("menu.availability.allBranches")}</option>
            {branches.map((b) => (
              <option key={b} value={b}>
                {t(labelKey(b))}
              </option>
            ))}
          </Select>
        </div>
      </header>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-error/20 bg-error/10 px-[18px] py-3">
        <TriangleAlert size={15} className="text-[#dc2626]" />
        <span className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">
          {t("menu.availability.counterStrip")
            .replace("{items}", String(eightySixCards.length))
            .replace("{branches}", String(affectedBranches))}
        </span>
      </div>

      <div className="octo-scroll mt-3 flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((col) => {
          const columnCards = visibleCards.filter((c) => c.status === col.id);
          return (
            <div key={col.id} className="flex w-[300px] shrink-0 flex-col rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-row-hover)]">
              <div className="flex items-center gap-2 border-b border-[var(--octo-border-card)] px-3 py-2.5">
                <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                <h2 className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t(labelKey(col.id))}</h2>
                <span className="ms-auto rounded-full bg-[var(--octo-track)] px-1.5 py-0.5 text-[10.5px] font-medium text-[var(--octo-text-secondary)]">
                  {columnCards.length}
                </span>
              </div>

              <div className="octo-scroll flex max-h-[560px] flex-col gap-2 overflow-y-auto p-2">
                {columnCards.map((card) => (
                  <article key={card.id} className={`rounded-[10px] border-s-[3px] bg-[var(--octo-card)] p-3 shadow-sm ${col.accent}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{card.nameEn}</h3>
                        <p className="text-[11px] text-[var(--octo-text-faint)]">{card.nameAr}</p>
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--octo-text-muted)]">
                      {t(labelKey(card.categoryLabel))} · {t(labelKey(card.branch))}
                    </p>

                    {card.status === "Low Stock" && card.remainingCount !== undefined && (
                      <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-[#c2660a]">
                        <CircleAlert size={11} />
                        {t("menu.availability.remaining").replace("{n}", String(card.remainingCount))}
                      </p>
                    )}

                    {card.status === "86'd" && (
                      <div className="mt-1.5 flex flex-col gap-0.5 text-[11px] text-[var(--octo-text-muted)]">
                        <span className="flex items-center gap-1">
                          <Clock3 size={11} />
                          {t("menu.availability.by")
                            .replace("{name}", card.by ? t(labelKey(card.by)) : "")
                            .replace("{time}", card.at ? t(labelKey(card.at)) : "")}
                        </span>
                        {card.reason && <span>{t(labelKey(card.reason))}</span>}
                      </div>
                    )}

                    <div className="mt-2.5 flex items-center gap-2">
                      {card.status === "Available" && (
                        <button
                          type="button"
                          onClick={() => moveCard(card.id, "Low Stock")}
                          className="rounded-[7px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2.5 py-1 text-[11px] font-medium text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
                        >
                          {t("menu.availability.action.markLowStock")}
                        </button>
                      )}
                      {card.status === "Low Stock" && (
                        <>
                          <button
                            type="button"
                            onClick={() => moveCard(card.id, "Available")}
                            className="flex items-center gap-1 rounded-[7px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2.5 py-1 text-[11px] font-medium text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
                          >
                            <RotateCcw size={11} />
                            {t("menu.availability.action.restock")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setReasonPrompt(card.id)}
                            className="rounded-[7px] bg-error/10 px-2.5 py-1 text-[11px] font-medium text-[#dc2626] hover:opacity-90"
                          >
                            {t("menu.availability.action.86")}
                          </button>
                        </>
                      )}
                      {card.status === "86'd" && (
                        <button
                          type="button"
                          onClick={() => moveCard(card.id, "Available")}
                          className="flex items-center gap-1 rounded-[7px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2.5 py-1 text-[11px] font-medium text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
                        >
                          <RotateCcw size={11} />
                          {t("menu.availability.action.restock")}
                        </button>
                      )}
                    </div>
                  </article>
                ))}

                {columnCards.length === 0 && (
                  <p className="px-2 py-6 text-center text-[11.5px] text-[var(--octo-text-faint)]">
                    {t("menu.availability.emptyColumn")}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={!!reasonPrompt}
        onClose={() => setReasonPrompt(null)}
        title={t("menu.availability.reasonModal.title")}
        footer={
          <>
            <button
              type="button"
              onClick={() => setReasonPrompt(null)}
              className="rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-[7px] text-[12px] font-medium text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={confirmEightySix}
              className="rounded-[9px] bg-[#EF4444] px-3 py-[7px] text-[12px] font-medium text-white hover:opacity-90"
            >
              {t("menu.availability.action.86")}
            </button>
          </>
        }
      >
        <Select label={t("menu.availability.reasonModal.label")} value={reason} onChange={(e) => setReason(e.target.value as EightySixReason)}>
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {t(labelKey(r))}
            </option>
          ))}
        </Select>
      </Modal>
    </div>
  );
}
