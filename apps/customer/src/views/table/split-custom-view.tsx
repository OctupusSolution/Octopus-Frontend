"use client";

import { useState } from "react";
import { useI18n } from "@/app/providers";
import { useOrderingSession } from "@/entities/order";
import { useTableCheckout } from "@/features/table/checkout";
import { TABLE_ROUTES } from "@/shared/lib/table-flow";
import type { SplitPerson } from "@/shared/lib/table-split";
import { TableAddButton, TableBackTitle, TableButton, TableIcon } from "@/shared/ui/table";
import { TableFooter, TableTopCard } from "@/widgets/table-shell";
import { PayEmpty } from "./pay-shared";
import { PersonAmount, PersonModal, SplitProgressPanel, useSplitBill } from "./split-shared";

const ROW_ACTION = "flex size-10 shrink-0 items-center justify-center rounded-[12px]";

/** Split by custom amounts: each person is added with what they will pay. */
export function TableSplitCustomView() {
  const { t } = useI18n();
  const { state } = useOrderingSession();
  const { split, addPerson, updatePerson, removePerson } = useTableCheckout();
  const { shares } = useSplitBill();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SplitPerson | null>(null);

  const people = split.people;

  function openModal(person: SplitPerson | null) {
    setEditing(person);
    setModalOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <TableTopCard />

      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-3 px-4">
          <TableBackTitle
            title={t("store.table.splitCustomTitle")}
            backHref={TABLE_ROUTES.paySummary}
            backLabel={t("store.table.back")}
          />

          {state.lines.length === 0 ? (
            <PayEmpty />
          ) : (
            <>
              {people.length === 0 ? (
                <div className="flex flex-col gap-4 rounded-[24px] border border-gray-300 bg-white p-3">
                  <p className="text-[12px] font-medium leading-[1.4] text-[var(--octo-store-select-label)]">
                    {t("store.table.splitCustomHint")}
                  </p>
                  <TableAddButton label={t("store.table.addPerson")} onClick={() => openModal(null)} />
                </div>
              ) : (
                <>
                  {people.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center justify-between gap-3 rounded-[24px] border border-gray-300 bg-white p-3"
                    >
                      <PersonAmount person={person} amountSar={shares[person.id] ?? 0} />
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          aria-label={`${t("store.table.editPerson")} ${person.name}`}
                          onClick={() => openModal(person)}
                          className={`${ROW_ACTION} bg-[var(--octo-store-chip)]`}
                        >
                          <TableIcon name="edit" />
                        </button>
                        <button
                          type="button"
                          aria-label={t("store.table.removePerson", { name: person.name })}
                          onClick={() => removePerson(person.id)}
                          className={`${ROW_ACTION} bg-[var(--octo-store-danger-soft)]`}
                        >
                          <TableIcon name="remove-24" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <TableAddButton label={t("store.table.addPerson")} onClick={() => openModal(null)} />
                </>
              )}

              <SplitProgressPanel />

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
        withAmount
        editing={editing}
        onSubmit={(name, amountSar) => {
          if (editing) updatePerson(editing.id, name, amountSar);
          else addPerson(name, amountSar);
          setModalOpen(false);
        }}
      />
    </div>
  );
}
