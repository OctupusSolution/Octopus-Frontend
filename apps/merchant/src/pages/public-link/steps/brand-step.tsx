// Step 2 of the builder: the merchant's brand identity — logo, business name,
// four colours, English/Arabic typography, favicon and hero pattern — beside a
// preview that updates per keystroke (`SitePreview`: the live storefront when
// connected). Structurally this follows `theme-step.tsx`: one card on the start
// side, the preview on the end side.
//
// Laid out as the Brand Identity frame draws it: a large logo box with Change
// Logo / Remove beside it, sentence-case field labels, each colour's swatch
// and hex sharing one field, labelled font examples set in the chosen face,
// the two assets side by side, and Reset to Theme Defaults as a blue link.
import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import type { PreviewDevice } from "@/widgets/storefront-preview";
import { readLogoFile } from "@/pages/onboarding/_shared/logo-file";
import type { FontResponse } from "@octopus/api-client";
import {
  describePublicLinkError,
  EMPTY_SITE_DRAFT,
  ensureFontLoaded,
  siteFontFamily,
  toFontCode,
  type SiteDraft,
} from "../_shared/site-draft";
import { PlButton, PlField, PlFieldError, PlIcon, PlInput, PlSelect, plText } from "../ui/kit";
import { SitePreview } from "../ui/site-preview";
import type { StepProps } from "../_shared/steps";
import { usePlText } from "../_shared/texts";
import { rules, useTouched, useValidation } from "../_shared/validation";
import { LanguagesCard } from "./connected/languages-card";
import { MediaLibraryButton, MediaLibraryManageButton } from "./connected/media-library";

const HEX_PATTERN = /^#[0-9a-f]{6}$/i;
/** A block of the card: its h3 title, then its content 24px below, closed by a
 *  hairline with 12px above it. */
const SECTION = "flex flex-col gap-6 border-b border-[var(--pl-g200)] pb-3";

const BUSINESS_NAME_RULES = [rules.required(), rules.minLength(2), rules.maxLength(80)];
const SLUG_RULES = [rules.required(), rules.slug(), rules.minLength(3), rules.maxLength(63)];

const IMAGE_TYPES: readonly string[] = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
const ICON_TYPES: readonly string[] = [...IMAGE_TYPES, "image/x-icon", "image/vnd.microsoft.icon"];
const MAX_IMAGE_MB = 5;
const MAX_ICON_MB = 1;

/** A picked file's problem as a message, or null when it may be read. The
 *  reader itself (`readLogoFile`) fails silently, so the type and size are
 *  checked here where the merchant can be told why nothing happened. */
function useFileCheck() {
  const tx = usePlText();
  return (file: File | undefined, types: readonly string[], maxMb: number, typeNames: string): string | null => {
    if (!file) return null;
    if (!types.includes(file.type)) return tx("pl.v.fileType", { types: typeNames });
    if (file.size > maxMb * 1024 * 1024) return tx("pl.v.fileSize", { max: maxMb });
    return null;
  };
}

