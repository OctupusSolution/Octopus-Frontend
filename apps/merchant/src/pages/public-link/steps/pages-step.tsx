// Step 3 of the builder: the nine page modules, which ones show in the
// storefront's navigation and on the homepage, and a shortcut into each
// page's section inspector. Three top-aligned columns, as the frame draws
// them: the pages table (bare, on the page), the "Navigation Preview" card
// with the dark drawer mock, and the "Live Preview" card.
import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import type { PreviewDevice } from "@/widgets/storefront-preview";
import { PAGE_MODULES } from "../_shared/page-catalog";
import { SECTION_FOR_PAGE } from "../_shared/section-catalog";
import type { PageEntry, SiteAction } from "../_shared/site-draft";
import { usePlText } from "../_shared/texts";
import { plCard, PlInfoBanner, plText } from "../ui/kit";
import { DrawerNavPreview, PlPageIcon } from "../ui/nav-preview";
import { SitePreview } from "../ui/site-preview";
import { ReorderHint, ReorderList } from "../ui/reorder-list";
import { Switch } from "../ui/switch";
import type { StepProps } from "../_shared/steps";
import { PAGES_BODY, PAGES_DASH, PAGES_LINK, PAGES_NAME, PAGES_TD, PAGES_TH, ServerPagesPanel } from "./connected/pages-panel";

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

  const label = t(module.labelKey);
  const sectionId = SECTION_FOR_PAGE[page.id];

  return (
    <>
      <td className={clsx(PAGES_TD, "ps-2")}>{grip}</td>
      <td className={PAGES_TD}>
        <span className={PAGES_NAME}>
          <PlPageIcon id={page.id} />
          <span className="truncate py-0.5">{label}</span>
        </span>
      </td>
      <td className={clsx(PAGES_TD, "text-center")}>
        <span className="inline-flex align-middle">
          <Switch
            checked={page.inNav}
            onChange={() => dispatch({ type: "togglePageFlag", id: page.id, flag: "inNav" })}
            label={`${label} — ${t("publicLink.pages.showInNav")}`}
          />
        </span>
      </td>
      <td className={clsx(PAGES_TD, "text-center")}>
        <span className="inline-flex align-middle">
          <Switch
            checked={page.onHome}
            onChange={() => dispatch({ type: "togglePageFlag", id: page.id, flag: "onHome" })}
            label={`${label} — ${t("publicLink.pages.showOnHome")}`}
          />
        </span>
      </td>
      <td className={clsx(PAGES_TD, "pe-2 text-end")}>
        {sectionId ? (
          <button
            type="button"
            onClick={() => {
              dispatch({ type: "selectSection", id: sectionId });
              dispatch({ type: "goTo", step: 5 });
            }}
            className={PAGES_LINK}
          >
            {t("publicLink.pages.customize")}
          </button>
        ) : (
          <span aria-hidden className={PAGES_DASH}>
            -
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

export function PagesStep({ draft, dispatch, publicLinkSync }: StepProps) {
  const { t } = useI18n();
  const tx = usePlText();
  const [device, setDevice] = useState<PreviewDevice>("desktop");

  return (
    // The frame's three columns (464 / 269 / 367, 24px apart) only fit from
    // 1400px. Below that the table takes the full row — squeezed beside both
    // previews it clipped "Show on Home" and "Customize" — and the two
    // previews share the row beneath it.
    <div className="grid items-start gap-6 xl:grid-cols-[269px_minmax(0,1fr)] min-[1400px]:grid-cols-[minmax(0,1fr)_269px_367px]">
      {publicLinkSync.connected ? (
        <ServerPagesPanel sync={publicLinkSync} dispatch={dispatch} />
      ) : (
        <div className="flex min-w-0 flex-col gap-3 xl:col-span-2 min-[1400px]:col-span-1">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] table-fixed border-collapse text-start">
              <colgroup>
                <col className="w-10" />
                <col />
                <col className="w-[84px]" />
                <col className="w-[100px]" />
                <col className="w-[92px]" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col" className={PAGES_TH}>
                    <span className="sr-only">{t("publicLink.reorder.hint")}</span>
                  </th>
                  <th scope="col" className={clsx(PAGES_TH, "ps-6 text-start")}>
                    {t("publicLink.pages.pageModule")}
                  </th>
                  <th scope="col" className={clsx(PAGES_TH, "text-center")}>
                    {t("publicLink.pages.showInNav")}
                  </th>
                  <th scope="col" className={clsx(PAGES_TH, "text-center")}>
                    {t("publicLink.pages.showOnHome")}
                  </th>
                  <th scope="col" className={PAGES_TH}>
                    <span className="sr-only">{t("publicLink.pages.customize")}</span>
                  </th>
                </tr>
              </thead>
              <ReorderList
                as="table"
                className={PAGES_BODY}
                items={draft.pages}
                getId={(page) => page.id}
                getLabel={(page) => pageLabel(page, t)}
                onReorder={(pages) => dispatch({ type: "setPages", pages })}
                renderRow={(page, _index, grip) => <PagesRow page={page} grip={grip} dispatch={dispatch} />}
              />
            </table>
          </div>

          <ReorderHint>{tx("pl.pages.reorderHint")}</ReorderHint>
          <PlInfoBanner className="min-h-10">{t("publicLink.pages.tip")}</PlInfoBanner>
        </div>
      )}

      <section className={clsx(plCard, "flex min-w-0 flex-col gap-6 overflow-hidden")}>
        <h3 className={plText.h5}>{t("publicLink.pages.navigationPreview")}</h3>
        <DrawerNavPreview draft={draft} />
      </section>

      <SitePreview draft={draft} dispatch={dispatch} sync={publicLinkSync} device={device} onDevice={setDevice} paged />
    </div>
  );
}
