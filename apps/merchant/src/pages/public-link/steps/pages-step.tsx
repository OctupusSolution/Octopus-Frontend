// Step 3 of the builder: the nine page modules, which ones show in the
// storefront's navigation and on the homepage, and a shortcut into each
// page's section inspector. Structurally it follows theme-step.tsx and
// brand-step.tsx: one card on the start side, a preview on the end side —
// except this step needs two previews (the dark drawer mock and the full
// `DeviceFrame`), so the grid grows a third column at `xl`.
import { useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import type { PreviewDevice } from "@/widgets/storefront-preview";
import { previewModelFromSite } from "../_shared/preview-model";
import { PAGE_MODULES } from "../_shared/page-catalog";
import { SECTION_FOR_PAGE } from "../_shared/section-catalog";
import type { PageEntry, SiteAction } from "../_shared/site-draft";
import { DeviceFrame } from "../ui/device-frame";
import { DrawerNavPreview } from "../ui/nav-preview";
import { ReorderList } from "../ui/reorder-list";
import { Switch } from "../ui/switch";
import type { StepProps } from "../_shared/steps";

const HEADER_CELL = "py-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]";

/** Module scope, not nested inside `PagesStep`: a component redefined on
 *  every render would remount every row on every keystroke elsewhere on the
 *  page, dropping focus from whichever switch or link a merchant just used. */
function PagesRow({
  page,
  grip,
  dispatch,
}: {
  page: PageEntry;
  grip: ReactNode;
  dispatch: (action: SiteAction) => void;
}) {
  const { t } = useI18n();
  const module = PAGE_MODULES.find((m) => m.id === page.id);
  if (!module) return null;

  const Icon = module.icon;
  const label = t(module.labelKey);
  const sectionId = SECTION_FOR_PAGE[page.id];

  return (
    <>
      <td className="w-8 py-2.5 ps-1">{grip}</td>
      <td className="py-2.5">
        <span className="flex items-center gap-2 text-[12.5px] text-[var(--octo-text-primary)]">
          <Icon size={14} className="shrink-0 text-[var(--octo-text-faint)]" />
          {label}
        </span>
      </td>
      <td className="py-2.5 text-center">
        <Switch
          checked={page.inNav}
          onChange={() => dispatch({ type: "togglePageFlag", id: page.id, flag: "inNav" })}
          label={`${label} — ${t("publicLink.pages.showInNav")}`}
        />
      </td>
      <td className="py-2.5 text-center">
        <Switch
          checked={page.onHome}
          onChange={() => dispatch({ type: "togglePageFlag", id: page.id, flag: "onHome" })}
          label={`${label} — ${t("publicLink.pages.showOnHome")}`}
        />
      </td>
      <td className="py-2.5 text-end">
        {sectionId ? (
          <button
            type="button"
            onClick={() => {
              dispatch({ type: "selectSection", id: sectionId });
              dispatch({ type: "goTo", step: 5 });
            }}
            className="text-[12px] font-medium text-[#0D6EFD] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40"
          >
            {t("publicLink.pages.customize")}
          </button>
        ) : (
          <span aria-hidden className="text-[var(--octo-text-faint)]">
            —
          </span>
        )}
      </td>
    </>
  );
}

function pageLabel(page: PageEntry, t: (key: string) => string): string {
  const module = PAGE_MODULES.find((m) => m.id === page.id);
  return module ? t(module.labelKey) : page.id;
}

export function PagesStep({ draft, dispatch }: StepProps) {
  const { t, locale } = useI18n();
  const [device, setDevice] = useState<PreviewDevice>("desktop");

  const model = previewModelFromSite(draft, device, t, locale);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] font-medium text-[var(--octo-text-primary)]">{t("publicLink.stepTitle.pages")}</p>
      <p className="-mt-2 text-[12px] text-[var(--octo-text-muted)]">{t("publicLink.pages.subtitle")}</p>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px_380px]">
        <div className="flex flex-col gap-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] border-collapse text-start">
              <thead>
                <tr className="border-b border-[var(--octo-border-card)]">
                  <th scope="col" className="w-8 py-2">
                    <span className="sr-only">{t("publicLink.reorder.hint")}</span>
                  </th>
                  <th scope="col" className={clsx(HEADER_CELL, "text-start")}>
                    {t("publicLink.pages.pageModule")}
                  </th>
                  <th scope="col" className={clsx(HEADER_CELL, "text-center")}>
                    {t("publicLink.pages.showInNav")}
                  </th>
                  <th scope="col" className={clsx(HEADER_CELL, "text-center")}>
                    {t("publicLink.pages.showOnHome")}
                  </th>
                  <th scope="col" className={clsx(HEADER_CELL, "text-end")}>
                    {t("publicLink.pages.customize")}
                  </th>
                </tr>
              </thead>
              <ReorderList
                as="table"
                items={draft.pages}
                getId={(page) => page.id}
                getLabel={(page) => pageLabel(page, t)}
                onReorder={(pages) => dispatch({ type: "setPages", pages })}
                renderRow={(page, _index, grip) => <PagesRow page={page} grip={grip} dispatch={dispatch} />}
              />
            </table>
          </div>

          <p className="flex items-center gap-1.5 rounded-[10px] bg-[#0D6EFD]/5 px-3 py-2.5 text-[11.5px] text-[#0D6EFD]">
            <Info size={13} className="shrink-0" />
            {t("publicLink.pages.tip")}
          </p>
        </div>

        <DrawerNavPreview draft={draft} />

        <DeviceFrame model={model} device={device} onDevice={setDevice} />
      </div>
    </div>
  );
}
