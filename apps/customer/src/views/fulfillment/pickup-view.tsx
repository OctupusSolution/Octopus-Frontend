"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { useI18n } from "@/app/providers";
import { useOrderingSession } from "@/entities/order";
import type { Tenant } from "@/entities/tenant";
import type { PickupTiming } from "@/shared/lib/fulfillment";
import { PageHeading, RadioDot } from "@/shared/ui";
import { BranchCard } from "@/widgets/branch-card";

export interface PickupViewProps {
  tenant: Tenant;
}

const TIMINGS: { id: PickupTiming; icon: string; titleKey: string; bodyKey: string }[] = [
  // Right to left, as the design lays them out.
  {
    id: "asap",
    icon: "/images/storefront/schedule-asap.svg",
    titleKey: "store.fulfillment.timingAsapTitle",
    bodyKey: "store.fulfillment.timingAsapBody",
  },
  {
    id: "scheduled",
    icon: "/images/storefront/schedule-later.svg",
    titleKey: "store.fulfillment.timingScheduledTitle",
    bodyKey: "store.fulfillment.timingScheduledBody",
  },
];

/** The 32px heading that opens each band of the pickup page. */
function SectionIntro({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[24px] font-bold leading-none text-[var(--color-gray-900)] sm:text-[32px]">
        {title}
      </h2>
      <p className="text-[18px] leading-none text-[var(--octo-store-body)] sm:text-[24px]">{body}</p>
    </div>
  );
}

export function PickupView({ tenant }: PickupViewProps) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, setBranch, setPickupTiming } = useOrderingSession();
  const branchGroup = useId();
  const timingGroup = useId();
  const [query, setQuery] = useState("");

  // Arriving from the "order for a set time" card preselects that timing.
  useEffect(() => {
    if (searchParams.get("when") === "scheduled") setPickupTiming("scheduled");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const needle = query.trim().toLowerCase();
  const branches = needle
    ? tenant.branches.filter((branch) =>
        [branch.displayName, branch.district, branch.city, branch.address].some((field) =>
          field.toLowerCase().includes(needle),
        ),
      )
    : tenant.branches;

  function selectNearest() {
    // Ranking by distance needs branch coordinates the contract does not carry
    // yet, so the first branch still taking orders stands in for the nearest.
    const open = tenant.branches.find((branch) => branch.isOpen);
    if (open) setBranch(open.id);
  }

  const canContinue = state.branchId !== null && state.pickupTiming !== null;

  return (
    <div className="flex flex-col">
      <div className="mx-auto w-full max-w-[1248px] px-4 pt-[58px] sm:px-6">
        <PageHeading
          title={t("store.fulfillment.pickupTitle")}
          subtitle={t("store.fulfillment.pickupSubtitle")}
        />
      </div>

      <section className="mt-8 bg-[var(--color-gray-100)] py-8">
        <div className="mx-auto flex w-full max-w-[1248px] flex-col gap-12 px-4 sm:px-6">
          <SectionIntro
            title={t("store.fulfillment.branchSectionTitle")}
            body={t("store.fulfillment.branchSectionSubtitle")}
          />

          <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <label className="flex h-14 flex-1 items-center gap-2 rounded-[20px] border border-[var(--color-gray-300)] bg-white px-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/storefront/icon-search.svg" alt="" className="size-6 shrink-0" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label={t("store.fulfillment.branchSearch")}
                  placeholder={t("store.fulfillment.branchSearch")}
                  className="h-full w-full bg-transparent text-[14px] text-[var(--color-gray-900)] outline-none placeholder:text-[var(--octo-store-body)]"
                />
              </label>

              <button
                type="button"
                onClick={selectNearest}
                className="flex h-14 shrink-0 items-center justify-center gap-2 rounded-[20px] border border-[var(--color-ocean-blue)] px-3 py-2 text-[16px] font-bold text-[var(--color-ocean-blue)] sm:w-[282px]"
              >
                {t("store.fulfillment.nearestBranch")}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/storefront/icon-direct-up.svg" alt="" className="size-6" />
              </button>
            </div>

            {branches.length === 0 ? (
              <p className="text-[16px] text-[var(--octo-store-body)]">
                {t("store.fulfillment.branchEmpty")}
              </p>
            ) : (
              <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {branches.map((branch) => (
                  <BranchCard
                    key={branch.id}
                    branch={branch}
                    name={branchGroup}
                    selected={state.branchId === branch.id}
                    onSelect={() => setBranch(branch.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-8 bg-[var(--color-gray-100)] py-8">
        <div className="mx-auto flex w-full max-w-[1248px] flex-col gap-12 px-4 sm:px-6">
          <SectionIntro
            title={t("store.fulfillment.timingSectionTitle")}
            body={t("store.fulfillment.timingSectionSubtitle")}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            {TIMINGS.map((timing) => {
              const selected = state.pickupTiming === timing.id;
              return (
                <label
                  key={timing.id}
                  className="flex cursor-pointer items-center gap-3 rounded-[32px] border-4 border-dashed border-[var(--octo-store-select-border)] bg-[var(--octo-store-select)] px-4 py-6"
                >
                  <input
                    type="radio"
                    name={timingGroup}
                    className="sr-only"
                    checked={selected}
                    onChange={() => setPickupTiming(timing.id)}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={timing.icon} alt="" className="size-12 shrink-0" />
                  <span className="flex min-w-0 flex-1 flex-col gap-4">
                    <span className="text-[24px] font-bold leading-none text-black">
                      {t(timing.titleKey)}
                    </span>
                    <span className="text-[14px] font-medium leading-[1.5] text-[var(--octo-store-select-label)]">
                      {t(timing.bodyKey)}
                    </span>
                  </span>
                  <RadioDot checked={selected} size={32} />
                </label>
              );
            })}
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1248px] px-4 pb-1 pt-8 sm:px-6">
        <button
          type="button"
          disabled={!canContinue}
          onClick={() => router.push("/checkout")}
          className="flex h-12 w-full items-center justify-center rounded-[24px] bg-[var(--color-ocean-blue)] text-[16px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {t("store.fulfillment.continue")}
        </button>
      </div>
    </div>
  );
}
