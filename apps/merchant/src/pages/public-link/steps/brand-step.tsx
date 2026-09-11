// Step 2 of the builder: the merchant's brand identity — logo, business name,
// four colours, English/Arabic typography, favicon and hero pattern — beside a
// live `DeviceFrame` preview that updates per keystroke. Structurally this
// follows `theme-step.tsx`: one card on the start side, `DeviceFrame` on the
// end side, fed by the same `previewModelFromSite`.
import { useRef, useState } from "react";
import { RotateCw, Upload } from "lucide-react";
import { Button, Input, Select } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import type { PreviewDevice } from "@/widgets/storefront-preview";
import { readLogoFile } from "@/pages/onboarding/_shared/logo-file";
import { FONTS, fontStack } from "@/shared/lib/brand-tokens";
import { EMPTY_SITE_DRAFT, type SiteDraft } from "../_shared/site-draft";
import { previewModelFromSite } from "../_shared/preview-model";
import { DeviceFrame } from "../ui/device-frame";
import type { StepProps } from "../_shared/steps";

const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

/** Module scope, not nested inside `BrandStep`: a component redefined on every
 *  render remounts on every keystroke, and a remounted text input loses focus
 *  after each character. */
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
        {label}
      </span>
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={HEX_PATTERN.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="h-7 w-7 shrink-0 cursor-pointer rounded-[6px] border border-[var(--octo-border-input)] bg-transparent p-0"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1" />
      </span>
    </label>
  );
}

/** Module scope for the same reason as `ColorField`. Renders the sample in
 *  the chosen face itself — via `fontStack` — rather than naming the font, so
 *  the merchant sees what the typeface looks like. */
function TypographyField({
  label,
  value,
  sample,
  locale,
  onChange,
}: {
  label: string;
  value: string;
  sample: string;
  locale: "en" | "ar";
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Select label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {FONTS.map((font) => (
          <option key={font.id} value={font.id}>
            {font.label}
          </option>
        ))}
      </Select>
      <p
        dir={locale === "ar" ? "rtl" : "ltr"}
        style={{ fontFamily: fontStack(value, locale) }}
        className="rounded-[9px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-3 py-2 text-[13px] text-[var(--octo-text-primary)]"
      >
        {sample}
      </p>
    </div>
  );
}

/** Module scope: a hidden file input plus its trigger, reused for the logo,
 *  favicon and hero pattern. `readLogoFile`'s shape (a `File` in, a data URL
 *  out) fits all three despite its onboarding-era name — none of them need a
 *  different size cap or output format, so a second reader would only
 *  duplicate the downscale-to-512px logic the comment there warns about
 *  keeping in one place. */
