// Step 1 of the builder: filter chips over the six theme cards on the start
// side, the live preview (in a `DeviceFrame`) on the end side. Selecting a
// card or a filter both patch `draft.theme`, so either survives a refresh.
//
// Each card carries the frames' desktop/mobile pair: pressing one selects that
// theme and switches the live preview to that device, so the card's pair and
// the preview's own switcher can never disagree about what is on screen.
import { useState } from "react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import { themeThumb } from "@/shared/lib/storefront-assets";
import type { PreviewDevice } from "@/widgets/storefront-preview";
import { previewModelFromSite } from "../_shared/preview-model";
import { SITE_THEMES, THEME_FILTERS, type SiteTheme } from "../_shared/theme-catalog";
import { DeviceFrame } from "../ui/device-frame";
import { PlButton, PlDeviceSwitch, PlInfoBanner } from "../ui/kit";
import { SitePreview } from "../ui/site-preview";
import type { StepProps } from "../_shared/steps";
import { usePlText } from "../_shared/texts";
import { ServerThemeGrid, StarterCard } from "./connected/theme-panel";

const CARD_DEVICES: readonly PreviewDevice[] = ["desktop", "mobile"];

/** A filter chip as the frames draw it: 8px padding, 4px radius, 14px medium. */
export const THEME_CHIP =
  "shrink-0 rounded-[4px] border p-2 text-[14px] font-medium leading-[14px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40";
export const THEME_CHIP_ON = "border-[var(--pl-primary)] bg-[var(--pl-primary-soft)] text-[var(--pl-primary)]";
export const THEME_CHIP_OFF = "border-[var(--pl-g200)] bg-[var(--pl-surface)] text-[var(--pl-text-2)] hover:border-[var(--pl-g300)]";
/** The bar the chips sit in: 48px, grey-50 on a grey-200 hairline. */
export const THEME_CHIP_BAR =
  "octo-scroll flex min-h-12 items-center justify-between gap-2 overflow-x-auto rounded-[12px] border border-[var(--pl-g200)] bg-[var(--pl-g50)] p-2";
/** Three 171px cards on a 24px gap. */
export const THEME_GRID = "grid grid-cols-2 gap-6 sm:grid-cols-3";

export type ThemeCardProps = Parameters<typeof ThemeCard>[0];

