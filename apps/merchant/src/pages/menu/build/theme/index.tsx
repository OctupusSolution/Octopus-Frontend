// Step 3 — Menu Theme & Public Experience.
//
// Ownership is split, and the split is the point. Logo, the four colours,
// typography and hero live on SiteDraft: one thing the merchant owns, shared
// with the Public Link Builder, so setting the logo here sets it there. Card
// style, category style, navigation style, item-details behaviour, sticky cart
// and tag visibility live on this menu's own MenuTheme.
import { useState } from "react";
import clsx from "clsx";
import {
  AlignLeft,
  ArrowUpToLine,
  Check,
  Grid2x2,
  Image as ImageIcon,
  LayoutList,
  List,
  PanelBottom,
  Play,
  ScrollText,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { Modal, Select } from "@ui/primitives";
import { useFilePicker } from "@/shared/ui/use-file-picker";
import { FONTS } from "@/shared/lib/brand-tokens";
import { storefrontAsset } from "@/shared/lib/storefront-assets";
import { useSiteDraft } from "@/entities/site-draft";
import type { MenuTheme } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { useTenantConfig } from "@/app/providers/tenant-config-provider";
import { useDraft } from "../use-draft";
import { PreviewRail } from "../preview-rail";
import { QrPanel } from "./qr-panel";
import { MENU_PRESETS, presetFor, type MenuPreset } from "./presets";
import { publicMenuUrl } from "./public-url";

const NAV: { id: MenuTheme["navStyle"]; icon: LucideIcon; key: string }[] = [
  { id: "top-bar", icon: ArrowUpToLine, key: "menuTheme.nav.topBar" },
  { id: "side-drawer", icon: List, key: "menuTheme.nav.sideDrawer" },
  { id: "bottom-bar", icon: PanelBottom, key: "menuTheme.nav.bottomBar" },
  { id: "pill-scroll", icon: ScrollText, key: "menuTheme.nav.pillScroll" },
];

const CATEGORY: { id: MenuTheme["categoryStyle"]; icon: LucideIcon; key: string }[] = [
  { id: "icon-text", icon: LayoutList, key: "menuTheme.cat.iconText" },
  { id: "text-only", icon: AlignLeft, key: "menuTheme.cat.textOnly" },
  { id: "icons-only", icon: Grid2x2, key: "menuTheme.cat.iconsOnly" },
  { id: "image-text", icon: ImageIcon, key: "menuTheme.cat.imageText" },
];

const CARD: { id: MenuTheme["cardStyle"]; key: string }[] = [
  { id: "classic", key: "menuTheme.card.classic" },
  { id: "clean-minimal", key: "menuTheme.card.cleanMinimal" },
  { id: "image-top", key: "menuTheme.card.imageTop" },
  { id: "image-left", key: "menuTheme.card.imageLeft" },
];

const DETAILS: MenuTheme["itemDetails"][] = ["same-page", "overlay", "new-page"];
const DETAIL_KEYS: Record<MenuTheme["itemDetails"], string> = {
  "same-page": "menuTheme.details.samePage",
  overlay: "menuTheme.details.overlay",
  "new-page": "menuTheme.details.newPage",
};

/** The frame's secondary actions: accent outline, accent text. */
const ACCENT_OUTLINE =
  "inline-flex items-center justify-center gap-2 rounded-[9px] border border-[var(--octo-accent)] bg-[var(--octo-card)] font-semibold text-[var(--octo-accent)] transition-colors hover:bg-[var(--octo-selected)]";

const TILE =
  "flex flex-col items-center justify-center gap-1.5 rounded-[8px] border px-2 py-2 text-[11.5px] transition-colors";

function tileTone(active: boolean): string {
  return active
    ? "border-[var(--octo-accent)] bg-[var(--octo-selected)] text-[var(--octo-accent)]"
    : "border-[var(--octo-border-card)] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]";
}

/** A miniature storefront in the preset's own four colours — the palette is
 *  what differs between presets, so it is what the tile shows. */
function PresetThumb({ preset, tall = false }: { preset: MenuPreset; tall?: boolean }) {
  const c = preset.colors;
  const card = `color-mix(in srgb, ${c.light} 55%, #ffffff)`;
  return (
    <span
      className={clsx("relative block w-full overflow-hidden rounded-[7px]", tall ? "h-[96px]" : "h-[66px]")}
      style={{ backgroundColor: c.light }}
      aria-hidden
    >
      <span className="absolute inset-x-0 top-0 flex h-[14px] items-center gap-1 px-1.5" style={{ backgroundColor: c.dark }}>
        <span className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: c.primary }} />
        <span className="h-[3px] w-5 rounded-full" style={{ backgroundColor: c.accent }} />
      </span>
      <span className="absolute inset-x-1.5 top-[19px] flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-[9px] w-[9px] rounded-full"
            style={{ backgroundColor: i === 0 ? c.primary : c.accent }}
          />
        ))}
      </span>
      <span className="absolute inset-x-1.5 bottom-1.5 grid grid-cols-3 gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={clsx("flex flex-col justify-end overflow-hidden rounded-[3px]", tall ? "h-[46px]" : "h-[26px]")}
            style={{ backgroundColor: card }}
          >
            <span className="h-[4px]" style={{ backgroundColor: c.primary }} />
          </span>
        ))}
      </span>
    </span>
  );
}

