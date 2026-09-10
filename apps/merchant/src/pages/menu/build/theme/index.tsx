// Step 3 — Menu Theme & Public Experience.
//
// Ownership is split, and the split is the point. Logo, the four colours,
// typography and hero live on SiteDraft: one thing the merchant owns, shared
// with the Public Link Builder, so setting the logo here sets it there. Card
// style, category style, navigation style, item-details behaviour, sticky cart
// and tag visibility live on this menu's own MenuTheme.
import clsx from "clsx";
import {
  AlignLeft,
  Columns2,
  Grid2x2,
  Image as ImageIcon,
  LayoutGrid,
  LayoutList,
  PanelBottom,
  PanelLeft,
  PanelTop,
  Rows3,
  ScrollText,
  Trash2,
  Type,
} from "lucide-react";
import { Button, Select } from "@ui/primitives";
import { useFilePicker } from "@/shared/ui/use-file-picker";
import { SITE_THEMES, useSiteDraft } from "@/entities/site-draft";
import type { MenuTheme } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { useDraft } from "../use-draft";
import { PreviewRail } from "../preview-rail";
import { QrPanel } from "./qr-panel";

// The frame names six presets — Ocean, Elegant, Minimal, Warm, Dark, Natural —
// and theme-catalog.ts already ships six with different ids. Mapping the labels
// onto the existing ids rather than renaming the catalogue keeps the Public
// Link Builder's own copy intact; the two modules pick from one list.
const PRESETS: { id: string; labelKey: string }[] = [
  { id: "elegant", labelKey: "menuTheme.preset.ocean" },
  { id: "modernGrid", labelKey: "menuTheme.preset.elegant" },
  { id: "minimalMono", labelKey: "menuTheme.preset.minimal" },
  { id: "cafeWarm", labelKey: "menuTheme.preset.warm" },
  { id: "luxeNoir", labelKey: "menuTheme.preset.dark" },
  { id: "casualBright", labelKey: "menuTheme.preset.natural" },
];

const NAV: { id: MenuTheme["navStyle"]; icon: typeof PanelTop; key: string }[] = [
  { id: "top-bar", icon: PanelTop, key: "menuTheme.nav.topBar" },
  { id: "side-drawer", icon: PanelLeft, key: "menuTheme.nav.sideDrawer" },
  { id: "bottom-bar", icon: PanelBottom, key: "menuTheme.nav.bottomBar" },
  { id: "pill-scroll", icon: ScrollText, key: "menuTheme.nav.pillScroll" },
];

const CATEGORY: { id: MenuTheme["categoryStyle"]; icon: typeof Type; key: string }[] = [
  { id: "icon-text", icon: LayoutList, key: "menuTheme.cat.iconText" },
  { id: "text-only", icon: AlignLeft, key: "menuTheme.cat.textOnly" },
  { id: "icons-only", icon: Grid2x2, key: "menuTheme.cat.iconsOnly" },
  { id: "image-text", icon: ImageIcon, key: "menuTheme.cat.imageText" },
];

const CARD: { id: MenuTheme["cardStyle"]; icon: typeof Type; key: string }[] = [
  { id: "classic", icon: LayoutGrid, key: "menuTheme.card.classic" },
  { id: "clean-minimal", icon: Rows3, key: "menuTheme.card.cleanMinimal" },
  { id: "image-top", icon: ImageIcon, key: "menuTheme.card.imageTop" },
  { id: "image-left", icon: Columns2, key: "menuTheme.card.imageLeft" },
];

const DETAILS: MenuTheme["itemDetails"][] = ["same-page", "overlay", "new-page"];
const DETAIL_KEYS: Record<MenuTheme["itemDetails"], string> = {
  "same-page": "menuTheme.details.samePage",
  overlay: "menuTheme.details.overlay",
  "new-page": "menuTheme.details.newPage",
};

const FONTS = ["Inter", "Cairo", "Tajawal", "Playfair Display"];

// SiteTheme carries a styleId, not colours — the three looks styleTokens
// actually renders differently. The tile is decorative, so it shows that look
// rather than inventing a palette the theme does not define.
const STYLE_SWATCH: Record<string, string> = {
  elegant: "linear-gradient(140deg, #1e3a5f, #7fb2d9)",
  modern: "linear-gradient(140deg, #0f172a, #64748b)",
  warm: "linear-gradient(140deg, #7c4a1e, #e0b184)",
};