function ThemeCard({
  theme,
  active,
  previewDevice,
  onSelect,
  onPreviewDevice,
  name,
  description,
  swatches,
  image,
}: {
  theme: SiteTheme;
  active: boolean;
  previewDevice: PreviewDevice;
  onSelect: () => void;
  onPreviewDevice: (device: PreviewDevice) => void;
  /** Literal name/description for a server catalogue theme (no i18n key exists for it). */
  name?: string;
  description?: string;
  /** A server theme's own colours, drawn under its name. */
  swatches?: readonly string[];
  /** A server theme's first preview image. */
  image?: string;
}) {
  const { t: baseT } = useI18n();
  const t = (key: string) => (key === theme.nameKey && name ? name : key === theme.descKey && description !== undefined ? description : baseT(key));
  // `themeThumb` only ships one real asset today (the "elegant" style) — the
  // frames themselves show all six cards sharing that same storefront
  // thumbnail and rely on the name/description below it to tell the cards
  // apart, rather than a distinct photo per theme. Fall back to that asset
  // instead of a flat gradient block so a merchant sees a design, not a
  // broken-looking colour swatch. Do not "fix" this back to a gradient —
  // it would be regressing to the wrong answer.
  const thumb = image ?? themeThumb(theme.styleId) ?? themeThumb("elegant");

  // A div, not a button: the card holds three real buttons (the device pair and
  // Use This), and a button nested in a button is invalid and swallows clicks.
  return (
    <div
      className={clsx(
        "flex min-w-0 flex-col gap-3 overflow-hidden rounded-[12px] border bg-[var(--pl-g50)] pb-2 transition-colors",
        active ? "border-[var(--pl-primary)]" : "border-[var(--pl-g300)]"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-label={t(theme.nameKey)}
        className="relative block h-[137px] w-full overflow-hidden border-b-[0.5px] border-[var(--pl-g200)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0D6EFD]/40"
      >
        <img src={thumb ?? undefined} alt="" className="h-full w-full object-cover object-top" />
        {theme.recommended && (
          <span className="absolute start-2 top-2 rounded-[4px] bg-[var(--pl-primary)] p-1 text-[8px] font-medium leading-[8px] text-white drop-shadow-[0_0_6px_rgba(0,0,0,0.12)]">
            {t("publicLink.theme.recommended")}
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-2 px-2">
        <div className="flex flex-col gap-2">
          <p className="truncate text-[14px] font-medium leading-[14px] text-[var(--pl-text)]">{t(theme.nameKey)}</p>
          <p className="truncate text-[10px] font-normal leading-[10px] text-[var(--pl-text-3)]">{t(theme.descKey)}</p>
        </div>
        {swatches && swatches.length > 0 && (
          <span className="flex gap-1" aria-hidden>
            {swatches.map((color) => (
              <span key={color} className="h-3 w-3 rounded-[3px] border border-[var(--pl-g200)]" style={{ background: color }} />
            ))}
          </span>
        )}

        <div className="mt-auto flex items-start gap-2">
          <PlDeviceSwitch
            size="sm"
            devices={CARD_DEVICES}
            value={active && CARD_DEVICES.includes(previewDevice) ? previewDevice : null}
            onChange={(id) => {
              onSelect();
              onPreviewDevice(id);
            }}
            label={(id) => `${t(theme.nameKey)} — ${t(`publicLink.device.${id}`)}`}
          />
          <PlButton size="xs" variant={active ? "primary" : "outline"} onClick={onSelect} aria-pressed={active} className="min-w-0 flex-1 !px-1">
            {t("publicLink.theme.use")}
          </PlButton>
        </div>
      </div>
    </div>
  );
}

export function ThemeStep({ draft, dispatch, publicLinkSync }: StepProps) {
  const { t, locale } = useI18n();
  // Above the connected early return: hooks must run in the same order on every render.
  const tx = usePlText();
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const activeFilter = draft.theme.filter;
  const catalogues = publicLinkSync.server?.catalogues ?? null;

  // Connected with a catalogue: the server's themes (PUT /draft/theme) and starter sites.
  if (publicLinkSync.connected && catalogues && catalogues.themes.length > 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <ServerThemeGrid
            sync={publicLinkSync}
            draft={draft}
            dispatch={dispatch}
            device={device}
            onDevice={setDevice}
            renderCard={({ key, ...props }) => <ThemeCard key={key} {...props} />}
          />
          <SitePreview
            draft={draft}
            dispatch={dispatch}
            sync={publicLinkSync}
            device={device}
            onDevice={setDevice}
            subtitle={t("publicLink.preview.subtitleTheme")}
          />
        </div>
        <StarterCard sync={publicLinkSync} />
      </div>
    );
  }

  const visibleThemes = SITE_THEMES.filter(
    (theme) => activeFilter === "all" || theme.filters.includes(activeFilter)
  );

  const model = previewModelFromSite(draft, device, t, locale);

  return (
    <div className="flex flex-col gap-4">
      {/* Two 562px columns on a 24px gap. */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <div className={THEME_CHIP_BAR}>
            {THEME_FILTERS.map((filter) => {
              const active = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => dispatch({ type: "patchTheme", patch: { filter: filter.id } })}
                  className={clsx(THEME_CHIP, active ? THEME_CHIP_ON : THEME_CHIP_OFF)}
                >
                  {filter.id === "all" ? tx("pl.theme.allThemes") : t(filter.labelKey)}
                </button>
              );
            })}
          </div>

          <div className={THEME_GRID}>
            {visibleThemes.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                active={draft.theme.id === theme.id}
                previewDevice={device}
                onSelect={() => dispatch({ type: "patchTheme", patch: { id: theme.id } })}
                onPreviewDevice={setDevice}
              />
            ))}
          </div>
        </div>

        <DeviceFrame
          model={model}
          device={device}
          onDevice={setDevice}
          devices={["desktop", "mobile"]}
          subtitle={t("publicLink.preview.subtitleTheme")}
          paged
        />
      </div>

      {/* Full width under both columns, as the frame places it. */}
      <PlInfoBanner>{t("publicLink.theme.keepsContent")}</PlInfoBanner>
    </div>
  );
}
