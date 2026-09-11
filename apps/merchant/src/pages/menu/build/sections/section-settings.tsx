// "Section Setting" — the step's middle column, editing whichever section the
// list has selected.
//
// Availability and Advanced are deliberately empty. The frame set has no panel
// for either and the spec describes no fields, so inventing controls here would
// be guessing at product decisions nobody has made. An empty state that says so
// is honest; a made-up form is not.
import { useRef, useState } from "react";
import clsx from "clsx";
import { Grid2x2, List, Trash2, GalleryHorizontal } from "lucide-react";
import { EmptyState } from "@ui/primitives";
import { useFilePicker } from "@/shared/ui/use-file-picker";
import { MediaTile } from "@/shared/ui/media-tile";
import type { DisplayStyle, Section } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";

type Tab = "general" | "availability" | "advanced";
const TABS: Tab[] = ["general", "availability", "advanced"];

const STYLES: { id: DisplayStyle; icon: typeof List }[] = [
  { id: "list", icon: List },
  { id: "carousel", icon: GalleryHorizontal },
  { id: "grid", icon: Grid2x2 },
];

// Five fixed swatches plus a custom picker, as the frame draws them.
const COLORS = ["#a91d1d", "#d99400", "#d61f9c", "#0d6efd", "#7c3aed"];