function ImagePicker({
  previewSrc,
  buttonLabel,
  onPick,
  previewClassName,
}: {
  previewSrc: string | null;
  buttonLabel: string;
  onPick: (dataUrl: string) => void;
  previewClassName: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-3">
      {previewSrc ? (
        <img src={previewSrc} alt="" className={previewClassName} />
      ) : (
        <span className={`flex items-center justify-center border border-dashed border-[var(--octo-border-input)] text-[var(--octo-text-faint)] ${previewClassName}`}>
          <Upload size={14} />
        </span>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => readLogoFile(e.target.files?.[0], onPick)}
      />
      <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
        {buttonLabel}
      </Button>
    </div>
  );
}

export function BrandStep({ draft, dispatch }: StepProps) {
  const { t, locale } = useI18n();
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  // Bumped by the preview's Refresh action so the frame in `key` genuinely
  // remounts rather than silently re-rendering with the same props.
  const [refreshKey, setRefreshKey] = useState(0);
  const { brand } = draft;

  const model = previewModelFromSite(draft, device, t, locale);

  const resetToThemeDefaults = () => {
    const defaults: SiteDraft["brand"] = EMPTY_SITE_DRAFT.brand;
    dispatch({ type: "patchColors", patch: defaults.colors });
    dispatch({ type: "patchTypography", locale: "en", patch: defaults.typography.en });
    dispatch({ type: "patchTypography", locale: "ar", patch: defaults.typography.ar });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_520px]">
        <div className="flex flex-col gap-5 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
          {/* Logo */}
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("publicLink.brand.logo")}</p>
            <div className="flex items-center gap-3">
              <ImagePicker
                previewSrc={brand.logoDataUrl}
                previewClassName="h-14 w-14 rounded-[9px] object-contain"
                buttonLabel={t("publicLink.brand.changeLogo")}
                onPick={(logoDataUrl) => dispatch({ type: "patchBrand", patch: { logoDataUrl } })}
              />
              {brand.logoDataUrl && (
                <Button variant="ghost" size="sm" onClick={() => dispatch({ type: "patchBrand", patch: { logoDataUrl: null } })}>
                  {t("publicLink.brand.remove")}
                </Button>
              )}
            </div>
            <p className="text-[11.5px] text-[var(--octo-text-muted)]">{t("publicLink.brand.logoHint")}</p>
          </div>

          {/* Business name. `maxLength` is a generous typing cap, not the
              binding constraint — `hostLabelFromName` (preview-model.ts)
              separately caps the *slug* built from this name to keep the
              Preview step's QR code within its byte budget (final review
              finding F1); this just keeps the field itself from growing
              without bound. */}
          <Input
            label={t("publicLink.brand.businessName")}
            placeholder={t("publicLink.brand.businessNamePlaceholder")}
            value={brand.businessName}
            maxLength={80}
            onChange={(e) => dispatch({ type: "patchBrand", patch: { businessName: e.target.value } })}
          />

          {/* Colors */}
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("publicLink.brand.colors")}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ColorField
                label={t("publicLink.brand.primaryColor")}
                value={brand.colors.primary}
                onChange={(primary) => dispatch({ type: "patchColors", patch: { primary } })}
              />
              <ColorField
                label={t("publicLink.brand.lightColor")}
                value={brand.colors.light}
                onChange={(light) => dispatch({ type: "patchColors", patch: { light } })}
              />
              <ColorField
                label={t("publicLink.brand.accentColor")}
                value={brand.colors.accent}
                onChange={(accent) => dispatch({ type: "patchColors", patch: { accent } })}
              />
              <ColorField
                label={t("publicLink.brand.darkColor")}
                value={brand.colors.dark}
                onChange={(dark) => dispatch({ type: "patchColors", patch: { dark } })}
              />
            </div>
          </div>

          {/* Typography — English */}
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("publicLink.brand.typographyEn")}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TypographyField
                label={t("publicLink.brand.titles")}
                value={brand.typography.en.titles}
                sample={t("publicLink.brand.titlesSample")}
                locale="en"
                onChange={(titles) => dispatch({ type: "patchTypography", locale: "en", patch: { titles } })}
              />
              <TypographyField
                label={t("publicLink.brand.body")}
                value={brand.typography.en.body}
                sample={t("publicLink.brand.bodySample")}
                locale="en"
                onChange={(body) => dispatch({ type: "patchTypography", locale: "en", patch: { body } })}
              />
            </div>
          </div>

          {/* Typography — Arabic */}
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("publicLink.brand.typographyAr")}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TypographyField
                label={t("publicLink.brand.titles")}
                value={brand.typography.ar.titles}
                sample={t("publicLink.brand.titlesSampleAr")}
                locale="ar"
                onChange={(titles) => dispatch({ type: "patchTypography", locale: "ar", patch: { titles } })}
              />
              <TypographyField
                label={t("publicLink.brand.body")}
                value={brand.typography.ar.body}
                sample={t("publicLink.brand.bodySampleAr")}
                locale="ar"
                onChange={(body) => dispatch({ type: "patchTypography", locale: "ar", patch: { body } })}
              />
            </div>
          </div>

          {/* Assets */}
          <div className="flex flex-col gap-3">
            <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("publicLink.brand.assets")}</p>
            <div className="flex flex-col gap-1.5">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                {t("publicLink.brand.favicon")}
              </span>
              <ImagePicker
                previewSrc={brand.faviconDataUrl}
                previewClassName="h-8 w-8 rounded-[6px] object-contain"
                buttonLabel={t("publicLink.brand.change")}
                onPick={(faviconDataUrl) => dispatch({ type: "patchBrand", patch: { faviconDataUrl } })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                {t("publicLink.brand.heroPattern")}
              </span>
              <ImagePicker
                previewSrc={brand.heroPatternDataUrl}
                previewClassName="h-8 w-14 rounded-[6px] object-cover"
                buttonLabel={t("publicLink.brand.change")}
                onPick={(heroPatternDataUrl) => dispatch({ type: "patchBrand", patch: { heroPatternDataUrl } })}
              />
            </div>
          </div>

          <Button variant="ghost" size="sm" className="self-start" onClick={resetToThemeDefaults}>
            {t("publicLink.brand.resetDefaults")}
          </Button>
        </div>

        <DeviceFrame
          key={refreshKey}
          model={model}
          device={device}
          onDevice={setDevice}
          paged
          modelFor={(previewT, previewLocale) => previewModelFromSite(draft, device, previewT, previewLocale)}
          actions={
            <Button
              variant="ghost"
              size="sm"
              aria-label={t("publicLink.preview.refresh")}
              onClick={() => setRefreshKey((key) => key + 1)}
            >
              <RotateCw size={14} />
            </Button>
          }
        />
      </div>
    </div>
  );
}
