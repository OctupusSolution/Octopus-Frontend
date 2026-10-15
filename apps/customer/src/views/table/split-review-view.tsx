"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/app/providers";
import { useOrderingSession } from "@/entities/order";
import { useTableCheckout } from "@/features/table/checkout";
import { shareLink } from "@/shared/lib/share-link";
import { SPLIT_ROUTES, TABLE_ROUTES } from "@/shared/lib/table-flow";
import type { SplitPerson } from "@/shared/lib/table-split";
import { TableBackTitle, TableBadge } from "@/shared/ui/table";
import { TableFooter, TableTopCard } from "@/widgets/table-shell";
import { PayEmpty } from "./pay-shared";
import { PersonAmount, SplitProgressPanel, useSplitBill } from "./split-shared";

const ROW_ACTION = "flex h-10 items-center justify-center rounded-[24px] py-2 text-[14px] font-semibold leading-none";

/** Review the split: one row per person, paid from here or sent on as a link. */
export function TableSplitReviewView() {
  const { t } = useI18n();
  const router = useRouter();
  const { state } = useOrderingSession();
  const { split, markShared, setPayingPerson } = useTableCheckout();
  const { shares } = useSplitBill();

  const backHref = split.mode === "full" ? TABLE_ROUTES.paySummary : SPLIT_ROUTES[split.mode];

  function pay(person: SplitPerson) {
    setPayingPerson(person.id);
    router.push(TABLE_ROUTES.payOptions);
  }

  async function share(person: SplitPerson) {
    // Marked only once the link has actually gone out.
    if (await shareLink(window.location.href)) markShared(person.id);
  }

  return (
    <div className="flex flex-col gap-4">
      <TableTopCard />

      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-3 px-4">
          <TableBackTitle
            title={t("store.table.reviewSplit")}
            backHref={backHref}
            backLabel={t("store.table.back")}
          />

          {state.lines.length === 0 || split.people.length === 0 ? (
            <PayEmpty />
          ) : (
            <>
              <div className="flex flex-col gap-2">
                {split.people.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center justify-between gap-2 rounded-[24px] border border-gray-300 bg-white p-3"
                  >
                    <PersonAmount person={person} amountSar={shares[person.id] ?? 0} />

                    {person.status === "paid" && <TableBadge tone="paid">{t("store.table.paidBadge")}</TableBadge>}
                    {person.status === "shared" && (
                      <TableBadge tone="pending">{t("store.table.linkShared")}</TableBadge>
                    )}
                    {person.status === "unpaid" && (
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => pay(person)}
                          className={`${ROW_ACTION} bg-ocean-blue px-6 text-white`}
                        >
                          {t("store.table.pay")}
                        </button>
                        <button
                          type="button"
                          onClick={() => share(person)}
                          className={`${ROW_ACTION} bg-[var(--octo-store-chip)] px-3 text-[var(--octo-store-select-text)]`}
                        >
                          {t("store.table.shareLink")}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <SplitProgressPanel />
            </>
          )}
        </div>

        <TableFooter />
      </div>
    </div>
  );
}
