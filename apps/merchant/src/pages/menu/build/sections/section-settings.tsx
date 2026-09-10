// "Section Setting" — the step's middle column, editing whichever section the
// list has selected.
//
// Availability and Advanced are deliberately empty. The frame set has no panel
// for either and the spec describes no fields, so inventing controls here would
// be guessing at product decisions nobody has made. An empty state that says so
// is honest; a made-up form is not.
import { useState } from "react";
import clsx from "clsx";
import { Grid2x2, List, Trash2, GalleryHorizontal } from "lucide-react";
import { Button, EmptyState } from "@ui/primitives";
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

export function SectionSettings({
  section,
  onPatch,
  onClearImage,
  onChangeImage,
}: {
  section: Section | null;
  onPatch: (patch: Partial<Section>) => void;
  onClearImage: () => void;
  onChangeImage: () => void;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("general");

  if (!section) {
    return (
      <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
        <h2 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">
          {t("menuWiz.sec.settingTitle")}
        </h2>
        <div className="mt-6">
          <EmptyState title={t("menuWiz.sec.buildHint")} />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
      <h2 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">
        {t("menuWiz.sec.settingTitle")}
      </h2>
      <p className="mt-1 text-[15px] font-medium text-[var(--octo-text-primary)]">{section.name}</p>

      <div className="mt-3 flex gap-5 border-b border-[var(--octo-border-card)]">
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={clsx(
              "-mb-px border-b-2 pb-2 text-[14px]",
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
            <div className="mt-1.5 flex items-center gap-2.5">
              {section.image ? (
                <img src={section.image} alt="" className="h-12 w-12 rounded-[8px] object-cover" />
              ) : (
                <span
                  className="grid h-12 w-12 place-items-center rounded-[8px] bg-[#0d2b21] text-center font-serif text-[10px] leading-tight text-white/70"
                  aria-hidden
                >
                  ME
                  <br />
                  NU
                </span>
              )}
              <Button variant="secondary" className="flex-1 justify-center" onClick={onChangeImage}>
                {t("menuWiz.sec.changeImage")}
              </Button>
              <button
                type="button"
                aria-label={t("menuWiz.sec.image")}
                onClick={onClearImage}
                className="rounded-[9px] border border-[var(--octo-tone-danger-border,var(--octo-border-card))] p-2 text-error hover:bg-error/10"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <p className="mt-1 text-[12px] text-[var(--octo-text-muted)]">
              {t("menuWiz.sec.imageHint")}
            </p>
          </div>

          <label className="block">
            <span className="text-[13px] font-medium text-[var(--octo-text-primary)]">
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
            <legend className="text-[13px] font-medium text-[var(--octo-text-primary)]">
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
            <p className="text-[13px] font-medium text-[var(--octo-text-primary)]">
              {t("menuWiz.sec.displayStyle")}
            </p>
            <div className="mt-1.5 flex gap-2.5">
              {STYLES.map(({ id, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={section.displayStyle === id}
                  onClick={() => onPatch({ displayStyle: id })}
                  className={clsx(
                    "flex w-[86px] flex-col items-center gap-2 rounded-[10px] border px-2 py-3 text-[12.5px]",
                    section.displayStyle === id
                      ? "border-[var(--octo-accent)] text-[var(--octo-accent)]"
                      : "border-[var(--octo-border-card)] text-[var(--octo-text-secondary)]"
                  )}
                >
                  <Icon size={22} aria-hidden />
                  {t(`menuWiz.sec.style.${id}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[13px] font-medium text-[var(--octo-text-primary)]">
              {t("menuWiz.sec.color")}{" "}
              <span className="font-normal text-[var(--octo-text-secondary)]">
                ({t("menuWiz.sec.colorOptional")})
              </span>
            </p>
            <div className="mt-1.5 flex items-center gap-2.5">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={color}
                  aria-pressed={section.color === color}
                  onClick={() => onPatch({ color })}
                  style={{ background: color }}
                  className={clsx(
                    "h-7 w-7 rounded-full",
                    section.color === color &&
                      "ring-2 ring-[var(--octo-accent)] ring-offset-2 ring-offset-[var(--octo-card)]"
                  )}
                />
              ))}
              <button
                type="button"
                aria-label={t("menuWiz.sec.color")}
                onClick={() => onPatch({ color: null })}
                className="h-7 w-7 rounded-full"
                style={{
                  background:
                    "conic-gradient(#ef4444,#f59e0b,#22c55e,#0d6efd,#7c3aed,#ec4899,#ef4444)",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
