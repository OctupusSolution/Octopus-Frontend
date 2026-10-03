// Step 3 — Menu Theme & Public Experience.
//
// Everything here belongs to this menu's own MenuTheme: its brand (logo, hero,
// the four colours — seeded once from the Public Link site's brand when the
// menu has none), its font codes, card/category/navigation style, item-details
// behaviour, sticky cart and tag visibility. The site draft is only read, as the
// seed and as the fallback while a menu's theme is still loading.
import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { Modal } from "@ui/primitives";
import { useFilePicker } from "@/shared/ui/use-file-picker";
import { FONTS } from "@/shared/lib/brand-tokens";
import { menuAsset } from "@/shared/lib/menu-assets";
import { useSiteDraft } from "@/entities/site-draft";
import {
  HERO_SUBTEXT_MAX,
  HERO_TEXT_MAX,
  normalizeHexColor,
  useThemeChoices,
  validateTheme,
  type MenuBrand,
  type MenuTheme,
  type ThemeColorField,
  type ThemeField,
} from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { useTenantConfig } from "@/app/providers/tenant-config-provider";
import { SelectBox, Switch } from "../../_shared/controls";
import { MenuIcon } from "../../_shared/menu-icon";
import { FIELD_INVALID, FOCUS_WITHIN, LINE, PANEL, SURFACE_BLUE, TEXT, TEXT_GRAY, TEXT_INPUT_CLASS } from "../../_shared/theme";
import { useDraft } from "../use-draft";
import { MenuPreviewFrame } from "../preview/menu-preview-frame";
import { QrPanel } from "./qr-panel";
import { MENU_PRESETS, presetFor, type MenuPreset } from "./presets";
import { seedBrand } from "./seed-brand";
import { serverFontCode } from "./font-code";

/** The frame draws every preset with the same photograph. Flip this to draw
 *  each preset in its own four colours instead (PresetPalette below). */
const USE_FRAME_PRESET_ART: boolean = true;

const PRESET_ART = menuAsset("menu-theme-preset.jpg");

type Option<T extends string> = { id: T; icon: string; size: number; key: string };

// Glyph sizes are the exported artwork's own, centred in the frame's 24px box.
const NAV: Option<MenuTheme["navStyle"]>[] = [
  { id: "top-bar", icon: "menu-nav-top-bar.svg", size: 24, key: "menuTheme.nav.topBar" },
  { id: "side-drawer", icon: "menu-nav-side-drawer.svg", size: 14.3, key: "menuTheme.nav.sideDrawer" },
  { id: "bottom-bar", icon: "menu-nav-bottom-bar.svg", size: 19.2, key: "menuTheme.nav.bottomBar" },
  { id: "pill-scroll", icon: "menu-nav-pill-scroll.svg", size: 20.2, key: "menuTheme.nav.pillScroll" },
];

// The frame repeats the navigation glyphs for the category styles.
const CATEGORY: Option<MenuTheme["categoryStyle"]>[] = [
  { id: "icon-text", icon: "menu-nav-top-bar.svg", size: 24, key: "menuTheme.cat.iconText" },
  { id: "text-only", icon: "menu-nav-side-drawer.svg", size: 14.3, key: "menuTheme.cat.textOnly" },
  { id: "icons-only", icon: "menu-nav-bottom-bar.svg", size: 19.2, key: "menuTheme.cat.iconsOnly" },
  { id: "image-text", icon: "menu-nav-pill-scroll.svg", size: 20.2, key: "menuTheme.cat.imageText" },
];

/** The four card thumbnails, each a crop of its exported artwork — the crop
 *  box is the frame's own (image size and offset as percentages of the slot). */
const CARD: { id: MenuTheme["cardStyle"]; key: string; art: string; width: number; crop: string | null }[] = [
  { id: "classic", key: "menuTheme.card.classic", art: menuAsset("menu-card-classic.png"), width: 30, crop: "h-[197.68%] w-[158.27%] left-[-29.21%] top-[-48.65%]" },
  { id: "clean-minimal", key: "menuTheme.card.cleanMinimal", art: menuAsset("menu-card-clean-minimal.png"), width: 31, crop: "h-[231.67%] w-[179.33%] left-[-39.93%] top-[-64.48%]" },
  { id: "image-top", key: "menuTheme.card.imageTop", art: menuAsset("menu-card-image-top.jpg"), width: 30, crop: null },
  { id: "image-left", key: "menuTheme.card.imageLeft", art: menuAsset("menu-card-image-left.png"), width: 31, crop: "h-[172.39%] w-[132.64%] left-[-16.32%] top-[-36.03%]" },
];

