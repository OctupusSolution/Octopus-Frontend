// Step 2 of the builder: the merchant's brand identity — logo, business name,
// four colours, English/Arabic typography, favicon and hero pattern — beside a
// live `DeviceFrame` preview that updates per keystroke. Structurally this
// follows `theme-step.tsx`: one card on the start side, `DeviceFrame` on the
// end side, fed by the same `previewModelFromSite`.
//
// Laid out as the Brand Identity frame draws it: a large logo box with Change
// Logo / Remove beside it, sentence-case field labels, each colour's swatch
// and hex sharing one field, labelled font examples set in the chosen face,
// the two assets side by side, and Reset to Theme Defaults as a blue link.
import { useEffect, useRef, useState } from "react";
import { RotateCcw, RotateCw, Upload } from "lucide-react";
import clsx from "clsx";
import { Button, Input, Select } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import type { PreviewDevice } from "@/widgets/storefront-preview";
import { readLogoFile } from "@/pages/onboarding/_shared/logo-file";
import type { FontResponse } from "@octopus/api-client";
import {
  EMPTY_SITE_DRAFT,
  ensureFontLoaded,
  siteFontFamily,
  toFontCode,
  type SiteDraft,
} from "../_shared/site-draft";
import { previewModelFromSite } from "../_shared/preview-model";
import { DeviceFrame } from "../ui/device-frame";
import type { StepProps } from "../_shared/steps";

const HEX_PATTERN = /^#[0-9a-f]{6}$/i;
const SECTION_TITLE = "text-[16px] font-semibold text-[var(--octo-text-primary)]";
const FIELD_LABEL = "text-[12.5px] font-medium text-[var(--octo-text-primary)]";

