// Step 1 of the builder: filter chips over the six theme cards on the start
// side, the live preview (in a `DeviceFrame`) on the end side. Selecting a
// card or a filter both patch `draft.theme`, so either survives a refresh.
//
// Each card carries the frames' desktop/mobile pair: pressing one selects that
// theme and switches the live preview to that device, so the card's pair and
// the preview's own switcher can never disagree about what is on screen.
import { useState } from "react";
import clsx from "clsx";
import { Info, Monitor, Smartphone } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { themeThumb } from "@/shared/lib/storefront-assets";
import type { PreviewDevice } from "@/widgets/storefront-preview";
import { previewModelFromSite } from "../_shared/preview-model";
import { SITE_THEMES, THEME_FILTERS, type SiteTheme } from "../_shared/theme-catalog";
import { DeviceFrame } from "../ui/device-frame";
import type { StepProps } from "../_shared/steps";

const CARD_DEVICES = [
  { id: "desktop", Icon: Monitor },
  { id: "mobile", Icon: Smartphone },
] as const;

function ThemeCard({
  theme,
  active,
  previewDevice,
  onSelect,
  onPreviewDevice,
}: {
  theme: SiteTheme;
  active: boolean;
  previewDevice: PreviewDevice;
  onSelect: () => void;
  onPreviewDevice: (device: PreviewDevice) => void;
}) {
  const { t } = useI18n();
  // `themeThumb` only ships one real asset today (the "elegant" style) — the
  // frames themselves show all six cards sharing that same storefront
  // thumbnail and rely on the name/description below it to tell the cards
  // apart, rather than a distinct photo per theme. Fall back to that asset
  // instead of a flat gradient block so a merchant sees a design, not a
  // broken-looking colour swatch. Do not "fix" this back to a gradient —
  // it would be regressing to the wrong answer.
  const thumb = themeThumb(theme.styleId) ?? themeThumb("elegant");

  // A div, not a button: the card holds three real buttons (the device pair and
  // Use This), and a button nested in a button is invalid and swallows clicks.
  return (
    <div
      className={clsx(
        "flex flex-col overflow-hidden rounded-xl border bg-[var(--octo-card)] transition-all",
        active ? "border-[#0D6EFD] ring-1 ring-[#0D6EFD]/20" : "border-[var(--octo-border-card)]"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-label={t(theme.nameKey)}
        className="relative block focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0D6EFD]/40"
      >
        <img src={thumb ?? undefined} alt="" className="h-28 w-full object-cover" />
        {theme.recommended && (
          <span className="absolute start-2 top-2 rounded-full bg-[#0D6EFD] px-2 py-0.5 text-[10px] font-medium text-white">
            {t("publicLink.theme.recommended")}
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-1 px-3.5 pb-3.5 pt-3">
        <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t(theme.nameKey)}</p>
        <p className="text-[12px] text-[var(--octo-text-muted)]">{t(theme.descKey)}</p>

        <div className="mt-auto flex items-center gap-2 pt-2">
          <div className="flex shrink-0 overflow-hidden rounded-[9px] border border-[var(--octo-border-input)]">
            {CARD_DEVICES.map(({ id, Icon }) => {
              const on = active && previewDevice === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-label={`${t(theme.nameKey)} — ${t(`publicLink.device.${id}`)}`}
                  aria-pressed={on}
                  onClick={() => {
                    onSelect();
                    onPreviewDevice(id);
                  }}
                  className={clsx(
                    "grid h-8 w-8 place-items-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0D6EFD]/40",
                    on ? "bg-[#0D6EFD]/10 text-[#0D6EFD]" : "text-[var(--octo-text-muted)] hover:bg-[var(--octo-hover)]",
                    id === "mobile" && "border-s border-[var(--octo-border-input)]"
                  )}
                >
                  <Icon size={14} />
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onSelect}
            className={clsx(
              "h-8 flex-1 rounded-[9px] px-3 text-[12px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
              active ? "bg-[#0D6EFD] text-white" : "border border-[#0D6EFD] text-[#0D6EFD] hover:bg-[#0D6EFD]/5"
            )}
          >
            {t("publicLink.theme.use")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ThemeStep({ draft, dispatch }: StepProps) {
  const { t, locale } = useI18n();
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const activeFilter = draft.theme.filter;

  const visibleThemes = SITE_THEMES.filter(
    (theme) => activeFilter === "all" || theme.filters.includes(activeFilter)
  );

  const model = previewModelFromSite(draft, device, t, locale);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_520px]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-2">
            {THEME_FILTERS.map((filter) => {
              const active = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => dispatch({ type: "patchTheme", patch: { filter: filter.id } })}
                  className={clsx(
                    "rounded-[9px] border px-3 py-[7px] text-[12px] font-medium transition-colors",
                    active ? "border-[#0D6EFD] text-[#0D6EFD]" : "border-[var(--octo-border-card)] text-[var(--octo-text-muted)]"
                  )}
                >
                  {t(filter.labelKey)}
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
      <p className="flex items-center gap-1.5 rounded-[10px] bg-[#0D6EFD]/5 px-3 py-2.5 text-[12px] text-[#0D6EFD]">
        <Info size={14} className="shrink-0" />
        {t("publicLink.theme.keepsContent")}
      </p>
    </div>
  );
}
