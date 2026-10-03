// The Offers section's inspector: five flat fields under one heading, no
// tabs and no numbered blocks — the simplest of the five hand-written panels.
// Drawn to the Figma "Offers Banner" frame: 12px captions over 40px fields.
import { useI18n } from "@/app/providers/i18n-provider";
import type { OffersSettings, SiteAction, SiteDraft } from "../../_shared/site-draft";
import { rules, useTouched, useValidation } from "../../_shared/validation";
import { PlSelect } from "../../ui/kit";
import { Switch } from "../../ui/switch";
import { FieldRow } from "./controls";

const DISPLAY_STYLE_OPTIONS = ["cardList", "grid", "carousel"] as const;
const SORT_ORDER_OPTIONS = ["dateEarliest", "dateLatest", "discount"] as const;
const CTA_BUTTON_OPTIONS = ["viewAllOffers", "claimNow", "none"] as const;
const VISIBILITY_OPTIONS = ["visibleHomepage", "hidden"] as const;

// The frame draws a chosen value in the secondary grey.
const VALUE_TEXT = "!text-[var(--pl-text-2)]";

/** Module scope, so a keystroke elsewhere never remounts it. Opens on a real
 *  placeholder rather than a blank row; a select left on it is invalid. */
function OfferSelect({
  label,
  value,
  options,
  onChange,
  error,
  onBlur,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (id: string) => void;
  error?: string;
  onBlur: () => void;
}) {
  const { t } = useI18n();
  return (
    <FieldRow small label={label} error={error}>
      <PlSelect aria-label={label} invalid={Boolean(error)} className={VALUE_TEXT} value={value} onBlur={onBlur} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>
          {t("publicLink.select.placeholder")}
        </option>
        {options.map((id) => (
          <option key={id} value={id}>
            {t(`publicLink.offers.${id}`)}
          </option>
        ))}
      </PlSelect>
    </FieldRow>
  );
}

export function OffersInspector({ draft, dispatch }: { draft: SiteDraft; dispatch: (action: SiteAction) => void }) {
  const { t } = useI18n();
  const { check } = useValidation();
  const { touched, touch } = useTouched();
  const settings = draft.sectionSettings.offers;

  function patch(patch: Partial<OffersSettings>) {
    dispatch({ type: "patchSection", section: "offers", patch });
  }

  // Every select needs a chosen value; the message shows once it was left.
  const errorOf = (name: string, value: string) => (touched(name) ? check(value, [rules.required()]) : undefined);

  return (
    <div className="flex flex-col gap-4">
      <OfferSelect
        label={t("publicLink.offers.displayStyle")}
        value={settings.displayStyle}
        options={DISPLAY_STYLE_OPTIONS}
        onChange={(displayStyle) => patch({ displayStyle })}
        error={errorOf("displayStyle", settings.displayStyle)}
        onBlur={() => touch("displayStyle")}
      />

      <FieldRow small label={t("publicLink.offers.filterCategories")}>
        <div className="flex h-10 items-center justify-between gap-3 rounded-[12px] border border-[var(--pl-g300)] px-3">
          <span className="text-[14px] font-medium leading-[14px] text-[var(--pl-text-2)]">
            {t(settings.filterCategories ? "publicLink.offers.on" : "publicLink.offers.off")}
          </span>
          <Switch
            checked={settings.filterCategories}
            onChange={() => patch({ filterCategories: !settings.filterCategories })}
            label={t("publicLink.offers.filterCategories")}
          />
        </div>
      </FieldRow>

      <OfferSelect
        label={t("publicLink.offers.sortOrder")}
        value={settings.sortOrder}
        options={SORT_ORDER_OPTIONS}
        onChange={(sortOrder) => patch({ sortOrder })}
        error={errorOf("sortOrder", settings.sortOrder)}
        onBlur={() => touch("sortOrder")}
      />

      <OfferSelect
        label={t("publicLink.offers.ctaButton")}
        value={settings.ctaButton}
        options={CTA_BUTTON_OPTIONS}
        onChange={(ctaButton) => patch({ ctaButton })}
        error={errorOf("ctaButton", settings.ctaButton)}
        onBlur={() => touch("ctaButton")}
      />

      <OfferSelect
        label={t("publicLink.offers.visibility")}
        value={settings.visibility}
        options={VISIBILITY_OPTIONS}
        onChange={(visibility) => patch({ visibility })}
        error={errorOf("visibility", settings.visibility)}
        onBlur={() => touch("visibility")}
      />
    </div>
  );
}
