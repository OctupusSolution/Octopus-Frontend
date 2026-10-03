// "Section Setting" — the step's middle column, editing whichever section the
// list has selected.
//
// Availability and Advanced are deliberately empty. The frame set has no panel
// for either and the spec describes no fields, so inventing controls here would
// be guessing at product decisions nobody has made. An empty state that says so
// is honest; a made-up form is not.
import { useRef, useState } from "react";
import clsx from "clsx";
import { EmptyState } from "@ui/primitives";
import { useFilePicker } from "@/shared/ui/use-file-picker";
import { MediaTile } from "@/shared/ui/media-tile";
import type { DisplayStyle, Section } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { menuAsset } from "@/shared/lib/menu-assets";
import { MenuIcon } from "../../_shared/menu-icon";
import { FOCUS, LINE, PANEL, TEXT, TEXT_GRAY } from "../../_shared/theme";

type Tab = "general" | "availability" | "advanced";
const TABS: Tab[] = ["general", "availability", "advanced"];

const STYLES: { id: DisplayStyle; icon: string }[] = [
  { id: "list", icon: "menu-bars.svg" },
  { id: "carousel", icon: "menu-carousel.svg" },
  { id: "grid", icon: "menu-grid.svg" },
];

// Five fixed swatches plus a custom picker, as the frame draws them.
const COLORS = ["#ab0101", "#db9200", "#e700c1", "#1160fe", "#ae00e3"];

const COLOR_WHEEL = menuAsset("menu-color-wheel.png");
const SELECTED_RING = "ring-2 ring-[#0D6EFD] ring-offset-2 ring-offset-[var(--octo-card)]";
const LABEL = `text-[14px] font-medium leading-[14px] ${TEXT}`;
const ACCENT_TEXT = "text-[#0058da] [[data-theme=dark]_&]:text-[#8ab8ff]";