const DETAILS: MenuTheme["itemDetails"][] = ["same-page", "overlay", "new-page"];
const DETAIL_KEYS: Record<MenuTheme["itemDetails"], string> = {
  "same-page": "menuTheme.details.samePage",
  overlay: "menuTheme.details.overlay",
  "new-page": "menuTheme.details.newPage",
};

const COLORS: { key: string; field: ThemeColorField }[] = [
  { key: "menuTheme.primary", field: "primary" },
  { key: "menuTheme.light", field: "light" },
  { key: "menuTheme.accent", field: "accent" },
  { key: "menuTheme.dark", field: "dark" },
];

const HEADING = `text-[14px] font-bold leading-[14px] ${TEXT}`;
const SUB_LABEL = `text-[14px] font-medium leading-[14px] ${TEXT}`;
const ACCENT_TEXT = "text-[#0058da] [[data-theme=dark]_&]:text-[#8ab8ff]";
const OUTLINE_BUTTON =
  "inline-flex items-center justify-center rounded-[8px] border border-[#0D6EFD] px-3 font-bold text-[#0D6EFD] hover:bg-[#f5f9ff] [[data-theme=dark]_&]:hover:bg-[#0d6efd]/15";
const ERROR_TEXT = "text-[12px] leading-[14px] text-[#d30202]";
const TILE = "flex shrink-0 flex-col items-center gap-2 rounded-[4px] border p-1 text-[10px] font-medium leading-[10px]";

function tileTone(active: boolean): string {
  return active ? `border-[#0D6EFD] text-[#0D6EFD] ${SURFACE_BLUE}` : `${LINE} ${TEXT} hover:bg-[var(--octo-hover)]`;
}

/** A miniature storefront in the preset's own four colours — what a preset
 *  the frame has no artwork for is drawn with. */
function PresetPalette({ preset }: { preset: MenuPreset }) {
  const c = preset.colors;
  return (
    <span className="absolute inset-0 block" style={{ backgroundColor: c.light }} aria-hidden>
      <span className="absolute inset-x-0 top-0 flex h-[14px] items-center gap-1 px-1.5" style={{ backgroundColor: c.dark }}>
        <span className="size-[6px] rounded-full" style={{ backgroundColor: c.primary }} />
        <span className="h-[3px] w-5 rounded-full" style={{ backgroundColor: c.accent }} />
      </span>
      <span className="absolute inset-x-1.5 bottom-1.5 grid grid-cols-3 gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="flex h-[26px] flex-col justify-end overflow-hidden rounded-[3px] bg-white/60">
            <span className="h-[4px]" style={{ backgroundColor: c.primary }} />
          </span>
        ))}
      </span>
    </span>
  );
}

function PresetTile({ preset, active, onSelect }: { preset: MenuPreset; active: boolean; onSelect: () => void }) {
  const { t } = useI18n();
  return (
    <button type="button" aria-pressed={active} onClick={onSelect} className="flex min-w-0 flex-col items-center gap-2">
      <span className={clsx("relative block size-[70px] overflow-hidden rounded-[4px] border", active ? "border-[#0D6EFD]" : "border-transparent")}>
        {USE_FRAME_PRESET_ART ? (
          <img src={PRESET_ART} alt="" className="absolute start-0 top-[-63.99%] h-[177.72%] w-full max-w-none" />
        ) : (
          <PresetPalette preset={preset} />
        )}
        {active && (
          <span className="absolute end-[2px] top-[2px] grid size-4 place-items-center">
            <MenuIcon name="menu-checkbox-on.svg" size={16} className="text-[#0D6EFD]" />
          </span>
        )}
      </span>
      <span className={clsx("max-w-full truncate text-center text-[14px] font-medium leading-[14px]", active ? ACCENT_TEXT : TEXT)}>
        {t(preset.labelKey)}
      </span>
    </button>
  );
}