/** Module scope, not nested inside `BrandStep`: a component redefined on every
 *  render remounts on every keystroke, and a remounted text input loses focus
 *  after each character. The swatch and the hex are two controls for one
 *  value; typing in either updates the other.
 *
 *  The hex text is held locally while it is being typed: only a complete,
 *  valid `#RRGGBB` reaches the draft, so a half-typed value can never be saved
 *  as the brand colour. */
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const { check } = useValidation();
  const [text, setText] = useState(value);
  const [blurred, setBlurred] = useState(false);
  // The draft changed from outside (the swatch, a theme reset, the server).
  useEffect(() => setText(value), [value]);

  const error = blurred ? check(text, [rules.required(), rules.hexColor()]) : undefined;

  function handleText(raw: string) {
    const compact = raw.replace(/\s+/g, "");
    const next = (compact && !compact.startsWith("#") ? `#${compact}` : compact).slice(0, 7);
    setText(next);
    if (HEX_PATTERN.test(next)) onChange(next.toUpperCase());
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <span className="truncate text-[16px] font-medium leading-[16px] text-[var(--pl-text)]">{label}</span>
      <span
        className={clsx(
          "flex items-center gap-2 rounded-[4px] border p-1 transition-colors focus-within:ring-2",
          error
            ? "border-[var(--pl-error)] focus-within:ring-[#D30202]/20"
            : "border-[var(--pl-g300)] focus-within:border-[var(--pl-primary)] focus-within:ring-[#0D6EFD]/20"
        )}
      >
        <span className="relative h-8 min-w-6 flex-1 overflow-hidden rounded-[4px]" style={{ background: HEX_PATTERN.test(text) ? text : value }}>
          <input
            type="color"
            value={HEX_PATTERN.test(value) ? value : "#000000"}
            onChange={(e) => {
              setBlurred(false);
              onChange(e.target.value.toUpperCase());
            }}
            aria-label={label}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </span>
        <input
          value={text.toUpperCase()}
          onChange={(e) => handleText(e.target.value)}
          onBlur={() => setBlurred(true)}
          aria-label={`${label} (hex)`}
          aria-invalid={error ? true : undefined}
          spellCheck={false}
          maxLength={7}
          dir="ltr"
          className="w-[68px] shrink-0 bg-transparent text-center text-[14px] font-bold leading-[14px] text-[var(--pl-text)] focus:outline-none"
        />
      </span>
      <PlFieldError>{error}</PlFieldError>
    </div>
  );
}

/** Module scope for the same reason as `ColorField`. The font select; the
 *  example set in the chosen face is drawn separately by `FontExample`, on the
 *  row below both selects as the frame lays them out. Options come from the
 *  API font catalogue (`GET /public-link/fonts`, via publicLinkSync.fonts). */
function FontSelect({
  label,
  value,
  fonts,
  onChange,
}: {
  label: string;
  /** Stored draft value: a catalogue code, or a legacy FONTS id from an older draft. */
  value: string;
  fonts: readonly FontResponse[];
  onChange: (code: string) => void;
}) {
  const tx = usePlText();
  const code = toFontCode(value);
  const selected = fonts.find((font) => font.code === code);
  // A stored font the catalogue no longer offers: the site would fall back to
  // a default face, so ask for a new choice instead of showing a blank select.
  const error = fonts.length > 0 && !selected ? tx("pl.v.required") : undefined;
  return (
    <PlField label={label} error={error}>
      <PlSelect aria-label={label} invalid={Boolean(error)} value={selected ? code : ""} onChange={(e) => onChange(e.target.value)}>
        {!selected && (
          <option value="" disabled>
            —
          </option>
        )}
        {fonts.map((font) => (
          <option key={font.code} value={font.code}>
            {font.displayName}
          </option>
        ))}
      </PlSelect>
    </PlField>
  );
}

/** "Titles Font Example" over a sample set in the chosen face itself, so the
 *  merchant sees what the typeface looks like rather than its name. */
function FontExample({
  exampleLabel,
  value,
  fonts,
  sample,
  locale,
  variant,
}: {
  exampleLabel: string;
  value: string;
  fonts: readonly FontResponse[];
  sample: string;
  locale: "en" | "ar";
  variant: "title" | "body";
}) {
  const selected = fonts.find((font) => font.code === toFontCode(value));
  useEffect(() => {
    if (selected) ensureFontLoaded(selected.displayName);
  }, [selected]);
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <span className="text-[16px] font-normal leading-[16px] text-[var(--pl-text)]">{exampleLabel}</span>
      <p
        dir={locale === "ar" ? "rtl" : "ltr"}
        style={{ fontFamily: siteFontFamily(selected?.displayName, locale) }}
        className={clsx(
          "break-words text-[var(--pl-text)]",
          variant === "title" ? "text-[24px] font-bold leading-[24px]" : "text-[12px] font-medium leading-[1.5]"
        )}
      >
        {sample}
      </p>
    </div>
  );
}

