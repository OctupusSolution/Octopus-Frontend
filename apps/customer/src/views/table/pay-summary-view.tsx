"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MenuItem } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { useOrderingSession } from "@/entities/order";
import { useTableCheckout } from "@/features/table/checkout";
import { shareLink } from "@/shared/lib/share-link";
import { computeTableBill, SPLIT_ROUTES, TABLE_ROUTES } from "@/shared/lib/table-flow";
import type { SplitMode } from "@/shared/lib/table-split";
import { TableBackTitle, TableButton, TableIcon, TableMoney, TableRadio, TableSheet } from "@/shared/ui/table";
import { TablePromoField, TableTotals } from "@/widgets/table-order";
import { TableFooter, TableTopCard } from "@/widgets/table-shell";
import { billRows, PayEmpty, PayLineCards } from "./pay-shared";

export interface TablePaySummaryViewProps {
  items: MenuItem[];
}

const SPLITS = [
  { id: "full", titleKey: "store.table.splitFull", bodyKey: "store.table.splitFullBody" },
  { id: "equal", titleKey: "store.table.splitEqual", bodyKey: "store.table.splitEqualBody" },
  { id: "items", titleKey: "store.table.splitItems", bodyKey: "store.table.splitItemsBody" },
  { id: "custom", titleKey: "store.table.splitCustom", bodyKey: "store.table.splitCustomBody" },
] as const;

const TIP_PERCENTS = [5, 10, 15] as const;
type TipChoice = (typeof TIP_PERCENTS)[number] | "custom";

const CHOICE_ON = "border-ocean-blue bg-[var(--octo-store-select-soft)]";
const CHOICE_OFF = "border-gray-300";
const AMOUNT = "font-bold text-ocean-blue";

const round2 = (n: number): number => Math.round(n * 100) / 100;

interface SplitSheetProps {
  open: boolean;
  onClose: () => void;
  payableSar: number;
  initial: SplitMode;
  onContinue: (mode: SplitMode) => void;
}