function Tiles<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (id: T) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <p className={HEADING}>{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(({ id, icon, size, key }) => (
          <button key={id} type="button" aria-pressed={value === id} onClick={() => onChange(id)} className={clsx(TILE, tileTone(value === id))}>
            <span className="grid size-6 place-items-center">
              <MenuIcon name={icon} size={size} />
            </span>
            <span className="whitespace-nowrap">{t(key)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function HeroField({
  label,
  value,
  placeholder,
  error,
  onChange,
  onBlur,
}: {
  label: string;
  value: string;
  placeholder: string;
  error: string | null;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className={clsx("px-2", SUB_LABEL)}>{label}</span>
      <input
        value={value}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={clsx(TEXT_INPUT_CLASS, "!rounded-[4px] placeholder:!text-[#58606c]", error && FIELD_INVALID)}
      />
      {error && (
        <span role="alert" className={clsx("px-2", ERROR_TEXT)}>
          {error}
        </span>
      )}
    </label>
  );
}

/** One brand colour: the swatch opens the system picker, the hex beside it can
 *  be typed. Only a complete #RRGGBB is ever written to the theme; what is
 *  half-typed lives here until it is one. */
function ColorField({
  label,
  value,
  pickLabel,
  error,
  onDraft,
  onCommit,
  onBlur,
}: {
  label: string;
  value: string;
  pickLabel: string;
  error: string | null;
  /** The text as typed, or null once it matches the stored colour again. */
  onDraft: (text: string | null) => void;
  onCommit: (hex: string) => void;
  onBlur: () => void;
}) {
  const picker = useRef<HTMLInputElement>(null);
  const [text, setText] = useState<string | null>(null);
  // The stored colour changed: keep the typed text only if it is that colour
  // (the merchant just finished typing it); a preset's colour replaces it.
  useEffect(() => {
    setText((prev) => (prev !== null && normalizeHexColor(prev) === value.toUpperCase() ? prev : null));
  }, [value]);
  const shown = text ?? value.toUpperCase();
  const swatch = normalizeHexColor(shown) ?? value;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className={clsx("text-[12px] font-medium leading-3", TEXT)}>{label}</span>
      <div className={clsx("flex items-center gap-2 rounded-[4px] border bg-[var(--octo-card)] p-1", LINE, FOCUS_WITHIN, error && FIELD_INVALID)}>
        <span className="relative size-8 shrink-0">
          <button
            type="button"
            aria-label={pickLabel}
            onClick={() => picker.current?.click()}
            style={{ backgroundColor: swatch }}
            className="block size-8 rounded-[4px] ring-1 ring-inset ring-black/5"
          />
          {/* Transparent rather than display:none — some browsers will not
              open the picker for an input that is not rendered. */}
          <input
            ref={picker}
            type="color"
            tabIndex={-1}
            aria-hidden
            value={swatch.toLowerCase()}
            onChange={(e) => {
              setText(null);
              onDraft(null);
              onCommit(e.target.value.toUpperCase());
            }}
            className="pointer-events-none absolute inset-0 size-full opacity-0"
          />
        </span>
        <input
          dir="ltr"
          value={shown}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          maxLength={7}
          spellCheck={false}
          onChange={(e) => {
            const next = e.target.value;
            const hex = normalizeHexColor(next);
            setText(next);
            onDraft(hex ? null : next);
            if (hex) onCommit(hex);
          }}
          onBlur={() => {
            // A finished colour snaps to its stored spelling; an unfinished one
            // stays as typed, under its message.
            if (normalizeHexColor(shown)) setText(null);
            onBlur();
          }}
          className={clsx("w-full min-w-0 bg-transparent text-start text-[12px] font-semibold uppercase leading-3 outline-none", TEXT)}
        />
      </div>
      {error && (
        <span role="alert" className={ERROR_TEXT}>
          {error}
        </span>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <p className={HEADING}>{title}</p>
      {children}
    </div>
  );
}

/** A platform preset the builder has no palette for: drawn in neutral greys
 *  and labelled by its code until the builder learns it. */
function unknownPreset(code: string): MenuPreset {
  return {
    id: code,
    labelKey: code,
    styleId: "modern",
    colors: { primary: "#6b6b74", light: "#f4f4f5", accent: "#a9a9b2", dark: "#16161d" },
  };
}

export function ThemeStep() {
  const { t, locale } = useI18n();
  const { draft, setDraft, setNextBlocked } = useDraft();
  const { draft: site } = useSiteDraft();
  const { activeBusiness } = useTenantConfig();
  const [moreThemes, setMoreThemes] = useState(false);
  // Hex text that is not a colour yet, per field, and which fields were left.
  const [hexDrafts, setHexDrafts] = useState<Partial<Record<ThemeColorField, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<ThemeField, boolean>>>({});
  const language = locale === "ar" ? "ar" : "en";

  const theme = draft.theme;
  function patchTheme(patch: Partial<MenuTheme>) {
    setDraft({ ...draft, theme: { ...theme, ...patch } });
  }

  // The menu's own brand. A menu read from the server without one (null) starts
  // from the site's brand, once; undefined (not read yet) is left alone.
  const brand = theme.brand ?? null;
  useEffect(() => {
    if (theme.brand === null) patchTheme({ brand: seedBrand(site, presetFor(theme.presetId) ?? null, language) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme.brand === null]);
  const shownBrand = brand ?? seedBrand(site, null, language);
  function patchBrand(patch: Partial<MenuBrand>) {
    patchTheme({ brand: { ...shownBrand, ...patch } });
  }

  // A newly picked image is a data: URL until the save uploads it; the old
  // image's media reference no longer describes it.
  const logo = useFilePicker((dataUrl) => patchBrand({ logoUrl: dataUrl, logoRef: null }));
  const hero = useFilePicker((dataUrl) => patchBrand({ heroUrl: dataUrl, heroRef: null }));

  // What the step refuses: a hex that is not #RRGGBB, hero copy that is too
  // long. A message waits for its field to be left; Next Step does not.
  const errors = validateTheme({
    colors: { ...shownBrand.colors, ...hexDrafts },
    heroText: shownBrand.heroText,
    heroSubtext: shownBrand.heroSubtext,
  });
  const invalid = Object.keys(errors).length > 0;
  useEffect(() => {
    setNextBlocked(invalid);
  }, [invalid, setNextBlocked]);
  useEffect(() => () => setNextBlocked(false), [setNextBlocked]);
  const shown = (field: ThemeField, max?: number) =>
    touched[field] && errors[field] ? t(errors[field] as string).replace("{n}", String(max ?? "")) : null;
  const touch = (field: ThemeField) => setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));

  // The platform's preset and font codes (GET /theme-presets). When it lists
  // any, they are the choices — the API refuses a code it does not list — with
  // the builder's palettes drawn for the codes it knows. Without them (not
  // loaded, failed, none configured) the builder's own catalogue stands in.
  const choices = useThemeChoices();
  const serverPresets = choices.data?.presets ?? [];
  const serverFonts = choices.data?.fonts ?? [];
  const isServerPreset = (id: string) => serverPresets.some((code) => code.toLowerCase() === id.toLowerCase());
  const presets: readonly MenuPreset[] =
    serverPresets.length > 0 ? serverPresets.map((code) => presetFor(code) ?? unknownPreset(code)) : MENU_PRESETS;
  const fontOptions = (current: string) => {
    const base: { id: string; label: string }[] =
      serverFonts.length > 0 ? serverFonts.map((code) => FONTS.find((f) => f.id === code.toLowerCase()) ?? { id: code, label: code }) : [...FONTS];
    const same = (f: { id: string }) => f.id.toLowerCase() === current.toLowerCase();
    return base.some(same) ? base : [...base, FONTS.find(same) ?? { id: current, label: current }];
  };
  /** The option standing for `code`: server codes and FONTS ids differ only in case. */
  const fontOptionId = (options: { id: string }[], code: string) =>
    options.find((f) => f.id.toLowerCase() === code.toLowerCase())?.id ?? code;
  // A font pick is sent only when the platform lists it (see serverFontCode);
  // with no platform fonts there is nothing the API would accept, so the
  // pickers are disabled rather than offering a choice that cannot be saved.
  const fontsEditable = serverFonts.length > 0;

  const activePreset = presets.find((p) => p.id === (presetFor(theme.presetId)?.id ?? theme.presetId)) ?? null;
  /** A preset is a palette: picking one sets all four brand colours, which
   *  the merchant can still fine-tune below. */
  function selectPreset(preset: MenuPreset) {
    setHexDrafts({});
    patchTheme({
      presetId: preset.id,
      serverPresetCode: isServerPreset(preset.id) ? preset.id : undefined,
      brand: { ...shownBrand, colors: { ...preset.colors } },
    });
  }

  const titleFont = theme.titleFontCode ?? site.brand.typography.en.titles;
  const bodyFont = theme.bodyFontCode ?? site.brand.typography.en.body;
  const fonts: { label: string; value: string; field: "titleFontCode" | "bodyFontCode" }[] = [
    { label: t("menuTheme.titles"), value: titleFont, field: "titleFontCode" },
    { label: t("menuTheme.body"), value: bodyFont, field: "bodyFontCode" },
  ];

  return (
    // The frame's own column widths (269 / 269 / 562), kept as ratios.
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,269fr)_minmax(0,269fr)_minmax(0,562fr)]">
      <section className={clsx("flex min-w-0 flex-col gap-4", PANEL)}>
        <Section title={t("menuTheme.presets")}>
          <div className="grid grid-cols-3 justify-items-center gap-x-2 gap-y-4">
            {presets.slice(0, 6).map((preset) => (
              <PresetTile key={preset.id} preset={preset} active={activePreset?.id === preset.id} onSelect={() => selectPreset(preset)} />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setMoreThemes(true)}
            className={clsx("flex h-8 w-full items-center justify-center rounded-[4px] border border-[#0D6EFD] p-2 text-[14px] font-semibold leading-[14px] text-[#0D6EFD] hover:brightness-95", SURFACE_BLUE)}
          >
            {t("menuTheme.viewMore")}
          </button>
        </Section>

        <Section title={t("menuTheme.branding")}>
          <button
            type="button"
            onClick={logo.open}
            aria-label={t("menuTheme.changeLogo")}
            className={clsx("flex h-[154px] w-full flex-col rounded-[12px] border border-dashed p-2", LINE)}
          >
            <span className="grid min-h-0 w-full flex-1 place-items-center overflow-hidden rounded-[12px] bg-[var(--octo-track)] shadow-[0px_0px_12px_0px_rgba(0,0,0,0.12)]">
              {shownBrand.logoUrl ? (
                <img src={shownBrand.logoUrl} alt="" className="size-full object-cover" />
              ) : (
                <span className={clsx("px-2 text-[16px] font-semibold", TEXT_GRAY)}>
                  {site.brand.businessName || activeBusiness?.businessName || "—"}
                </span>
              )}
            </span>
          </button>
          {logo.input}
          <div className="flex flex-col gap-3">
            <button type="button" onClick={logo.open} className={clsx(OUTLINE_BUTTON, "h-12 w-full text-[16px] leading-4")}>
              {t("menuTheme.changeLogo")}
            </button>
            {logo.error && (
              <p role="alert" className={ERROR_TEXT}>
                {t(logo.error === "too-large" ? "menuWiz.sec.error.tooLarge" : "menuWiz.sec.error.unreadable")}
              </p>
            )}
            <p className={clsx("whitespace-pre-line text-[12px] leading-[1.4]", TEXT_GRAY)}>{t("menuTheme.logoHint")}</p>
          </div>
        </Section>

        <div className="flex flex-col gap-3">
          <p className={clsx("px-2", HEADING)}>{t("menuTheme.heroMedia")}</p>
          <button
            type="button"
            onClick={hero.open}
            aria-label={t("menuTheme.changeMedia")}
            className={clsx("flex h-[120px] w-full flex-col rounded-[12px] border border-dashed p-2", LINE)}
          >
            <span className="relative grid min-h-0 w-full flex-1 place-items-center overflow-hidden bg-[var(--octo-track)]">
              {shownBrand.heroUrl && <img src={shownBrand.heroUrl} alt="" className="absolute inset-0 size-full object-cover" />}
              <span className="absolute inset-0 bg-black/25" aria-hidden />
              <span className="relative grid size-10 place-items-center rounded-full bg-white text-[#0f172a]" aria-hidden>
                <MenuIcon name="menu-video-circle.svg" size={40} />
              </span>
            </span>
          </button>
          {hero.input}
          <div className="flex flex-col gap-1">
            <div className="flex items-start gap-2">
              <button type="button" onClick={hero.open} className={clsx(OUTLINE_BUTTON, "h-9 min-w-0 flex-1 text-[12px] leading-3")}>
                <span className="truncate">{t("menuTheme.changeMedia")}</span>
              </button>
              <button
                type="button"
                aria-label={t("menuTheme.removeMedia")}
                onClick={() => patchBrand({ heroUrl: null, heroRef: null })}
                className="grid size-9 shrink-0 place-items-center rounded-[8px] bg-[#fef0f0] text-[#d30202] hover:brightness-95 [[data-theme=dark]_&]:bg-[#d30202]/15 [[data-theme=dark]_&]:text-[#ff6b6b]"
              >
                <MenuIcon name="menu-trash.svg" size={24} />
              </button>
            </div>
            {hero.error && (
              <p role="alert" className={ERROR_TEXT}>
                {t(hero.error === "too-large" ? "menuWiz.sec.error.tooLarge" : "menuWiz.sec.error.unreadable")}
              </p>
            )}
            <p className={clsx("text-[12px] leading-[1.4]", TEXT_GRAY)}>{t("menuTheme.mediaHint")}</p>
          </div>
        </div>

        <HeroField
          label={t("menuTheme.heroText")}
          value={shownBrand.heroText}
          placeholder={t("menuTheme.heroTextPlaceholder")}
          error={shown("heroText", HERO_TEXT_MAX)}
          onChange={(heroText) => patchBrand({ heroText })}
          onBlur={() => touch("heroText")}
        />
        <HeroField
          label={t("menuTheme.heroSubtext")}
          value={shownBrand.heroSubtext}
          placeholder={t("menuTheme.heroSubtextPlaceholder")}
          error={shown("heroSubtext", HERO_SUBTEXT_MAX)}
          onChange={(heroSubtext) => patchBrand({ heroSubtext })}
          onBlur={() => touch("heroSubtext")}
        />
      </section>

      <section className={clsx("flex min-w-0 flex-col gap-4", PANEL)}>
        <Section title={t("menuTheme.lookFeel")}>
          {/* The menu's own font codes, only ever ones the platform lists
              (GET /theme-presets). Until the menu has one, the site's
              typography is shown. */}
          {fonts.map(({ label, value, field }) => (
            <div key={field} className="flex flex-col gap-3">
              <span className={SUB_LABEL}>{label}</span>
              <SelectBox
                ariaLabel={label}
                disabled={!fontsEditable}
                value={fontOptionId(fontOptions(value), value)}
                onChange={(next) => {
                  const code = serverFontCode(next, serverFonts);
                  if (code) patchTheme(field === "titleFontCode" ? { titleFontCode: code } : { bodyFontCode: code });
                }}
              >
                {fontOptions(value).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </SelectBox>
            </div>
          ))}
          {!fontsEditable && <p className={clsx("-mt-2 text-[12px] leading-[1.4]", TEXT_GRAY)}>{t("menuTheme.fontsUnavailable")}</p>}
        </Section>

        <Section title={t("menuTheme.colors")}>
          <div className="grid grid-cols-2 gap-x-[11px] gap-y-3">
            {COLORS.map(({ key, field }) => (
              <ColorField
                key={field}
                label={t(key)}
                pickLabel={t("menuTheme.colorPicker").replace("{name}", t(key))}
                value={shownBrand.colors[field]}
                error={shown(field)}
                onDraft={(text) =>
                  setHexDrafts((prev) => {
                    if (text === null) {
                      if (prev[field] === undefined) return prev;
                      const rest = { ...prev };
                      delete rest[field];
                      return rest;
                    }
                    return { ...prev, [field]: text };
                  })
                }
                onCommit={(hex) => patchBrand({ colors: { ...shownBrand.colors, [field]: hex } })}
                onBlur={() => touch(field)}
              />
            ))}
          </div>
        </Section>

        <Tiles label={t("menuTheme.navStyle")} options={NAV} value={theme.navStyle} onChange={(navStyle) => patchTheme({ navStyle })} />
        <Tiles
          label={t("menuTheme.categoryStyle")}
          options={CATEGORY}
          value={theme.categoryStyle}
          onChange={(categoryStyle) => patchTheme({ categoryStyle })}
        />

        <Section title={t("menuTheme.cardStyle")}>
          <div className="flex flex-wrap gap-2">
            {CARD.map(({ id, key, art, width, crop }) => (
              <button
                key={id}
                type="button"
                aria-pressed={theme.cardStyle === id}
                onClick={() => patchTheme({ cardStyle: id })}
                className={clsx(TILE, tileTone(theme.cardStyle === id))}
              >
                <span className="relative block h-6 overflow-hidden" style={{ width }} aria-hidden>
                  <img src={art} alt="" className={clsx("absolute max-w-none", crop ?? "inset-0 size-full object-cover")} />
                </span>
                <span className="whitespace-nowrap">{t(key)}</span>
              </button>
            ))}
          </div>
        </Section>

        <fieldset className="flex flex-col gap-1">
          <legend className={clsx("mb-4", HEADING)}>{t("menuTheme.itemDetails")}</legend>
          {DETAILS.map((id, index) => {
            const checked = theme.itemDetails === id;
            return (
              <label
                key={id}
                className={clsx(
                  "flex cursor-pointer items-center gap-2",
                  index < DETAILS.length - 1 && "border-b border-[#e2e8f0] pb-2 [[data-theme=dark]_&]:border-[var(--octo-border-card)]"
                )}
              >
                <input type="radio" name="item-details" checked={checked} onChange={() => patchTheme({ itemDetails: id })} className="peer sr-only" />
                <span className="inline-flex rounded-full peer-focus-visible:ring-2 peer-focus-visible:ring-[#0D6EFD]/40">
                  <MenuIcon
                    name={checked ? "menu-radio-on.svg" : "menu-radio-off.svg"}
                    size={24}
                    className={checked ? "text-[#0D6EFD]" : "text-[#64748b]"}
                  />
                </span>
                <span className={clsx("text-[12px] font-medium leading-3", TEXT)}>{t(DETAIL_KEYS[id])}</span>
              </label>
            );
          })}
        </fieldset>

        <div className="flex items-center gap-2">
          <Switch checked={theme.stickyAddToCart} label={t("menuTheme.stickyCart")} onChange={(stickyAddToCart) => patchTheme({ stickyAddToCart })} />
          <span className={SUB_LABEL}>{t("menuTheme.stickyCart")}</span>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={theme.showItemTags} label={t("menuTheme.showTags")} onChange={(showItemTags) => patchTheme({ showItemTags })} />
          <span className={clsx("min-w-0 flex-1 text-[14px] font-medium leading-[1.4]", TEXT)}>
            {t("menuTheme.showTags")} (<span className="text-[12px] font-normal">{t("menuTheme.showTagsHint")})</span>
          </span>
        </div>
      </section>

      <div className="flex min-w-0 flex-col gap-4">
        <MenuPreviewFrame menu={draft} site={site} height={913} />
        <QrPanel menuId={draft.id} />
      </div>

      <Modal
        open={moreThemes}
        onClose={() => setMoreThemes(false)}
        backdropClassName="bg-black/60"
        className="!max-w-[738px] !rounded-[12px] !p-6 !shadow-none"
      >
        <div className="flex flex-col gap-6">
          <h2 className="text-[24px] font-semibold leading-6 text-[#0e0e0e] [[data-theme=dark]_&]:text-[var(--octo-text-primary)]">
            {t("menuTheme.allThemes")}
          </h2>
          <div className="grid grid-cols-3 justify-items-center gap-4 sm:grid-cols-5">
            {presets.map((preset) => (
              <PresetTile
                key={preset.id}
                preset={preset}
                active={activePreset?.id === preset.id}
                onSelect={() => {
                  selectPreset(preset);
                  setMoreThemes(false);
                }}
              />
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