function Tiles<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; icon: typeof Type; key: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  const { t } = useI18n();
  return (
    <div>
      <p className="text-[14px] font-semibold text-[var(--octo-text-primary)]">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-2.5">
        {options.map(({ id, icon: Icon, key }) => (
          <button
            key={id}
            type="button"
            aria-pressed={value === id}
            onClick={() => onChange(id)}
            className={clsx(
              "flex w-[92px] flex-col items-center gap-1.5 rounded-[10px] border px-2 py-2.5 text-[11.5px]",
              value === id
                ? "border-[var(--octo-accent)] text-[var(--octo-accent)]"
                : "border-[var(--octo-border-card)] text-[var(--octo-text-secondary)]"
            )}
          >
            <Icon size={20} aria-hidden />
            {t(key)}
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

  const logo = useFilePicker((dataUrl) => dispatch({ type: "patchBrand", patch: { logoDataUrl: dataUrl } }));
  const hero = useFilePicker((dataUrl) =>
    dispatch({ type: "patchSection", section: "hero", patch: { imageDataUrl: dataUrl } })
  );

  const theme = draft.theme;
  function patchTheme(patch: Partial<MenuTheme>) {
    setDraft({ ...draft, theme: { ...theme, ...patch } });
  }

  // SiteDraft already carries exactly the four the frame draws.
  const COLORS: { key: string; field: keyof typeof site.brand.colors }[] = [
    { key: "menuTheme.primary", field: "primary" },
    { key: "menuTheme.light", field: "light" },
    { key: "menuTheme.accent", field: "accent" },
    { key: "menuTheme.dark", field: "dark" },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="space-y-4">
        <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
          <h2 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">
            {t("menuTheme.presets")}
          </h2>
          <div className="mt-2.5 grid grid-cols-3 gap-2.5">
            {PRESETS.map(({ id, labelKey }) => {
              const preset = SITE_THEMES.find((s) => s.id === id);
              const active = theme.presetId === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => patchTheme({ presetId: id })}
                  className="text-center"
                >
                  <span
                    className={clsx(
                      "block h-[62px] w-full rounded-[8px] border-2 bg-[var(--octo-track)]",
                      active ? "border-[var(--octo-accent)]" : "border-transparent"
                    )}
                    style={
                      preset ? { background: STYLE_SWATCH[preset.styleId] } : undefined
                    }
                    aria-hidden
                  />
                  <span
                    className={clsx(
                      "mt-1 block text-[12.5px]",
                      active
                        ? "font-medium text-[var(--octo-accent)]"
                        : "text-[var(--octo-text-secondary)]"
                    )}
                  >
                    {t(labelKey)}
                  </span>
                </button>
              );
            })}
          </div>
          <Button variant="secondary" className="mt-3 w-full justify-center">
            {t("menuTheme.viewMore")}
          </Button>
        </section>

        <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
          <h2 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">
            {t("menuTheme.branding")}
          </h2>

          <button
            type="button"
            onClick={logo.open}
            className="mt-2.5 grid h-[110px] w-full place-items-center overflow-hidden rounded-[10px] border border-dashed border-[var(--octo-border-input)] bg-[#3a1f14]"
          >
            {site.brand.logoDataUrl ? (
              <img src={site.brand.logoDataUrl} alt="" className="h-full w-full object-contain" />
            ) : (
              <span className="text-[15px] font-semibold text-white">
                {site.brand.businessName || "—"}
              </span>
            )}
          </button>
          {logo.input}
          <Button variant="secondary" className="mt-2 w-full justify-center" onClick={logo.open}>
            {t("menuTheme.changeLogo")}
          </Button>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)]">
            {t("menuTheme.logoHint")}
          </p>

          <p className="mt-4 text-[14px] font-semibold text-[var(--octo-text-primary)]">
            {t("menuTheme.heroMedia")}
          </p>
          <button
            type="button"
            onClick={hero.open}
            className="relative mt-1.5 grid h-[110px] w-full place-items-center overflow-hidden rounded-[10px] border border-dashed border-[var(--octo-border-input)]"
          >
            {site.sectionSettings.hero.imageDataUrl && (
              <img
                src={site.sectionSettings.hero.imageDataUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <span
              className="relative grid h-11 w-11 place-items-center rounded-full bg-[var(--octo-text-primary)] text-[var(--octo-card)]"
              aria-hidden
            >
              <ImageIcon size={18} />
            </span>
          </button>
          {hero.input}
          <div className="mt-2 flex items-center gap-2">
            <Button variant="secondary" className="flex-1 justify-center" onClick={hero.open}>
              {t("menuTheme.changeMedia")}
            </Button>
            <button
              type="button"
              aria-label={t("menuTheme.heroMedia")}
              onClick={() =>
                dispatch({ type: "patchSection", section: "hero", patch: { imageDataUrl: null } })
              }
              className="rounded-[9px] border border-[var(--octo-border-card)] p-2 text-error hover:bg-error/10"
            >
              <Trash2 size={16} />
            </button>
          </div>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)]">
            {t("menuTheme.mediaHint")}
          </p>

          <label className="mt-3 block">
            <span className="text-[14px] font-semibold text-[var(--octo-text-primary)]">
              {t("menuTheme.heroText")}
            </span>
            <input
              value={site.sectionSettings.hero.heading}
              onChange={(e) =>
                dispatch({ type: "patchSection", section: "hero", patch: { heading: e.target.value } })
              }
              placeholder={t("menuTheme.heroTextPlaceholder")}
              className="mt-1.5 w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2.5 text-[14px] text-[var(--octo-text-primary)]"
            />
          </label>
          <label className="mt-3 block">
            <span className="text-[14px] font-semibold text-[var(--octo-text-primary)]">
              {t("menuTheme.heroSubtext")}
            </span>
            <input
              value={site.sectionSettings.hero.subheading}
              onChange={(e) =>
                dispatch({ type: "patchSection", section: "hero", patch: { subheading: e.target.value } })
              }
              placeholder={t("menuTheme.heroSubtextPlaceholder")}
              className="mt-1.5 w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2.5 text-[14px] text-[var(--octo-text-primary)]"
            />
          </label>
        </section>
      </div>

      <section className="space-y-4 rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
        <h2 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">
          {t("menuTheme.lookFeel")}
        </h2>

        <label className="block">
          <span className="text-[14px] font-semibold text-[var(--octo-text-primary)]">
            {t("menuTheme.titles")}
          </span>
          <Select
            className="mt-1.5"
            value={site.brand.typography.en.titles}
            onChange={(e) =>
              dispatch({ type: "patchTypography", locale: "en", patch: { titles: e.target.value } })
            }
          >
            {FONTS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </Select>
        </label>
        <label className="block">
          <span className="text-[14px] font-semibold text-[var(--octo-text-primary)]">
            {t("menuTheme.body")}
          </span>
          <Select
            className="mt-1.5"
            value={site.brand.typography.en.body}
            onChange={(e) =>
              dispatch({ type: "patchTypography", locale: "en", patch: { body: e.target.value } })
            }
          >
            {FONTS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </Select>
        </label>

        <div>
          <p className="text-[14px] font-semibold text-[var(--octo-text-primary)]">
            {t("menuTheme.colors")}
          </p>
          <div className="mt-1.5 grid grid-cols-2 gap-3">
            {COLORS.map(({ key, field }) => (
              <label key={key} className="block">
                <span className="text-[12.5px] text-[var(--octo-text-secondary)]">{t(key)}</span>
                <span className="mt-1 flex items-center gap-2 rounded-[9px] border border-[var(--octo-border-input)] px-2 py-1.5">
                  <input
                    type="color"
                    value={site.brand.colors[field]}
                    onChange={(e) =>
                      dispatch({ type: "patchColors", patch: { [field]: e.target.value } })
                    }
                    className="h-7 w-8 shrink-0 cursor-pointer rounded-[6px] border-0 bg-transparent p-0"
                  />
                  <span className="text-[13px] text-[var(--octo-text-primary)]">
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
        <Tiles
          label={t("menuTheme.cardStyle")}
          options={CARD}
          value={theme.cardStyle}
          onChange={(cardStyle) => patchTheme({ cardStyle })}
        />

        <fieldset>
          <legend className="text-[14px] font-semibold text-[var(--octo-text-primary)]">
            {t("menuTheme.itemDetails")}
          </legend>
          <div className="mt-1.5 space-y-2">
            {DETAILS.map((id) => (
              <label key={id} className="flex items-center gap-2.5 text-[14px]">
                <input
                  type="radio"
                  name="item-details"
                  checked={theme.itemDetails === id}
                  onChange={() => patchTheme({ itemDetails: id })}
                  className="h-4 w-4 accent-[var(--octo-accent)]"
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
            <span className="text-[14px] text-[var(--octo-text-primary)]">
              {t("menuTheme.stickyCart")}
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <Switch
              checked={theme.showItemTags}
              label={t("menuTheme.showTags")}
              onChange={() => patchTheme({ showItemTags: !theme.showItemTags })}
            />
            <span className="text-[14px] text-[var(--octo-text-primary)]">
              {t("menuTheme.showTags")}{" "}
              <span className="text-[var(--octo-text-secondary)]">
                ({t("menuTheme.showTagsHint")})
              </span>
            </span>
          </div>
        </div>
      </section>

      <div className="space-y-4">
        <PreviewRail menu={draft} composition="menu" />
        <QrPanel />
      </div>
    </div>
  );
}