export function SectionSettings({
  section,
  onPatch,
  onClearImage,
}: {
  section: Section | null;
  onPatch: (patch: Partial<Section>) => void;
  onClearImage: () => void;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("general");
  const picker = useFilePicker((dataUrl) => onPatch({ image: dataUrl }));
  const colorInput = useRef<HTMLInputElement>(null);

  const title = <h2 className={clsx("text-[18px] font-bold leading-[18px]", TEXT)}>{t("menuWiz.sec.settingTitle")}</h2>;

  if (!section) {
    return (
      <section className={clsx("flex flex-col gap-4", PANEL)}>
        {title}
        <EmptyState title={t("menuWiz.sec.buildHint")} />
      </section>
    );
  }

  // Anything not among the fixed swatches came from the custom picker.
  const color = section.color?.toLowerCase() ?? null;
  const customColor = color !== null && !COLORS.includes(color) ? color : null;

  return (
    <section className={clsx("flex flex-col gap-4", PANEL)}>
      {title}

      <div className="flex flex-col gap-4">
        <p className={clsx("truncate text-[16px] font-medium leading-4", TEXT)}>{section.name}</p>
        <div role="tablist" className="flex gap-8 border-b border-[#e2e8f0] [[data-theme=dark]_&]:border-[var(--octo-border-card)]">
          {TABS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={clsx(
                "-mb-px border-b pb-[11px] pt-1 text-[14px] font-medium leading-[14px]",
                tab === id ? "border-[#0D6EFD] text-[#0D6EFD]" : `border-transparent ${TEXT_GRAY}`
              )}
            >
              {t(`menuWiz.sec.tab.${id}`)}
            </button>
          ))}
        </div>
      </div>

      {tab !== "general" ? (
        <EmptyState title={t(`menuWiz.sec.tab.${tab}`)} />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <p className={clsx("text-[12px] font-medium leading-3", TEXT)}>{t("menuWiz.sec.image")}</p>
            <div className="flex items-stretch gap-3">
              <span className={clsx("h-[57px] w-[82px] shrink-0 rounded-[12px] border border-dashed p-1", LINE)}>
                <MediaTile src={section.image} rounded="rounded-[8px]" />
              </span>
              {picker.input}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={picker.open}
                    className="h-9 min-w-0 flex-1 truncate rounded-[8px] border border-[#0D6EFD] px-3 text-[12px] font-bold leading-3 text-[#0D6EFD] hover:bg-[#f5f9ff] [[data-theme=dark]_&]:hover:bg-[#0d6efd]/15"
                  >
                    {t("menuWiz.sec.changeImage")}
                  </button>
                  <button
                    type="button"
                    aria-label={t("menuWiz.sec.deleteImage")}
                    onClick={onClearImage}
                    className="grid size-9 shrink-0 place-items-center rounded-[8px] bg-[#fef0f0] text-[#d30202] hover:brightness-95 [[data-theme=dark]_&]:bg-[#d30202]/15 [[data-theme=dark]_&]:text-[#ff6b6b]"
                  >
                    <MenuIcon name="menu-trash.svg" size={24} />
                  </button>
                </div>
                <p className={clsx("text-[12px] leading-[1.4]", TEXT_GRAY)}>{t("menuWiz.sec.imageHint")}</p>
              </div>
            </div>
            {picker.error && (
              <p role="alert" className="text-[12px] leading-[14px] text-[#d30202]">
                {t(picker.error === "too-large" ? "menuWiz.sec.error.tooLarge" : "menuWiz.sec.error.unreadable")}
              </p>
            )}
          </div>

          <label className="flex flex-col gap-2">
            <span className={LABEL}>{t("menuWiz.sec.description")}</span>
            <textarea
              rows={3}
              value={section.description}
              onChange={(e) => onPatch({ description: e.target.value })}
              className={clsx(
                "w-full resize-y rounded-[12px] border bg-[var(--octo-card)] px-3 py-2 text-[12px] font-medium leading-[1.4]",
                LINE,
                TEXT,
                FOCUS
              )}
            />
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className={clsx("mb-2", LABEL)}>{t("menuWiz.sec.visibility")}</legend>
            {(["visible", "hidden"] as const).map((value) => {
              const checked = section.visibility === value;
              return (
                <label key={value} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name={`visibility-${section.id}`}
                    checked={checked}
                    onChange={() => onPatch({ visibility: value })}
                    className="peer sr-only"
                  />
                  <span className="inline-flex rounded-full peer-focus-visible:ring-2 peer-focus-visible:ring-[#0D6EFD]/40">
                    <MenuIcon
                      name={checked ? "menu-radio-on.svg" : "menu-radio-off.svg"}
                      size={24}
                      className={checked ? "text-[#0D6EFD]" : "text-[#64748b]"}
                    />
                  </span>
                  <span className={clsx("text-[14px] font-medium leading-[14px]", checked ? ACCENT_TEXT : TEXT_GRAY)}>
                    {t(`menuWiz.sec.${value}`)} (<span className="text-[12px] leading-3">{t(`menuWiz.sec.${value}Hint`)})</span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          <div className="flex flex-col gap-2">
            <p className={LABEL}>{t("menuWiz.sec.displayStyle")}</p>
            <div className="flex gap-2">
              {STYLES.map(({ id, icon }) => {
                const active = section.displayStyle === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onPatch({ displayStyle: id })}
                    className={clsx(
                      "flex min-w-[70px] flex-col items-center gap-2 rounded-[4px] border p-2 text-[12px] font-semibold leading-3",
                      active ? "border-[#0D6EFD] text-[#0D6EFD]" : `${LINE} ${TEXT}`
                    )}
                  >
                    <MenuIcon name={icon} size={40} />
                    {t(`menuWiz.sec.style.${id}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className={LABEL}>
              {t("menuWiz.sec.color")}{" "}
              <span className={clsx("text-[12px] font-normal leading-3", TEXT_GRAY)}>({t("menuWiz.sec.colorOptional")})</span>
            </p>
            <div className="flex items-center gap-2">
              {/* Pressing the selected swatch again clears it — the colour is
                  optional, so there has to be a way back to none. */}
              {COLORS.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  aria-label={swatch}
                  aria-pressed={color === swatch}
                  onClick={() => onPatch({ color: color === swatch ? null : swatch })}
                  style={{ background: swatch }}
                  className={clsx("size-6 rounded-full", color === swatch && SELECTED_RING)}
                />
              ))}
              <span className="relative size-6">
                <button
                  type="button"
                  aria-label={t("menuWiz.sec.customColor")}
                  aria-pressed={customColor !== null}
                  onClick={() => colorInput.current?.click()}
                  className={clsx("relative grid size-6 place-items-center rounded-full", customColor && SELECTED_RING)}
                >
                  <img src={COLOR_WHEEL} alt="" className="absolute inset-0 size-full rounded-full object-cover" />
                  {customColor && (
                    <span
                      aria-hidden
                      className="relative size-3 rounded-full border-2 border-white"
                      style={{ background: customColor }}
                    />
                  )}
                </button>
                {/* Transparent rather than display:none — some browsers will not
                    open the picker for an input that is not rendered. */}
                <input
                  ref={colorInput}
                  type="color"
                  tabIndex={-1}
                  aria-hidden
                  value={customColor ?? "#0d6efd"}
                  onChange={(e) => onPatch({ color: e.target.value })}
                  className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
                />
              </span>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