function PresetTile({
  preset,
  active,
  onSelect,
  tall,
}: {
  preset: MenuPreset;
  active: boolean;
  onSelect: () => void;
  tall?: boolean;
}) {
  const { t } = useI18n();
  return (
    <button type="button" aria-pressed={active} onClick={onSelect} className="text-center">
      <span
        className={clsx(
          "relative block rounded-[9px] border-2 p-[2px]",
          active ? "border-[var(--octo-accent)]" : "border-transparent"
        )}
      >
        <PresetThumb preset={preset} tall={tall} />
        {active && (
          <span className="absolute end-1.5 top-1.5 grid h-[18px] w-[18px] place-items-center rounded-[4px] bg-[var(--octo-accent)] text-white">
            <Check size={12} strokeWidth={3} aria-hidden />
          </span>
        )}
      </span>
      <span
        className={clsx(
          "mt-1 block text-[13px]",
          active ? "font-medium text-[var(--octo-accent)]" : "text-[var(--octo-text-primary)]"
        )}
      >
        {t(preset.labelKey)}
      </span>
    </button>
  );
}

/** A small picture of each card layout, drawn around a real dish photo. */
function CardThumb({ id }: { id: MenuTheme["cardStyle"] }) {
  const photo = storefrontAsset("burger.webp");
  const line = "block h-[3px] rounded-full bg-[var(--octo-border-input)]";
  const frame = "h-[34px] w-[46px] overflow-hidden rounded-[4px] border border-[var(--octo-border-card)] bg-[var(--octo-card)]";
  switch (id) {
    case "classic":
      return (
        <span className={clsx(frame, "flex flex-col items-center p-[3px]")} aria-hidden>
          <img src={photo} alt="" className="h-[16px] w-auto object-contain" />
          <span className={clsx(line, "mt-[3px] w-[70%]")} />
          <span className={clsx(line, "mt-[2px] w-[45%]")} />
        </span>
      );
    case "clean-minimal":
      return (
        <span className={clsx(frame, "flex flex-col justify-center gap-[3px] px-[5px]")} aria-hidden>
          <span className={clsx(line, "w-[80%]")} />
          <span className={clsx(line, "w-[60%]")} />
          <span className={clsx(line, "w-[70%]")} />
        </span>
      );
    case "image-top":
      return (
        <span className={clsx(frame, "flex flex-col")} aria-hidden>
          <img src={photo} alt="" className="h-[20px] w-full object-cover" />
          <span className={clsx(line, "mx-[4px] mt-[3px] w-[70%]")} />
        </span>
      );
    case "image-left":
      return (
        <span className={clsx(frame, "flex items-center gap-[3px] p-[3px]")} aria-hidden>
          <img src={photo} alt="" className="h-[24px] w-[18px] rounded-[2px] object-cover" />
          <span className="flex flex-1 flex-col gap-[3px]">
            <span className={clsx(line, "w-full")} />
            <span className={clsx(line, "w-[70%]")} />
          </span>
        </span>
      );
  }
}

