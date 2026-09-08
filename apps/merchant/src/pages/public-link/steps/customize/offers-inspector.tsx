// The Offers section's inspector: five flat fields under one heading, no
// tabs and no numbered blocks — the simplest of the five hand-written panels.
import { Select } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import type { OffersSettings, SiteAction, SiteDraft } from "../../_shared/site-draft";
import { Switch } from "../../ui/switch";
import { FieldRow } from "./controls";

const DISPLAY_STYLE_OPTIONS = ["cardList", "grid", "carousel"] as const;
const SORT_ORDER_OPTIONS = ["dateEarliest", "dateLatest", "discount"] as const;
const CTA_BUTTON_OPTIONS = ["viewAllOffers", "claimNow", "none"] as const;
const VISIBILITY_OPTIONS = ["visibleHomepage", "hidden"] as const;

export function OffersInspector({ draft, dispatch }: { draft: SiteDraft; dispatch: (action: SiteAction) => void }) {
  const { t } = useI18n();
  const settings = draft.sectionSettings.offers;

  function patch(patch: Partial<OffersSettings>) {
    dispatch({ type: "patchSection", section: "offers", patch });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">{t("publicLink.customize.settingForSelected")}</p>

      <FieldRow label={t("publicLink.offers.displayStyle")}>
        <Select value={settings.displayStyle} onChange={(e) => patch({ displayStyle: e.target.value })}>
          <option value="" />
          {DISPLAY_STYLE_OPTIONS.map((id) => (
            <option key={id} value={id}>
              {t(`publicLink.offers.${id}`)}
            </option>
          ))}
        </Select>
      </FieldRow>

      <FieldRow label={t("publicLink.offers.filterCategories")}>
        <div className="flex items-center justify-between rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2">
          <span className="text-[12.5px] text-[var(--octo-text-primary)]">
            {t(settings.filterCategories ? "publicLink.offers.on" : "publicLink.offers.off")}
          </span>
          <Switch
            checked={settings.filterCategories}
            onChange={() => patch({ filterCategories: !settings.filterCategories })}
            label={t("publicLink.offers.filterCategories")}
          />
        </div>
      </FieldRow>

      <FieldRow label={t("publicLink.offers.sortOrder")}>
        <Select value={settings.sortOrder} onChange={(e) => patch({ sortOrder: e.target.value })}>
          <option value="" />
          {SORT_ORDER_OPTIONS.map((id) => (
            <option key={id} value={id}>
              {t(`publicLink.offers.${id}`)}
            </option>
          ))}
        </Select>
      </FieldRow>

      <FieldRow label={t("publicLink.offers.ctaButton")}>
        <Select value={settings.ctaButton} onChange={(e) => patch({ ctaButton: e.target.value })}>
          <option value="" />
          {CTA_BUTTON_OPTIONS.map((id) => (
            <option key={id} value={id}>
              {t(`publicLink.offers.${id}`)}
            </option>
          ))}
        </Select>
      </FieldRow>

      <FieldRow label={t("publicLink.offers.visibility")}>
        <Select value={settings.visibility} onChange={(e) => patch({ visibility: e.target.value })}>
          <option value="" />
          {VISIBILITY_OPTIONS.map((id) => (
            <option key={id} value={id}>
              {t(`publicLink.offers.${id}`)}
            </option>
          ))}
        </Select>
      </FieldRow>
    </div>
  );
}