/** The frame's logo block: a 154px dashed box showing the logo (clicking it
 *  uploads too), with Change Logo and Remove stacked beside it. `readLogoFile`
 *  (a `File` in, a downscaled data URL out) serves the logo and both assets —
 *  a second reader would only duplicate its downscale logic. */
function LogoPicker({ src, onPick, onRemove, library }: { src: string | null; onPick: (dataUrl: string) => void; onRemove: () => void; library?: ReactNode }) {
  const { t } = useI18n();
  const tx = usePlText();
  const fileCheck = useFileCheck();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label={t("publicLink.brand.changeLogo")}
          className={clsx(
            "flex h-[154px] w-full min-w-0 flex-col justify-center rounded-[12px] border border-dashed p-2 text-[var(--pl-text-3)] transition-colors hover:border-[var(--pl-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40 sm:flex-1",
            error ? "border-[var(--pl-error)]" : "border-[var(--pl-g300)]"
          )}
        >
          {src ? (
            <img src={src} alt="" className="h-full w-full rounded-[12px] object-contain shadow-[shadow:var(--pl-shadow-raised)]" />
          ) : (
            <span className="grid h-full w-full place-items-center rounded-[12px] bg-[var(--pl-g50)] text-[12px]">{tx("pl.brand.noLogo")}</span>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={IMAGE_TYPES.join(",")}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            const problem = fileCheck(file, IMAGE_TYPES, MAX_IMAGE_MB, "PNG, JPG, SVG, WebP");
            setError(problem);
            if (!problem) readLogoFile(file, onPick);
            e.target.value = "";
          }}
        />
        <div className="flex shrink-0 flex-col gap-3 sm:w-[201px]">
          <PlButton variant="outline" size="lg" className="w-full !text-[16px] !leading-[16px]" onClick={() => fileRef.current?.click()}>
            {t("publicLink.brand.changeLogo")}
          </PlButton>
          <PlButton
            variant="dangerSoft"
            size="lg"
            className="w-full !text-[16px] !leading-[16px]"
            disabled={!src}
            onClick={() => {
              setError(null);
              onRemove();
            }}
          >
            {t("publicLink.brand.remove")}
          </PlButton>
          {library}
          <p className={plText.hint}>
            {tx("pl.brand.logoHintFormat")}
            <br />
            {tx("pl.brand.logoHintSize")}
          </p>
        </div>
      </div>
      <PlFieldError>{error}</PlFieldError>
    </div>
  );
}