function Tiles<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; icon: LucideIcon; key: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  const { t } = useI18n();
  return (
    <div>
      <p className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map(({ id, icon: Icon, key }) => (
          <button
            key={id}
            type="button"
            aria-pressed={value === id}
            onClick={() => onChange(id)}
            className={clsx(TILE, "min-w-[60px]", tileTone(value === id))}
          >
            <Icon size={20} aria-hidden />
            <span className="whitespace-nowrap">{t(key)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={clsx(
        "h-[22px] w-[40px] shrink-0 rounded-full p-[2px] transition-colors",
        checked ? "bg-[var(--octo-accent)]" : "bg-[var(--octo-switch-off)]"
      )}
    >
      <span
        className={clsx(
          "block h-[18px] w-[18px] rounded-full bg-[var(--octo-knob)] transition-transform",
          checked && "translate-x-[18px] rtl:-translate-x-[18px]"
        )}
      />
    </button>
  );
}

export function ThemeStep() {
  const { t } = useI18n();
  const { draft, setDraft } = useDraft();
  const { draft: site, dispatch } = useSiteDraft();
  const { activeBusiness } = useTenantConfig();
  const [moreThemes, setMoreThemes] = useState(false);

  const logo = useFilePicker((dataUrl) => dispatch({ type: "patchBrand", patch: { logoDataUrl: dataUrl } }));
  const hero = useFilePicker((dataUrl) =>
    dispatch({ type: "patchSection", section: "hero", patch: { imageDataUrl: dataUrl } })
  );

  const theme = draft.theme;
  function patchTheme(patch: Partial<MenuTheme>) {
    setDraft({ ...draft, theme: { ...theme, ...patch } });
  }

  const activePreset = presetFor(theme.presetId);
  /** A preset is a palette: picking one sets all four brand colours, which
   *  the merchant can still fine-tune below. */
  function selectPreset(preset: MenuPreset) {
    patchTheme({ presetId: preset.id });
    dispatch({ type: "patchColors", patch: preset.colors });
  }

  const COLORS: { key: string; field: keyof typeof site.brand.colors }[] = [
    { key: "menuTheme.primary", field: "primary" },
    { key: "menuTheme.light", field: "light" },
    { key: "menuTheme.accent", field: "accent" },
    { key: "menuTheme.dark", field: "dark" },
  ];

  const url = publicMenuUrl(activeBusiness?.businessName || site.brand.businessName, draft.id);
  const card = "rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4";
  const heading = "text-[16px] font-semibold text-[var(--octo-text-primary)]";

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,0.9fr)_minmax(0,1.15fr)]">
      <div className={card}>
        <h2 className={heading}>{t("menuTheme.presets")}</h2>
        <div className="mt-2.5 grid grid-cols-3 gap-x-2.5 gap-y-3">
          {MENU_PRESETS.map((preset) => (
            <PresetTile
              key={preset.id}
              preset={preset}
              active={activePreset?.id === preset.id}
              onSelect={() => selectPreset(preset)}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setMoreThemes(true)}
          className={clsx(ACCENT_OUTLINE, "mt-3 w-full px-3 py-2 text-[14px] font-medium")}
        >
          {t("menuTheme.viewMore")}
        </button>

        <h2 className={clsx(heading, "mt-5")}>{t("menuTheme.branding")}</h2>
        <div className="mt-2.5 rounded-[12px] border border-dashed border-[var(--octo-border-input)] p-2">
          <button
            type="button"
            onClick={logo.open}
            aria-label={t("menuTheme.changeLogo")}
            className="grid h-[128px] w-full place-items-center overflow-hidden rounded-[10px] bg-[var(--octo-track)]"
          >
            {site.brand.logoDataUrl ? (
              <img src={site.brand.logoDataUrl} alt="" className="h-full w-full object-contain p-3" />
            ) : (
              <span className="text-[16px] font-semibold text-[var(--octo-text-secondary)]">
                {site.brand.businessName || activeBusiness?.businessName || "—"}
              </span>
            )}
          </button>
        </div>
        {logo.input}
        <button type="button" onClick={logo.open} className={clsx(ACCENT_OUTLINE, "mt-3 h-11 w-full text-[16px]")}>
          {t("menuTheme.changeLogo")}
        </button>
        <p className="mt-2 text-[12.5px] text-[var(--octo-text-muted)]">{t("menuTheme.logoHint")}</p>

        <p className="mt-4 text-[15px] font-semibold text-[var(--octo-text-primary)]">{t("menuTheme.heroMedia")}</p>
        <div className="mt-2 rounded-[12px] border border-dashed border-[var(--octo-border-input)] p-2">
          <button
            type="button"
            onClick={hero.open}
            aria-label={t("menuTheme.changeMedia")}
            className="relative grid h-[118px] w-full place-items-center overflow-hidden rounded-[8px] bg-[var(--octo-track)]"
          >
            {site.sectionSettings.hero.imageDataUrl && (
              <img
                src={site.sectionSettings.hero.imageDataUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <span
              className="relative grid h-10 w-10 place-items-center rounded-full bg-white text-black shadow"
              aria-hidden
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-black text-white">
                <Play size={12} className="fill-current" />
              </span>
            </span>
          </button>
        </div>
        {hero.input}
        <div className="mt-2.5 flex items-center gap-2">
          <button type="button" onClick={hero.open} className={clsx(ACCENT_OUTLINE, "h-10 flex-1 text-[14px]")}>
            {t("menuTheme.changeMedia")}
          </button>
          <button
            type="button"
            aria-label={t("menuTheme.heroMedia")}
            onClick={() => dispatch({ type: "patchSection", section: "hero", patch: { imageDataUrl: null } })}
            className="grid h-10 w-10 place-items-center rounded-[9px] bg-[var(--octo-tone-danger-bg)] text-[var(--octo-tone-danger-text)] hover:brightness-95"
          >
            <Trash2 size={17} />
          </button>
        </div>
        <p className="mt-1.5 text-[12.5px] text-[var(--octo-text-muted)]">{t("menuTheme.mediaHint")}</p>

        <label className="mt-3 block">
          <span className="text-[15px] text-[var(--octo-text-primary)]">{t("menuTheme.heroText")}</span>
          <input
            value={site.sectionSettings.hero.heading}
            onChange={(e) => dispatch({ type: "patchSection", section: "hero", patch: { heading: e.target.value } })}
            placeholder={t("menuTheme.heroTextPlaceholder")}
            className="mt-1.5 w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2.5 text-[14px] text-[var(--octo-text-primary)]"
          />
        </label>
        <label className="mt-3 block">
          <span className="text-[15px] text-[var(--octo-text-primary)]">{t("menuTheme.heroSubtext")}</span>
          <input
            value={site.sectionSettings.hero.subheading}
            onChange={(e) =>
              dispatch({ type: "patchSection", section: "hero", patch: { subheading: e.target.value } })
            }
            placeholder={t("menuTheme.heroSubtextPlaceholder")}
            className="mt-1.5 w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2.5 text-[14px] text-[var(--octo-text-primary)]"
          />
        </label>
      </div>

      <section className={clsx(card, "space-y-4")}>
        <h2 className={heading}>{t("menuTheme.lookFeel")}</h2>

        {/* FONTS ids, not display names: the preview resolves the face by id,
            and the Public Link Builder writes the same ids to the same field. */}
        <label className="block">
          <span className="text-[15px] font-medium text-[var(--octo-text-primary)]">{t("menuTheme.titles")}</span>
          <Select
            className="mt-1.5"
            value={site.brand.typography.en.titles}
            onChange={(e) => dispatch({ type: "patchTypography", locale: "en", patch: { titles: e.target.value } })}
          >
            {FONTS.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </Select>
        </label>
        <label className="block">
          <span className="text-[15px] font-medium text-[var(--octo-text-primary)]">{t("menuTheme.body")}</span>
          <Select
            className="mt-1.5"
            value={site.brand.typography.en.body}
            onChange={(e) => dispatch({ type: "patchTypography", locale: "en", patch: { body: e.target.value } })}
          >
            {FONTS.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </Select>
        </label>

        <div>
          <p className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{t("menuTheme.colors")}</p>
          <div className="mt-1.5 grid grid-cols-2 gap-3">
            {COLORS.map(({ key, field }) => (
              <label key={key} className="block">
                <span className="text-[13px] text-[var(--octo-text-secondary)]">{t(key)}</span>
                <span className="mt-1 flex items-center gap-2 rounded-[9px] border border-[var(--octo-border-input)] px-2 py-1.5">
                  <input
                    type="color"
                    value={site.brand.colors[field]}
                    onChange={(e) => dispatch({ type: "patchColors", patch: { [field]: e.target.value } })}
                    className="h-8 w-8 shrink-0 cursor-pointer rounded-[6px] border-0 bg-transparent p-0"
                  />
                  <span className="text-[13px] font-medium uppercase text-[var(--octo-text-primary)]" dir="ltr">
                    {site.brand.colors[field]}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <Tiles
          label={t("menuTheme.navStyle")}
          options={NAV}
          value={theme.navStyle}
          onChange={(navStyle) => patchTheme({ navStyle })}
        />
        <Tiles
          label={t("menuTheme.categoryStyle")}
          options={CATEGORY}
          value={theme.categoryStyle}
          onChange={(categoryStyle) => patchTheme({ categoryStyle })}
        />

        <div>
          <p className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{t("menuTheme.cardStyle")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CARD.map(({ id, key }) => (
              <button
                key={id}
                type="button"
                aria-pressed={theme.cardStyle === id}
                onClick={() => patchTheme({ cardStyle: id })}
                className={clsx(TILE, "min-w-[68px]", tileTone(theme.cardStyle === id))}
              >
                <CardThumb id={id} />
                <span className="whitespace-nowrap">{t(key)}</span>
              </button>
            ))}
          </div>
        </div>

        <fieldset>
          <legend className="text-[15px] font-semibold text-[var(--octo-text-primary)]">
            {t("menuTheme.itemDetails")}
          </legend>
          <div className="mt-1 divide-y divide-[var(--octo-border-card)]">
            {DETAILS.map((id) => (
              <label key={id} className="flex cursor-pointer items-center gap-2.5 py-2.5 text-[14px]">
                <input
                  type="radio"
                  name="item-details"
                  checked={theme.itemDetails === id}
                  onChange={() => patchTheme({ itemDetails: id })}
                  className="h-[18px] w-[18px] accent-[var(--octo-accent)]"
                />
                <span className="text-[var(--octo-text-primary)]">{t(DETAIL_KEYS[id])}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <Switch
              checked={theme.stickyAddToCart}
              label={t("menuTheme.stickyCart")}
              onChange={() => patchTheme({ stickyAddToCart: !theme.stickyAddToCart })}
            />
            <span className="text-[14.5px] text-[var(--octo-text-primary)]">{t("menuTheme.stickyCart")}</span>
          </div>
          <div className="flex items-start gap-2.5">
            <Switch
              checked={theme.showItemTags}
              label={t("menuTheme.showTags")}
              onChange={() => patchTheme({ showItemTags: !theme.showItemTags })}
            />
            <span className="text-[14.5px] text-[var(--octo-text-primary)]">
              {t("menuTheme.showTags")}{" "}
              <span className="text-[13px] text-[var(--octo-text-secondary)]">({t("menuTheme.showTagsHint")})</span>
            </span>
          </div>
        </div>
      </section>

      <div className="space-y-4">
        <PreviewRail menu={draft} composition="menu" site={site} />
        <QrPanel url={url} />
      </div>

      <Modal
        open={moreThemes}
        onClose={() => setMoreThemes(false)}
        title={t("menuTheme.allThemes")}
        className="max-w-2xl"
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {MENU_PRESETS.map((preset) => (
            <PresetTile
              key={preset.id}
              preset={preset}
              tall
              active={activePreset?.id === preset.id}
              onSelect={() => {
                selectPreset(preset);
                setMoreThemes(false);
              }}
            />
          ))}
        </div>
      </Modal>
    </div>
  );
}