/** Module scope, not nested inside `BrandStep`: a component redefined on every
 *  render remounts on every keystroke, and a remounted text input loses focus
 *  after each character. The swatch and the hex are two controls for one
 *  value; typing in either updates the other. */
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
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className={FIELD_LABEL}>{label}</span>
      <span className="flex h-10 items-center gap-2 rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] pe-2 ps-1.5 transition-colors focus-within:border-[#0D6EFD] focus-within:ring-2 focus-within:ring-[#0D6EFD]/30">
        <input
          type="color"
          value={HEX_PATTERN.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="h-7 w-7 shrink-0 cursor-pointer rounded-[6px] border-0 bg-transparent p-0"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} (hex)`}
          spellCheck={false}
          dir="ltr"
          className="min-w-0 flex-1 bg-transparent text-[12.5px] font-semibold uppercase text-[var(--octo-text-primary)] focus:outline-none"
        />
      </span>
    </div>
  );
}

/** Module scope for the same reason as `ColorField`. The example is set in the
 *  chosen face itself rather than naming the font, so the merchant sees what
 *  the typeface looks like. Options come from the API font catalogue
 *  (`GET /public-link/fonts`, via publicLinkSync.fonts). */
function TypographyField({
  label,
  exampleLabel,
  value,
  fonts,
  sample,
  locale,
  variant,
  onChange,
}: {
  label: string;
  exampleLabel: string;
  /** Stored draft value: a catalogue code, or a legacy FONTS id from an older draft. */
  value: string;
  fonts: readonly FontResponse[];
  sample: string;
  locale: "en" | "ar";
  variant: "title" | "body";
  onChange: (code: string) => void;
}) {
  const code = toFontCode(value);
  const selected = fonts.find((font) => font.code === code);
  useEffect(() => {
    if (selected) ensureFontLoaded(selected.displayName);
  }, [selected]);
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className={FIELD_LABEL}>{label}</span>
      <Select aria-label={label} value={selected ? code : ""} onChange={(e) => onChange(e.target.value)}>
        {!selected && <option value="" disabled>—</option>}
        {fonts.map((font) => (
          <option key={font.code} value={font.code}>
            {font.displayName}
          </option>
        ))}
      </Select>
      <span className="mt-2 text-[12.5px] text-[var(--octo-text-muted)]">{exampleLabel}</span>
      <p
        dir={locale === "ar" ? "rtl" : "ltr"}
        style={{ fontFamily: siteFontFamily(selected?.displayName, locale) }}
        className={clsx(
          "text-[var(--octo-text-primary)]",
          variant === "title" ? "text-[22px] font-bold leading-tight" : "text-[12.5px] leading-relaxed"
        )}
      >
        {sample}
      </p>
    </div>
  );
}

/** The frame's logo block: a large dashed box showing the logo (clicking it
 *  uploads too), with Change Logo and Remove stacked beside it. `readLogoFile`
 *  (a `File` in, a downscaled data URL out) serves the logo and both assets —
 *  a second reader would only duplicate its downscale logic. */
function LogoPicker({ src, onPick, onRemove }: { src: string | null; onPick: (dataUrl: string) => void; onRemove: () => void }) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        aria-label={t("publicLink.brand.changeLogo")}
        className="grid h-[132px] w-full place-items-center overflow-hidden rounded-xl border border-dashed border-[var(--octo-border-input)] bg-[var(--octo-hover)] p-2 text-[var(--octo-text-faint)] transition-colors hover:border-[#0D6EFD] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40 sm:flex-1"
      >
        {src ? <img src={src} alt="" className="h-full w-full rounded-[9px] object-contain" /> : <Upload size={20} />}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => readLogoFile(e.target.files?.[0], onPick)}
      />
      <div className="flex flex-col gap-2 sm:w-[44%]">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="h-10 rounded-[9px] border border-[#0D6EFD] text-[13px] font-semibold text-[#0D6EFD] transition-colors hover:bg-[#0D6EFD]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40"
        >
          {t("publicLink.brand.changeLogo")}
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={!src}
          className="h-10 rounded-[9px] bg-[#EF4444]/10 text-[13px] font-semibold text-[#EF4444] transition-colors hover:bg-[#EF4444]/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EF4444]/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("publicLink.brand.remove")}
        </button>
        <p className="text-[11.5px] leading-relaxed text-[var(--octo-text-muted)]">{t("publicLink.brand.logoHint")}</p>
      </div>
    </div>
  );
}

/** Favicon / hero pattern: a thumbnail box beside a wide Change button. */
function AssetPicker({
  label,
  src,
  fit,
  onPick,
}: {
  label: string;
  src: string | null;
  fit: "contain" | "cover";
  onPick: (dataUrl: string) => void;
}) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className={FIELD_LABEL}>{label}</span>
      <div className="flex items-center gap-2">
        <span className="grid h-10 w-[72px] shrink-0 place-items-center overflow-hidden rounded-[9px] border border-dashed border-[var(--octo-border-input)] text-[var(--octo-text-faint)]">
          {src ? (
            <img src={src} alt="" className={clsx("h-full w-full", fit === "cover" ? "object-cover" : "object-contain")} />
          ) : (
            <Upload size={14} />
          )}
        </span>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => readLogoFile(e.target.files?.[0], onPick)}
        />
        <Button variant="secondary" onClick={() => fileRef.current?.click()} className="h-10 flex-1 justify-center">
          {t("publicLink.brand.change")}
        </Button>
      </div>
    </div>
  );
}

/** The backend-connected slug field — not part of `SiteDraft.brand` since it
 *  maps to a real endpoint pair (`GET slug-availability`, `PUT slug`) with
 *  its own async check-then-claim flow, unlike every other field on this
 *  step which is just local state. No dev session configured means both
 *  calls are no-ops (see public-link-sync.ts), so this still renders fine
 *  before Identity/Setup are wired — it just always reports "available". */
function SlugField({
  slug,
  draftSlug,
  onSlugChange,
  checkSlug,
  claimSlug,
}: {
  slug: string;
  draftSlug: string;
  onSlugChange: (slug: string) => void;
  checkSlug: (slug: string) => Promise<{ isAvailable: boolean; reason: string | null }>;
  claimSlug: (slug: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ isAvailable: boolean; reason: string | null } | null>(null);
  const [claiming, setClaiming] = useState(false);
  const dirty = draftSlug !== slug;

  async function handleCheck() {
    setChecking(true);
    try {
      setResult(await checkSlug(draftSlug));
    } finally {
      setChecking(false);
    }
  }

  async function handleClaim() {
    setClaiming(true);
    try {
      await claimSlug(draftSlug);
      setResult(null);
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className={FIELD_LABEL}>{t("publicLink.brand.slug")}</span>
      <div className="flex items-center gap-2">
        <Input
          aria-label={t("publicLink.brand.slug")}
          placeholder={t("publicLink.brand.slugPlaceholder")}
          value={draftSlug}
          dir="ltr"
          className="h-10 flex-1"
          onChange={(e) => onSlugChange(e.target.value.trim().toLowerCase())}
        />
        <Button variant="secondary" onClick={handleCheck} disabled={!draftSlug || checking} className="h-10 whitespace-nowrap">
          {checking ? t("publicLink.brand.slugChecking") : t("publicLink.brand.checkAvailability")}
        </Button>
        {!dirty && slug && (
          <span className="whitespace-nowrap text-[11.5px] font-medium text-[#16a34a]">{t("publicLink.brand.slugClaimed")}</span>
        )}
      </div>
      {result && (
        <span className={clsx("text-[11.5px]", result.isAvailable ? "text-[#16a34a]" : "text-[#DC2626]")}>
          {result.isAvailable ? t("publicLink.brand.slugAvailable") : result.reason ?? t("publicLink.brand.slugUnavailable")}
        </span>
      )}
      {result?.isAvailable && dirty && (
        <Button size="sm" onClick={handleClaim} disabled={claiming} className="w-fit">
          {t("publicLink.brand.claimSlug")}
        </Button>
      )}
    </div>
  );
}

export function BrandStep({ draft, dispatch, publicLinkSync }: StepProps) {
  const { t, locale } = useI18n();
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  // Bumped by the preview's Refresh action so the frame in `key` genuinely
  // remounts rather than silently re-rendering with the same props.
  const [refreshKey, setRefreshKey] = useState(0);
  const [draftSlug, setDraftSlug] = useState(draft.slug);
  const { brand } = draft;

  // Picks up the backend's claimed slug once public-link-sync's initial
  // fetch resolves (draft.slug starts empty until then).
  useEffect(() => setDraftSlug(draft.slug), [draft.slug]);

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
        <div className="flex flex-col gap-5 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-5">
          <section className="flex flex-col gap-3">
            <p className={SECTION_TITLE}>{t("publicLink.brand.logo")}</p>
            <LogoPicker
              src={brand.logoDataUrl}
              onPick={(logoDataUrl) => dispatch({ type: "patchBrand", patch: { logoDataUrl } })}
              onRemove={() => dispatch({ type: "patchBrand", patch: { logoDataUrl: null } })}
            />
          </section>

          <hr className="border-[var(--octo-divider)]" />

          {/* Business name. `maxLength` is a generous typing cap, not the
              binding constraint — `hostLabelFromName` (preview-model.ts)
              separately caps the *slug* built from this name to keep the
              Preview step's QR code within its byte budget (final review
              finding F1); this just keeps the field itself from growing
              without bound. */}
          <div className="flex flex-col gap-1.5">
            <span className={FIELD_LABEL}>{t("publicLink.brand.businessName")}</span>
            <Input
              aria-label={t("publicLink.brand.businessName")}
              placeholder={t("publicLink.brand.businessNamePlaceholder")}
              value={brand.businessName}
              maxLength={80}
              className="h-10"
              onChange={(e) => dispatch({ type: "patchBrand", patch: { businessName: e.target.value } })}
            />
          </div>

          <SlugField
            slug={draft.slug}
            draftSlug={draftSlug}
            onSlugChange={setDraftSlug}
            checkSlug={publicLinkSync.checkSlug}
            claimSlug={publicLinkSync.claimSlug}
          />

          <section className="flex flex-col gap-3">
            <p className={SECTION_TITLE}>{t("publicLink.brand.colors")}</p>
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
          </section>

          <hr className="border-[var(--octo-divider)]" />

          <section className="flex flex-col gap-3">
            <p className={SECTION_TITLE}>{t("publicLink.brand.typographyEn")}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TypographyField
                label={t("publicLink.brand.titles")}
                exampleLabel={t("publicLink.brand.titlesExample")}
                value={brand.typography.en.titles}
                fonts={publicLinkSync.fonts}
                sample={t("publicLink.brand.titlesSample")}
                locale="en"
                variant="title"
                onChange={(titles) => dispatch({ type: "patchTypography", locale: "en", patch: { titles } })}
              />
              <TypographyField
                label={t("publicLink.brand.body")}
                exampleLabel={t("publicLink.brand.bodyExample")}
                value={brand.typography.en.body}
                fonts={publicLinkSync.fonts}
                sample={t("publicLink.brand.bodySample")}
                locale="en"
                variant="body"
                onChange={(body) => dispatch({ type: "patchTypography", locale: "en", patch: { body } })}
              />
            </div>
          </section>

          <hr className="border-[var(--octo-divider)]" />

          <section className="flex flex-col gap-3">
            <p className={SECTION_TITLE}>{t("publicLink.brand.typographyAr")}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TypographyField
                label={t("publicLink.brand.titles")}
                exampleLabel={t("publicLink.brand.titlesExample")}
                value={brand.typography.ar.titles}
                fonts={publicLinkSync.fonts}
                sample={t("publicLink.brand.titlesSampleAr")}
                locale="ar"
                variant="title"
                onChange={(titles) => dispatch({ type: "patchTypography", locale: "ar", patch: { titles } })}
              />
              <TypographyField
                label={t("publicLink.brand.body")}
                exampleLabel={t("publicLink.brand.bodyExample")}
                value={brand.typography.ar.body}
                fonts={publicLinkSync.fonts}
                sample={t("publicLink.brand.bodySampleAr")}
                locale="ar"
                variant="body"
                onChange={(body) => dispatch({ type: "patchTypography", locale: "ar", patch: { body } })}
              />
            </div>
          </section>

          <hr className="border-[var(--octo-divider)]" />

          <section className="flex flex-col gap-3">
            <p className={SECTION_TITLE}>{t("publicLink.brand.assets")}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <AssetPicker
                label={t("publicLink.brand.favicon")}
                src={brand.faviconDataUrl}
                fit="contain"
                onPick={(faviconDataUrl) => dispatch({ type: "patchBrand", patch: { faviconDataUrl } })}
              />
              <AssetPicker
                label={t("publicLink.brand.heroPattern")}
                src={brand.heroPatternDataUrl}
                fit="cover"
                onPick={(heroPatternDataUrl) => dispatch({ type: "patchBrand", patch: { heroPatternDataUrl } })}
              />
            </div>
          </section>

          <button
            type="button"
            onClick={resetToThemeDefaults}
            className="flex w-fit items-center gap-2 rounded text-[14px] font-semibold text-[#0D6EFD] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40"
          >
            <RotateCcw size={16} className="rtl:-scale-x-100" />
            {t("publicLink.brand.resetDefaults")}
          </button>
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