/** Favicon / hero pattern: a 60px dashed thumbnail beside a wide Change button. */
function AssetPicker({
  label,
  src,
  fit,
  types,
  typeNames,
  maxMb,
  onPick,
  library,
}: {
  label: string;
  src: string | null;
  fit: "contain" | "cover";
  types: readonly string[];
  typeNames: string;
  maxMb: number;
  onPick: (dataUrl: string) => void;
  /** Connected: a "Library" button to reuse an uploaded file. */
  library?: ReactNode;
}) {
  const { t } = useI18n();
  const fileCheck = useFileCheck();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <span className="text-[16px] font-medium leading-[16px] text-[var(--pl-text)]">{label}</span>
      <div className="flex items-stretch gap-3">
        <span
          className={clsx(
            "flex w-[60px] shrink-0 flex-col justify-center rounded-[4px] border border-dashed p-1",
            error ? "border-[var(--pl-error)]" : "border-[var(--pl-g300)]"
          )}
        >
          {src ? (
            <img
              src={src}
              alt=""
              className={clsx("h-[26px] w-full shadow-[shadow:var(--pl-shadow-raised)]", fit === "cover" ? "object-cover" : "object-contain")}
            />
          ) : (
            <span className="h-[26px] w-full bg-[var(--pl-g100)]" />
          )}
        </span>
        <input
          ref={fileRef}
          type="file"
          accept={types.join(",")}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            const problem = fileCheck(file, types, maxMb, typeNames);
            setError(problem);
            if (!problem) readLogoFile(file, onPick);
            e.target.value = "";
          }}
        />
        <PlButton variant="plain" size="sm" className="min-w-0 flex-1" onClick={() => fileRef.current?.click()}>
          {t("publicLink.brand.change")}
        </PlButton>
        {library}
      </div>
      <PlFieldError>{error}</PlFieldError>
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
  const { t, locale } = useI18n();
  const { check } = useValidation();
  const [blurred, setBlurred] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ isAvailable: boolean; reason: string | null } | null>(null);
  const [claiming, setClaiming] = useState(false);
  const dirty = draftSlug !== slug;

  async function handleCheck() {
    setChecking(true);
    try {
      setResult(await checkSlug(draftSlug));
    } catch (err) {
      setResult({ isAvailable: false, reason: describePublicLinkError(err, locale) });
    } finally {
      setChecking(false);
    }
  }

  async function handleClaim() {
    setClaiming(true);
    try {
      await claimSlug(draftSlug);
      setResult(null);
    } catch (err) {
      setResult({ isAvailable: false, reason: describePublicLinkError(err, locale) });
    } finally {
      setClaiming(false);
    }
  }

  // An address that is not a valid host label can never be claimed, so it is
  // caught here rather than by a round-trip to the availability endpoint.
  const formatError = check(draftSlug, SLUG_RULES);
  const shownError = blurred ? formatError : undefined;

  return (
    <PlField label={t("publicLink.brand.slug")} error={shownError}>
      <div className="flex flex-wrap items-center gap-3">
        <PlInput
          aria-label={t("publicLink.brand.slug")}
          placeholder={t("publicLink.brand.slugPlaceholder")}
          value={draftSlug}
          dir="ltr"
          maxLength={63}
          invalid={Boolean(shownError)}
          className="min-w-[160px] flex-1"
          onBlur={() => setBlurred(true)}
          onChange={(e) => {
            setResult(null);
            onSlugChange(e.target.value.trim().toLowerCase());
          }}
        />
        <PlButton variant="plain" size="md" onClick={handleCheck} disabled={Boolean(formatError) || checking} className="!text-[14px]">
          {checking ? t("publicLink.brand.slugChecking") : t("publicLink.brand.checkAvailability")}
        </PlButton>
        {!dirty && slug && (
          <span className="flex items-center gap-1 whitespace-nowrap text-[12px] font-medium text-[var(--pl-success)]">
            <PlIcon name="completed" size={16} />
            {t("publicLink.brand.slugClaimed")}
          </span>
        )}
      </div>
      {!shownError && result && (
        <span className={clsx("text-[12px] leading-[1.4]", result.isAvailable ? "text-[var(--pl-success)]" : "text-[var(--pl-error)]")}>
          {result.isAvailable ? t("publicLink.brand.slugAvailable") : result.reason ?? t("publicLink.brand.slugUnavailable")}
        </span>
      )}
      {!formatError && result?.isAvailable && dirty && (
        <PlButton size="xs" onClick={handleClaim} disabled={claiming} className="w-fit">
          {t("publicLink.brand.claimSlug")}
        </PlButton>
      )}
    </PlField>
  );
}

