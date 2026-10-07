"use client";

import { useState } from "react";
import type { MenuItem } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { useOrderingSession } from "@/entities/order";
import { useTableCheckout } from "@/features/table/checkout";
import { computeLinePricing } from "@/shared/lib/storefront";
import { TABLE_ROUTES } from "@/shared/lib/table-flow";
import { allLinesAssigned, initials } from "@/shared/lib/table-split";
import { TableAddButton, TableBackTitle, TableButton, TableIcon, TableMoney } from "@/shared/ui/table";
import { TableFooter, TableTopCard } from "@/widgets/table-shell";
import { PayEmpty } from "./pay-shared";
import { PersonModal } from "./split-shared";

export interface TableSplitItemsViewProps {
  items: MenuItem[];
}

const CHIP = "flex size-[34px] items-center justify-center rounded-[24px] bg-gray-100";

/** Split by items: for each thing ordered, say who is paying for it. */
export function TableSplitItemsView({ items }: TableSplitItemsViewProps) {
  const { t } = useI18n();
  const { state } = useOrderingSession();
  const { split, addPerson, toggleAssignment } = useTableCheckout();
  /** The cart line a person is being added to. */
  const [lineId, setLineId] = useState<string | null>(null);

  const ready = split.people.length > 0 && allLinesAssigned(split, state.lines);
  const onLine = lineId ? split.assignments[lineId] ?? [] : [];
  const others = split.people.filter((person) => !onLine.includes(person.id));

  return (
    <div className="flex flex-col gap-4">
      <TableTopCard />

      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-3 px-4">
          <TableBackTitle
            title={t("store.table.splitItemsTitle")}
            backHref={TABLE_ROUTES.paySummary}
            backLabel={t("store.table.back")}
          />

          {state.lines.length === 0 ? (
            <PayEmpty />
          ) : (
            <>
              {state.lines.map((line) => {
                const assigned = (split.assignments[line.lineId] ?? []).flatMap((id) => {
                  const person = split.people.find((p) => p.id === id);
                  return person ? [person] : [];
                });
                const imageUrl = items.find((item) => item.id === line.menuItemId)?.imageUrl;

                return (
                  <div key={line.lineId} className="flex items-center gap-3 rounded-[24px] border border-gray-300 px-3 py-2">
                    <div className="flex size-[67px] shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-[var(--octo-store-tile)]">
                      {imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imageUrl} alt="" className="h-[49px] w-[59px] object-contain" />
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[14px] font-medium leading-none text-gray-900">{line.name}</p>
                        <TableMoney
                          amount={computeLinePricing(line).totalSar}
                          className="text-[16px] font-bold text-[var(--octo-store-price)]"
                          currencyClassName="font-light"
                        />
                      </div>

                      {assigned.length === 0 ? (
                        <TableAddButton
                          size="sm"
                          label={t("store.table.addPerson")}
                          onClick={() => setLineId(line.lineId)}
                        />
                      ) : (
                        <div className="flex flex-wrap items-end gap-2">
                          {assigned.map((person) => (
                            <span key={person.id} className="relative pt-[7px]" title={person.name}>
                              <span
                                className={`${CHIP} border border-[var(--octo-store-select-border)] text-[10px] font-bold leading-[10px] text-[var(--octo-store-select-text)]`}
                              >
                                {initials(person.name)}
                              </span>
                              <button
                                type="button"
                                aria-label={t("store.table.removePerson", { name: person.name })}
                                onClick={() => toggleAssignment(line.lineId, person.id)}
                                className="absolute right-[-5px] top-0"
                              >
                                <TableIcon name="remove-16" size={16} />
                              </button>
                            </span>
                          ))}
                          <button
                            type="button"
                            aria-label={t("store.table.addPerson")}
                            onClick={() => setLineId(line.lineId)}
                            className={`${CHIP} border border-dashed border-ocean-blue`}
                          >
                            <TableIcon name="plus-blue-16" size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {ready ? (
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
        open={lineId !== null}
        onClose={() => setLineId(null)}
        quickPick={
          others.length > 0 ? (
            <div className="flex w-full flex-wrap gap-2">
              {others.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => {
                    if (lineId) toggleAssignment(lineId, person.id);
                    setLineId(null);
                  }}
                  className="flex h-9 items-center rounded-full border border-[var(--octo-store-select-border)] bg-gray-100 px-3 text-[12px] font-semibold leading-none text-[var(--octo-store-select-text)]"
                >
                  {person.name}
                </button>
              ))}
            </div>
          ) : undefined
        }
        onSubmit={(name) => {
          if (lineId) toggleAssignment(lineId, addPerson(name));
          setLineId(null);
        }}
      />
    </div>
  );
}