function SplitSheet({ open, onClose, payableSar, initial, onContinue }: SplitSheetProps) {
  const { t } = useI18n();
  const [split, setSplit] = useState<SplitMode>(initial);

  return (
    <TableSheet open={open} onClose={onClose} label={t("store.table.splitTitle")}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-6">
          <h2 className="text-[18px] font-bold leading-none text-gray-900">{t("store.table.splitTitle")}</h2>

          <div role="radiogroup" aria-label={t("store.table.splitTitle")} className="flex flex-col gap-4">
            {SPLITS.map((option) => {
              const selected = split === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setSplit(option.id)}
                  className={`flex w-full items-center gap-2 rounded-[24px] border px-3 py-2 text-start ${
                    selected ? CHOICE_ON : CHOICE_OFF
                  }`}
                >
                  <TableRadio checked={selected} />
                  <span className="flex min-w-0 flex-1 flex-col gap-2 leading-none">
                    <span
                      className={`text-[14px] font-semibold ${
                        selected ? "text-[var(--octo-store-select-text)]" : "text-gray-900"
                      }`}
                    >
                      {t(option.titleKey)}
                    </span>
                    <span className="tbl-wrap-safe text-[12px] text-[var(--octo-store-select-label)]">{t(option.bodyKey)}</span>
                  </span>
                  {option.id === "full" && (
                    <TableMoney
                      amount={payableSar}
                      className={`text-[16px] ${AMOUNT}`}
                      currencyClassName="text-[10.32px]"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <TableButton onClick={() => onContinue(split)}>{t("store.table.continuePayment")}</TableButton>
      </div>
    </TableSheet>
  );
}

interface TipSheetProps {
  open: boolean;
  onClose: () => void;
  choice: TipChoice;
  onChoose: (choice: TipChoice) => void;
  /** What a percentage is taken of: the bill before any tip. */
  tipBaseSar: number;
  customValue: string;
  onCustomChange: (value: string) => void;
  onContinue: () => void;
  onSkip: () => void;
}

function TipSheet({
  open, onClose, choice, onChoose, tipBaseSar, customValue, onCustomChange, onContinue, onSkip,
}: TipSheetProps) {
  const { t } = useI18n();
  const { state } = useOrderingSession();
  const bill = computeTableBill(state.lines, state.tipSar, state.promoCode);
  const customSelected = choice === "custom";

  return (
    <TableSheet open={open} onClose={onClose} label={t("store.table.tipTitle")}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 leading-none">
            <h2 className="text-[18px] font-bold text-gray-900">{t("store.table.tipTitle")}</h2>
            <p className="tbl-wrap-safe text-[12px] text-[var(--octo-store-select-label)]">{t("store.table.tipNote")}</p>
          </div>

          <div role="radiogroup" aria-label={t("store.table.tipTitle")} className="flex flex-col gap-4">
            {TIP_PERCENTS.map((percent) => {
              const selected = choice === percent;
              return (
                <button
                  key={percent}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChoose(percent)}
                  className={`flex w-full items-center gap-2 rounded-[24px] border px-3 py-2 ${
                    selected ? CHOICE_ON : CHOICE_OFF
                  }`}
                >
                  <TableRadio checked={selected} />
                  <span
                    className={`min-w-0 flex-1 text-start text-[12px] font-medium leading-none ${
                      selected ? "text-[var(--octo-store-select-text)]" : "text-gray-900"
                    }`}
                  >
                    {t("store.table.tipPercent", { n: percent })}
                  </span>
                  <TableMoney
                    amount={round2((tipBaseSar * percent) / 100)}
                    className={`text-[14px] ${AMOUNT}`}
                    currencyClassName="text-[9.03px]"
                  />
                </button>
              );
            })}

            <div
              className={`flex flex-col gap-2 rounded-[24px] border px-3 py-2 ${
                customSelected ? CHOICE_ON : CHOICE_OFF
              }`}
            >
              <button
                type="button"
                role="radio"
                aria-checked={customSelected}
                onClick={() => onChoose("custom")}
                className="flex w-full items-center gap-2 text-[12px] font-medium leading-none text-gray-900"
              >
                <TableRadio checked={customSelected} />
                {t("store.table.tipCustom")}
              </button>
              {customSelected && (
                <label className="flex h-10 items-center gap-2 rounded-[12px] border border-ocean-blue bg-white px-2 py-1">
                  <TableIcon name="money-gray" />
                  <input
                    type="text"
                    inputMode="decimal"
                    autoFocus
                    value={customValue}
                    onChange={(event) => onCustomChange(event.target.value)}
                    placeholder={t("store.table.tipCustomPlaceholder")}
                    aria-label={t("store.table.tipCustomPlaceholder")}
                    className="min-w-0 flex-1 bg-transparent text-[14px] leading-none text-gray-900 outline-none placeholder:text-[var(--octo-store-select-label)]"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="rounded-[24px] bg-gray-100 px-3 py-4">
            <TableTotals
              rows={billRows(t, bill, true)}
              totalLabel={t("store.cart.total")}
              totalSar={bill.payableSar}
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <TableButton onClick={onContinue}>{t("store.table.continuePayment")}</TableButton>
          <button
            type="button"
            onClick={onSkip}
            className="text-[12px] font-bold leading-none text-[var(--octo-store-body)]"
          >
            {t("store.table.tipSkip")}
          </button>
        </div>
      </div>
    </TableSheet>
  );
}

/** The payment summary: the order, a discount code, the bill — then, one sheet
 *  after the other, how the bill is paid and whether a tip is added. */
export function TablePaySummaryView({ items }: TablePaySummaryViewProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { state, setTip } = useOrderingSession();
  const { split, setSplitMode, setPayingPerson } = useTableCheckout();
  const [sheet, setSheet] = useState<"split" | "tip" | null>(null);
  const [tipChoice, setTipChoice] = useState<TipChoice>(5);
  const [customTip, setCustomTip] = useState("");

  const bill = computeTableBill(state.lines, state.tipSar, state.promoCode);
  const tipBaseSar = bill.payableSar - bill.tipSar;
  const percentTip = (percent: number): number => round2((tipBaseSar * percent) / 100);

  function chooseTip(choice: TipChoice) {
    setTipChoice(choice);
    if (choice === "custom") {
      const parsed = Number.parseFloat(customTip);
      setTip(Number.isFinite(parsed) && parsed > 0 ? round2(parsed) : 0);
      return;
    }
    setTip(percentTip(choice));
  }

  function changeCustomTip(value: string) {
    setCustomTip(value);
    const parsed = Number.parseFloat(value);
    setTip(Number.isFinite(parsed) && parsed > 0 ? round2(parsed) : 0);
  }

  function openTipSheet(mode: SplitMode) {
    setSplitMode(mode);
    // The sheet opens on its first suggestion, as drawn; "skip" is one tap away.
    chooseTip(tipChoice);
    setSheet("tip");
  }

  /** Paying in full goes straight to the payment options; a shared bill is set up first. */
  function proceed() {
    setPayingPerson(null);
    router.push(split.mode === "full" ? TABLE_ROUTES.payOptions : SPLIT_ROUTES[split.mode]);
  }

  async function sharePayLink() {
    await shareLink(window.location.href);
  }

  return (
    <div className="flex flex-col gap-4">
      <TableTopCard />

      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-6 px-4">
          <div className="flex flex-col gap-4">
            <div className="px-4">
              <TableBackTitle
                title={t("store.table.paymentSummary")}
                backHref={TABLE_ROUTES.pay}
                backLabel={t("store.table.back")}
              />
            </div>

            {state.lines.length === 0 ? (
              <PayEmpty />
            ) : (
              <>
                <PayLineCards lines={state.lines} items={items} />

                <div className="flex flex-col gap-4 rounded-[28px] bg-gray-100 px-3 py-4">
                  <TablePromoField />
                  <TableTotals
                    rows={billRows(t, bill, false)}
                    totalLabel={t("store.cart.total")}
                    totalSar={bill.payableSar - bill.tipSar}
                  />
                </div>
              </>
            )}
          </div>

          {state.lines.length > 0 && (
            <div className="flex flex-col gap-4">
              <TableButton onClick={() => setSheet("split")}>{t("store.table.continuePayment")}</TableButton>
              <TableButton variant="outline" onClick={sharePayLink}>
                {t("store.table.sendPayLink")}
              </TableButton>
            </div>
          )}
        </div>

        <TableFooter />
      </div>

      <SplitSheet
        open={sheet === "split"}
        onClose={() => setSheet(null)}
        payableSar={bill.payableSar - bill.tipSar}
        initial={split.mode}
        onContinue={openTipSheet}
      />

      <TipSheet
        open={sheet === "tip"}
        onClose={() => {
          // Dismissed, not confirmed: the suggested tip must not ride along.
          setTip(0);
          setSheet(null);
        }}
        choice={tipChoice}
        onChoose={chooseTip}
        tipBaseSar={tipBaseSar}
        customValue={customTip}
        onCustomChange={changeCustomTip}
        onContinue={proceed}
        onSkip={() => {
          setTip(0);
          proceed();
        }}
      />
    </div>
  );
}
