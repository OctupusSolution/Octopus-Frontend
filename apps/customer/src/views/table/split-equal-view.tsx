"use client";

import { useState } from "react";
import { useI18n } from "@/app/providers";
import { useOrderingSession } from "@/entities/order";
import { useTableCheckout } from "@/features/table/checkout";
import { TABLE_ROUTES } from "@/shared/lib/table-flow";
import { TableAddButton, TableAvatar, TableBackTitle, TableButton, TableIcon, TableMoney } from "@/shared/ui/table";
import { TableFooter, TableTopCard } from "@/widgets/table-shell";
import { PayEmpty } from "./pay-shared";
import { PersonModal, SmallMoneyRow, useSplitBill } from "./split-shared";

/** Split the bill equally: name the people at the table, and each owes the same. */
export function TableSplitEqualView() {
  const { t } = useI18n();
  const { state } = useOrderingSession();
  const { split, addPerson, removePerson } = useTableCheckout();
  const { bill, shares } = useSplitBill();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const people = split.people;
  const perPerson = people.length > 0 ? shares[people[0].id] ?? 0 : 0;

  return (
    <div className="flex flex-col gap-4">
      <TableTopCard />

      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-3 px-4">
          <TableBackTitle
            title={t("store.table.splitEqualTitle")}
            backHref={TABLE_ROUTES.paySummary}
            backLabel={t("store.table.back")}
          />

          {state.lines.length === 0 ? (
            <PayEmpty />
          ) : (
            <>
              <div className="flex flex-col gap-4 rounded-[24px] border border-gray-300 bg-white p-3">
                <div className="flex items-start gap-4">
                  <p className="min-w-0 flex-1 text-[12px] font-medium leading-[1.4] text-[var(--octo-store-select-label)]">
                    {t("store.table.splitEqualHint")}
                  </p>
                  {people.length > 0 && (
                    <button
                      type="button"
                      aria-pressed={editing}
                      onClick={() => setEditing((v) => !v)}
                      className="shrink-0 rounded-full bg-[var(--octo-store-select-soft)] px-3 py-2 text-[12px] font-semibold leading-[12px] text-[var(--octo-store-select-text)]"
                    >
                      {t("store.table.editPerson")}
                    </button>
                  )}
                </div>

                {people.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {people.map((person) => (
                      <li key={person.id} className="flex items-center gap-2">
                        <TableAvatar name={person.name} />
                        <span className="text-[14px] font-semibold leading-[14px] text-black">{person.name}</span>
                        {editing && person.status !== "paid" && (
                          <button
                            type="button"
                            aria-label={t("store.table.removePerson", { name: person.name })}
                            onClick={() => removePerson(person.id)}
                          >
                            <TableIcon name="remove-16" size={16} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <TableAddButton label={t("store.table.addPerson")} onClick={() => setModalOpen(true)} />
              </div>

              {people.length === 0 ? (
                <div className="flex items-center justify-between rounded-[24px] bg-gray-100 p-3">
                  <span className="text-[16px] font-medium leading-none text-gray-900">{t("store.table.total")}</span>
                  <TableMoney
                    amount={bill.payableSar}
                    className="text-[20px] font-bold text-ocean-blue"
                    currencyClassName="text-[12.9px]"
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-2 rounded-[24px] bg-gray-100 px-3 py-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between rounded-[12px] bg-white p-2">
                      <span className="text-[16px] font-medium leading-none text-gray-900">
                        {t("store.table.perPerson")}
                      </span>
                      <TableMoney
                        amount={perPerson}
                        className="text-[20px] font-bold text-ocean-blue"
                        currencyClassName="text-[12.9px]"
                      />
                    </div>
                    <div className="flex flex-col gap-4 border-b border-gray-300 pb-3">
                      <SmallMoneyRow label={t("store.cart.basePrice")} amountSar={bill.baseSar + bill.addonsSar} />
                      <SmallMoneyRow label={t("store.fulfillment.serviceFee")} amountSar={bill.serviceFeeSar} />
                      <SmallMoneyRow label={t("store.fulfillment.vat")} amountSar={bill.vatSar} />
                      {bill.discountSar > 0 && (
                        <SmallMoneyRow label={t("store.table.discountValue")} amountSar={-bill.discountSar} />
                      )}
                      <SmallMoneyRow label={t("store.fulfillment.tip")} amountSar={bill.tipSar} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] leading-[14px] text-gray-900">{t("store.table.total")}</span>
                    <TableMoney
                      amount={bill.payableSar}
                      className="text-[16px] font-semibold text-gray-900"
                      currencyClassName="text-[10.32px]"
                    />
                  </div>
                </div>
              )}

              {people.length > 0 ? (
                <TableButton href={TABLE_ROUTES.splitReview}>{t("store.table.reviewSplit")}</TableButton>
              ) : (
                <TableButton disabled>{t("store.table.reviewSplit")}</TableButton>
              )}
            </>
          )}
        </div>

        <TableFooter />
      </div>

      <PersonModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={(name) => {
          addPerson(name);
          setModalOpen(false);
        }}
      />
    </div>
  );
}