export function BrandStep({ draft, dispatch, publicLinkSync }: StepProps) {
  const { t } = useI18n();
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  // Bumped by the preview's Refresh action so the frame in `key` genuinely
  // remounts rather than silently re-rendering with the same props.
  const [refreshKey, setRefreshKey] = useState(0);
  const [draftSlug, setDraftSlug] = useState(draft.slug);
  const { brand } = draft;

  // Picks up the backend's claimed slug once public-link-sync's initial
  // fetch resolves (draft.slug starts empty until then).
  useEffect(() => setDraftSlug(draft.slug), [draft.slug]);

  const tx = usePlText();
  const { check } = useValidation();
  const { touched, touch } = useTouched();
  const [resetting, setResetting] = useState(false);
  const businessNameError = touched("businessName") ? check(brand.businessName, BUSINESS_NAME_RULES) : undefined;
  const connected = publicLinkSync.connected;

  const resetToThemeDefaults = () => {
    if (connected) {
      // POST /draft/theme/reset clears the colour/font overrides (and section
      // styles); the sync hook then mirrors the theme's own values back here.
      if (!window.confirm(tx("pl.brand.resetConfirm"))) return;
      setResetting(true);
      publicLinkSync
        .resetTheme()
        .catch(() => undefined)
        .finally(() => setResetting(false));
      return;
    }
    const defaults: SiteDraft["brand"] = EMPTY_SITE_DRAFT.brand;
    dispatch({ type: "patchColors", patch: defaults.colors });
    dispatch({ type: "patchTypography", locale: "en", patch: defaults.typography.en });
    dispatch({ type: "patchTypography", locale: "ar", patch: defaults.typography.ar });
  };

  const fonts = publicLinkSync.fonts;

  return (
    // Two 562px columns on a 24px gap, top-aligned.
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-4 rounded-[28px] bg-[var(--pl-surface)] px-4 py-6 shadow-[shadow:var(--pl-shadow-raised)]">
        <div className="flex flex-col gap-6">
          <section className={clsx(SECTION, "!gap-4")}>
            <p className={clsx(plText.h3, "px-2")}>{t("publicLink.brand.logo")}</p>
            <LogoPicker
              src={brand.logoDataUrl}
              onPick={(logoDataUrl) => dispatch({ type: "patchBrand", patch: { logoDataUrl } })}
              onRemove={() => dispatch({ type: "patchBrand", patch: { logoDataUrl: null } })}
              library={
                connected ? (
                  // A picked library file is remembered by the sync, so its delivery URL saves as its reference.
                  <MediaLibraryButton
                    sync={publicLinkSync}
                    purposes={["Logo"]}
                    kind="image"
                    className="h-10 justify-center"
                    onPick={(picked) => dispatch({ type: "patchBrand", patch: { logoDataUrl: picked.url } })}
                  />
                ) : undefined
              }
            />
          </section>

          {/* Business name. `maxLength` is a generous typing cap, not the
              binding constraint — `hostLabelFromName` (preview-model.ts)
              separately caps the *slug* built from this name to keep the
              Preview step's QR code within its byte budget (final review
              finding F1); this just keeps the field itself from growing
              without bound. */}
          <PlField label={t("publicLink.brand.businessName")} error={businessNameError}>
            <PlInput
              aria-label={t("publicLink.brand.businessName")}
              placeholder={t("publicLink.brand.businessNamePlaceholder")}
              value={brand.businessName}
              maxLength={80}
              invalid={Boolean(businessNameError)}
              onBlur={() => touch("businessName")}
              onChange={(e) => dispatch({ type: "patchBrand", patch: { businessName: e.target.value } })}
            />
          </PlField>

          <SlugField
            slug={draft.slug}
            draftSlug={draftSlug}
            onSlugChange={setDraftSlug}
            checkSlug={publicLinkSync.checkSlug}
            claimSlug={publicLinkSync.claimSlug}
          />

          <section className={SECTION}>
            <p className={plText.h3}>{t("publicLink.brand.colors")}</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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

          {(["en", "ar"] as const).map((lang) => (
            <section key={lang} className={SECTION}>
              <p className={plText.h3}>{tx(lang === "en" ? "pl.brand.typographyEn" : "pl.brand.typographyAr")}</p>
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <FontSelect
                    label={t("publicLink.brand.titles")}
                    value={brand.typography[lang].titles}
                    fonts={fonts}
                    onChange={(titles) => dispatch({ type: "patchTypography", locale: lang, patch: { titles } })}
                  />
                  <FontSelect
                    label={t("publicLink.brand.body")}
                    value={brand.typography[lang].body}
                    fonts={fonts}
                    onChange={(body) => dispatch({ type: "patchTypography", locale: lang, patch: { body } })}
                  />
                </div>
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                  <FontExample
                    exampleLabel={t("publicLink.brand.titlesExample")}
                    value={brand.typography[lang].titles}
                    fonts={fonts}
                    sample={t(lang === "en" ? "publicLink.brand.titlesSample" : "publicLink.brand.titlesSampleAr")}
                    locale={lang}
                    variant="title"
                  />
                  <FontExample
                    exampleLabel={t("publicLink.brand.bodyExample")}
                    value={brand.typography[lang].body}
                    fonts={fonts}
                    sample={t(lang === "en" ? "publicLink.brand.bodySample" : "publicLink.brand.bodySampleAr")}
                    locale={lang}
                    variant="body"
                  />
                </div>
              </div>
            </section>
          ))}

          <section className="flex flex-col gap-6">
            <p className={plText.h3}>{t("publicLink.brand.assets")}</p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <AssetPicker
                label={t("publicLink.brand.favicon")}
                src={brand.faviconDataUrl}
                fit="contain"
                types={ICON_TYPES}
                typeNames="PNG, SVG, ICO"
                maxMb={MAX_ICON_MB}
                onPick={(faviconDataUrl) => dispatch({ type: "patchBrand", patch: { faviconDataUrl } })}
                library={
                  connected ? (
                    <MediaLibraryButton
                      sync={publicLinkSync}
                      purposes={["Favicon"]}
                      kind="image"
                      className="h-9"
                      onPick={(picked) => dispatch({ type: "patchBrand", patch: { faviconDataUrl: picked.url } })}
                    />
                  ) : undefined
                }
              />
              {connected ? (
                <div className="flex flex-col justify-end gap-2">
                  <p className={plText.hint}>{tx("pl.brand.heroMoved")}</p>
                  <MediaLibraryManageButton sync={publicLinkSync} />
                </div>
              ) : (
                <AssetPicker
                  label={tx("pl.brand.heroPattern")}
                  src={brand.heroPatternDataUrl}
                  fit="cover"
                  types={IMAGE_TYPES}
                  typeNames="PNG, JPG, SVG, WebP"
                  maxMb={MAX_IMAGE_MB}
                  onPick={(heroPatternDataUrl) => dispatch({ type: "patchBrand", patch: { heroPatternDataUrl } })}
                />
              )}
            </div>
          </section>
        </div>

        <button
          type="button"
          onClick={resetToThemeDefaults}
          disabled={resetting}
          className="flex w-fit items-center gap-2 rounded text-[18px] font-bold leading-[18px] text-[var(--pl-primary)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40 disabled:opacity-50"
        >
          <span className="grid h-6 w-6 place-items-center">
            <PlIcon name="reset" size={19.43} className="rtl:-scale-x-100" />
          </span>
          {resetting ? tx("pl.brand.resetting") : t("publicLink.brand.resetDefaults")}
        </button>

        {connected && <LanguagesCard sync={publicLinkSync} />}
      </div>

      <SitePreview
        key={refreshKey}
        draft={draft}
        dispatch={dispatch}
        sync={publicLinkSync}
        device={device}
        onDevice={setDevice}
        paged
        withLanguage
        actions={
          <button
            type="button"
            aria-label={t("publicLink.preview.refresh")}
            onClick={() => setRefreshKey((key) => key + 1)}
            className="grid h-8 w-8 place-items-center rounded-[8px] border border-[var(--pl-g300)] text-[var(--pl-text)] transition-colors hover:bg-[var(--pl-g50)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40"
          >
            <PlIcon name="refresh" size={16} />
          </button>
        }
      />
    </div>
  );
}
