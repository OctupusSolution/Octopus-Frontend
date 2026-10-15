"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useI18n } from "@/app/providers";
import { useOrderingSession } from "@/entities/order";
import { useTableCheckout } from "@/features/table/checkout";
import { computeTableBill } from "@/shared/lib/table-flow";
import { personShares, splitTotals, type SplitPerson } from "@/shared/lib/table-split";
import { TableAvatar, TableButton, TableField, TableModal, TableMoney } from "@/shared/ui/table";

/** The bill being shared and what each person owes of it, for every split screen. */
export function useSplitBill() {
  const { state } = useOrderingSession();
  const { split } = useTableCheckout();
  const bill = computeTableBill(state.lines, state.tipSar, state.promoCode);
  const shares = personShares(split, state.lines, bill.payableSar);
  return { bill, shares, totals: splitTotals(split, shares, bill.payableSar) };
}

/** A person with what they owe: the avatar at the inline start, then name over amount. */
export function PersonAmount({ person, amountSar }: { person: SplitPerson; amountSar: number }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <TableAvatar name={person.name} />
      <div className="flex min-w-0 flex-col gap-2">
        <p className="truncate text-[12px] font-medium leading-[12px] text-gray-900">{person.name}</p>
        <TableMoney
          amount={amountSar}
          className="text-[14px] font-bold !leading-[14px] text-[var(--octo-store-select-text)]"
          currencyClassName="text-[9.03px]"
        />
      </div>
    </div>
  );
}

const SMALL_ROW = "flex items-center justify-between";
const SMALL_LABEL = "text-[14px] leading-[14px] text-gray-900";

export function SmallMoneyRow({ label, amountSar }: { label: string; amountSar: number }) {
  return (
    <div className={SMALL_ROW}>
      <span className={SMALL_LABEL}>{label}</span>
      <TableMoney
        amount={amountSar}
        padded
        className="text-[14px] font-medium text-gray-900"
        currencyClassName="text-[7.74px] font-normal"
      />
    </div>
  );
}

/** Paid, unpaid and what is left — the panel under the review and custom lists. */
export function SplitProgressPanel() {
  const { t } = useI18n();
  const { totals } = useSplitBill();

  return (
    <div className="flex flex-col gap-2 rounded-[24px] bg-gray-100 px-3 py-4">
      <div className="flex flex-col gap-4 border-b border-gray-300 pb-3">
        <SmallMoneyRow label={t("store.table.paidValue")} amountSar={totals.paidSar} />
        <SmallMoneyRow label={t("store.table.unpaidValue")} amountSar={totals.unpaidSar} />
      </div>
      <div className={SMALL_ROW}>
        <span className={SMALL_LABEL}>{t("store.table.remaining")}</span>
        <TableMoney
          amount={totals.remainingSar}
          className="text-[16px] font-semibold text-[var(--octo-store-select-text)]"
          currencyClassName="text-[10.32px]"
        />
      </div>
    </div>
  );
}

export interface PersonModalProps {
  open: boolean;
  onClose: () => void;
  /** The custom split also asks what the person will pay. */
  withAmount?: boolean;
  /** Set when an existing person is being edited rather than added. */
  editing?: SplitPerson | null;
  /** Shown above the form: people already at the table, one tap to pick. */
  quickPick?: ReactNode;
  onSubmit: (name: string, amountSar?: number) => void;
}

export function PersonModal({ open, onClose, withAmount, editing, quickPick, onSubmit }: PersonModalProps) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setAmount(editing?.amountSar ? String(editing.amountSar) : "");
  }, [open, editing]);

  const parsed = Number.parseFloat(amount);
  const valid = name.trim().length > 0 && (!withAmount || (Number.isFinite(parsed) && parsed > 0));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid) return;
    onSubmit(name.trim(), withAmount ? Math.round(parsed * 100) / 100 : undefined);
  }

  return (
    <TableModal open={open} onClose={onClose} label={t("store.table.addPersonTitle")}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col items-center gap-4">
          <div className="flex w-full flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/table/add-user.gif" alt="" className="size-[136px]" />
            <div className="flex w-full flex-col gap-2 text-center">
              <h2 className="text-[18px] font-bold leading-none text-gray-900">{t("store.table.addPersonTitle")}</h2>
              <p className="text-[14px] font-medium leading-[1.4] text-[var(--octo-store-select-label)]">
                {t(withAmount ? "store.table.addPersonAmountBody" : "store.table.addPersonBody")}
              </p>
            </div>
          </div>

          {quickPick}

          <div className="flex w-full flex-col gap-3">
            <TableField
              label={t("store.table.personName")}
              value={name}
              onChange={setName}
              placeholder={t("store.table.personNamePlaceholder")}
              autoFocus
            />
            {withAmount && (
              <TableField
                label={t("store.table.personAmount")}
                value={amount}
                onChange={setAmount}
                placeholder={t("store.table.personAmountPlaceholder")}
                inputMode="decimal"
                suffix={t("store.currency")}
              />
            )}
          </div>
        </div>

        <TableButton type="submit" disabled={!valid}>
          {t(editing ? "store.table.save" : "store.table.add")}
        </TableButton>
      </form>
    </TableModal>
  );
}