const RAINBOW = "conic-gradient(#ef4444,#f59e0b,#22c55e,#0d6efd,#7c3aed,#ec4899,#ef4444)";
const SELECTED_RING = "ring-2 ring-[var(--octo-accent)] ring-offset-2 ring-offset-[var(--octo-card)]";

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

  if (!section) {
    return (
      <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
        <h2 className="text-[18px] font-semibold text-[var(--octo-text-primary)]">
          {t("menuWiz.sec.settingTitle")}
        </h2>
        <div className="mt-6">
          <EmptyState title={t("menuWiz.sec.buildHint")} />
        </div>
      </section>
    );
  }

  // Anything not among the fixed swatches came from the custom picker.
  const customColor =
    section.color !== null && !COLORS.includes(section.color) ? section.color : null;

  return (
    <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
      <h2 className="text-[18px] font-semibold text-[var(--octo-text-primary)]">
        {t("menuWiz.sec.settingTitle")}
      </h2>
      <p className="mt-1 text-[16px] font-medium text-[var(--octo-text-primary)]">{section.name}</p>

      <div className="mt-3 flex gap-5 border-b border-[var(--octo-border-card)]">
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={clsx(
              "-mb-px border-b-2 pb-2 text-[15px]",
              tab === id
                ? "border-[var(--octo-accent)] font-medium text-[var(--octo-accent)]"
                : "border-transparent text-[var(--octo-text-secondary)]"
            )}
          >
            {t(`menuWiz.sec.tab.${id}`)}
          </button>
        ))}
      </div>

      {tab !== "general" ? (
        <div className="mt-6">
          <EmptyState title={t(`menuWiz.sec.tab.${tab}`)} />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-[13px] font-medium text-[var(--octo-text-primary)]">
              {t("menuWiz.sec.image")}
            </p>
            <div className="mt-1.5 flex items-start gap-2.5">
              <span className="h-[60px] w-[88px] shrink-0 overflow-hidden rounded-[8px] border border-dashed border-[var(--octo-border-input)] p-0.5">
                <MediaTile src={section.image} rounded="rounded-[6px]" />
              </span>
              {picker.input}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={picker.open}
                    className="h-9 min-w-0 flex-1 truncate rounded-[8px] border border-[var(--octo-accent)] px-3 text-[14px] font-medium text-[var(--octo-accent)] hover:bg-[var(--octo-hover)]"
                  >
                    {t("menuWiz.sec.changeImage")}
                  </button>
                  <button
                    type="button"
                    aria-label={t("menuWiz.sec.deleteImage")}
                    onClick={onClearImage}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] border border-error/40 bg-error/10 text-error hover:bg-error/15"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <p className="mt-1 text-[12.5px] text-[var(--octo-text-muted)]">
                  {t("menuWiz.sec.imageHint")}
                </p>
              </div>
            </div>
            {picker.error && (
              <p role="alert" className="mt-1.5 text-[12.5px] text-error">
                {t(picker.error === "too-large" ? "menuWiz.sec.error.tooLarge" : "menuWiz.sec.error.unreadable")}
              </p>
            )}
          </div>

          <label className="block">
            <span className="text-[15px] font-medium text-[var(--octo-text-primary)]">
              {t("menuWiz.sec.description")}
            </span>
            <textarea
              rows={3}
              value={section.description}
              onChange={(e) => onPatch({ description: e.target.value })}
              className="mt-1.5 w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2 text-[14px] text-[var(--octo-text-primary)]"
            />
          </label>

          <fieldset>
            <legend className="text-[15px] font-medium text-[var(--octo-text-primary)]">
              {t("menuWiz.sec.visibility")}
            </legend>
            <div className="mt-1.5 space-y-2">
              {(["visible", "hidden"] as const).map((value) => (
                <label key={value} className="flex items-center gap-2.5 text-[14px]">
                  <input
                    type="radio"
                    name={`visibility-${section.id}`}
                    checked={section.visibility === value}
                    onChange={() => onPatch({ visibility: value })}
                    className="h-4 w-4 accent-[var(--octo-accent)]"
                  />
                  <span
                    className={clsx(
                      "font-medium",
                      section.visibility === value
                        ? "text-[var(--octo-accent)]"
                        : "text-[var(--octo-text-primary)]"
                    )}
                  >
                    {t(`menuWiz.sec.${value}`)}
                  </span>
                  <span className="text-[var(--octo-text-secondary)]">
                    ({t(`menuWiz.sec.${value}Hint`)})
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <p className="text-[15px] font-medium text-[var(--octo-text-primary)]">
              {t("menuWiz.sec.displayStyle")}
            </p>
            <div className="mt-1.5 flex gap-2">
              {STYLES.map(({ id, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={section.displayStyle === id}
                  onClick={() => onPatch({ displayStyle: id })}
                  className={clsx(
                    "flex h-[75px] w-[66px] flex-col items-center justify-center gap-1 rounded-[6px] border text-[12px] font-medium",
                    section.displayStyle === id
                      ? "border-[var(--octo-accent)] text-[var(--octo-accent)]"
                      : "border-[var(--octo-border-card)] text-[var(--octo-text-primary)]"
                  )}
                >
                  <Icon size={36} strokeWidth={1.6} aria-hidden />
                  {t(`menuWiz.sec.style.${id}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[15px] font-medium text-[var(--octo-text-primary)]">
              {t("menuWiz.sec.color")}{" "}
              <span className="text-[13px] font-normal text-[var(--octo-text-secondary)]">
                ({t("menuWiz.sec.colorOptional")})
              </span>
            </p>
            <div className="mt-1.5 flex items-center gap-2.5">
              {/* Pressing the selected swatch again clears it — the colour is
                  optional, so there has to be a way back to none. */}
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={color}
                  aria-pressed={section.color === color}
                  onClick={() => onPatch({ color: section.color === color ? null : color })}
                  style={{ background: color }}
                  className={clsx("h-7 w-7 rounded-full", section.color === color && SELECTED_RING)}
                />
              ))}
              <span className="relative h-7 w-7">
                <button
                  type="button"
                  aria-label={t("menuWiz.sec.customColor")}
                  aria-pressed={customColor !== null}
                  onClick={() => colorInput.current?.click()}
                  style={{ background: RAINBOW }}
                  className={clsx(
                    "grid h-7 w-7 place-items-center rounded-full",
                    customColor && SELECTED_RING
                  )}
                >
                  {customColor && (
                    <span
                      aria-hidden
                      className="h-3.5 w-3.5 rounded-full border-2 border-white"
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
        </div>
      )}
    </section>
  );
}
