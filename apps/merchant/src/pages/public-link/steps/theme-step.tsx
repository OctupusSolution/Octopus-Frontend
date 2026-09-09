// Step 1 of the builder: filter chips over the six theme cards on the start
// side, the live preview (in a `DeviceFrame`) on the end side. Selecting a
// card or a filter both patch `draft.theme`, so either survives a refresh.
//
// The frames show a small desktop/mobile toggle baked into each card. Six
// independent device toggles competing with the one beside the preview would
// be a worse screen than the frame implies, so that per-card control is
// rendered decorative (aria-hidden) — the real toggle lives in the
// `DeviceFrame`.
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

function ThemeCard({ theme, active, onSelect }: { theme: SiteTheme; active: boolean; onSelect: () => void }) {
  const { t } = useI18n();
  // `themeThumb` only ships one real asset today (the "elegant" style) — the
  // frames themselves show all six cards sharing that same storefront
  // thumbnail and rely on the name/description below it to tell the cards
  // apart, rather than a distinct photo per theme. Fall back to that asset
  // instead of a flat gradient block so a merchant sees a design, not a
  // broken-looking colour swatch. Do not "fix" this back to a gradient —
  // it would be regressing to the wrong answer.
  const thumb = themeThumb(theme.styleId) ?? themeThumb("elegant");

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        "flex flex-col overflow-hidden rounded-xl border text-start transition-all",
        active ? "border-[#0D6EFD] ring-1 ring-[#0D6EFD]/20" : "border-[var(--octo-border-card)]"
      )}
    >
      <div className="relative">
        <img src={thumb ?? undefined} alt="" className="h-28 w-full object-cover" />

        {theme.recommended && (
          <span className="absolute start-2 top-2 rounded-full bg-[#0D6EFD] px-2 py-0.5 text-[10px] font-medium text-white">
            {t("publicLink.theme.recommended")}
          </span>
        )}

        {/* Decorative: the real device toggle is the DeviceFrame beside the
            grid, not a per-card control. */}
        <span aria-hidden className="absolute end-2 top-2 flex items-center gap-1 rounded-full bg-black/40 p-1">
          <Monitor size={11} className="text-white" />
          <Smartphone size={11} className="text-white" />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1 px-[18px] py-[15px]">
        <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t(theme.nameKey)}</p>
        <p className="text-[12.5px] text-[var(--octo-text-muted)]">{t(theme.descKey)}</p>
        <span
          className={clsx(
            "mt-2 self-start rounded-[9px] px-3 py-[7px] text-[12px] font-medium transition-colors",
            active ? "bg-[#0D6EFD] text-white" : "border border-[#0D6EFD] text-[#0D6EFD]"
          )}
        >
          {t("publicLink.theme.use")}
        </span>
      </div>
    </button>
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
      <p className="text-[13px] font-medium text-[var(--octo-text-primary)]">{t("publicLink.stepTitle.theme")}</p>
      <p className="-mt-2 text-[12px] text-[var(--octo-text-muted)]">{t("publicLink.theme.subtitle")}</p>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_520px]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
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
                onSelect={() => dispatch({ type: "patchTheme", patch: { id: theme.id } })}
              />
            ))}
          </div>

          <p className="flex items-center gap-1.5 rounded-[10px] bg-[#0D6EFD]/5 px-3 py-2.5 text-[11.5px] text-[#0D6EFD]">
            <Info size={13} className="shrink-0" />
            {t("publicLink.theme.keepsContent")}
          </p>
        </div>

        <DeviceFrame model={model} device={device} onDevice={setDevice} />
      </div>
    </div>
  );
}
