// The Hero section's inspector. Content is the tab the frames draw; Style and
// Advanced hold the settings a hero needs beyond its copy — how dark the scrim
// is, where the text sits and how tall the band is, which devices show it and
// the anchor its home link scrolls to. All three drive the live preview.
import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button, Input, Segmented, Select } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { readLogoFile } from "@/pages/onboarding/_shared/logo-file";
import type { HeroBackground, HeroSettings, SiteAction, SiteDraft } from "../../_shared/site-draft";
import { FieldRow, InspectorTabs, ToggleRow } from "./controls";

const BACKGROUND_OPTIONS: readonly { id: HeroBackground; labelKey: string }[] = [
  { id: "image", labelKey: "publicLink.hero.image" },
  { id: "video", labelKey: "publicLink.hero.video" },
  { id: "slider", labelKey: "publicLink.hero.slider" },
];

const ALIGN_OPTIONS: readonly HeroSettings["textAlign"][] = ["start", "center"];
const HEIGHT_OPTIONS: readonly HeroSettings["height"][] = ["compact", "standard", "tall"];

const TARGET_IDS = ["reservations", "menu", "offers", "waitlist", "contact"] as const;

const TABS = [
  { id: "content", labelKey: "publicLink.hero.content" },
  { id: "style", labelKey: "publicLink.hero.style" },
  { id: "advanced", labelKey: "publicLink.hero.advanced" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Module scope, not nested inside `HeroInspector`: a component redefined on
 *  every render would remount on every keystroke elsewhere in this panel —
 *  exactly the focus-loss bug this file exists to avoid. */
function TargetSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { t } = useI18n();
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{t("publicLink.hero.linkAction")}</option>
      {TARGET_IDS.map((id) => (
        <option key={id} value={id}>
          {t(`publicLink.target.${id}`)}
        </option>
      ))}
    </Select>
  );
}

export function HeroInspector({ draft, dispatch }: { draft: SiteDraft; dispatch: (action: SiteAction) => void }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<TabId>("content");
  const fileRef = useRef<HTMLInputElement>(null);
  const hero = draft.sectionSettings.hero;

  function patch(patch: Partial<HeroSettings>) {
    dispatch({ type: "patchSection", section: "hero", patch });
  }

  // Deleting the open section must also move the inspector off it — left
  // selected, the panel (Delete button included) stayed on screen editing a
  // section that was no longer on the page.
  function deleteSection() {
    const remaining = draft.sections.filter((section) => section.id !== "hero");
    dispatch({ type: "setSections", sections: remaining });
    if (remaining[0]) dispatch({ type: "selectSection", id: remaining[0].id });
  }

  return (
    <div className="flex flex-col gap-4">
      <InspectorTabs
        items={TABS.map((entry) => ({ id: entry.id, label: t(entry.labelKey) }))}
        value={tab}
        onChange={(id) => setTab(id as TabId)}
      />

      {tab === "content" && (
        <div className="flex flex-col gap-4">
          <FieldRow label={t("publicLink.hero.backgroundType")}>
            <Segmented
              options={BACKGROUND_OPTIONS.map((opt) => ({ id: opt.id, label: t(opt.labelKey) }))}
              value={hero.background}
              onChange={(id) => patch({ background: id as HeroBackground })}
            />
          </FieldRow>

          <FieldRow label={t("publicLink.hero.image")}>
            <>
              <div className="flex items-center gap-3">
                {hero.imageDataUrl ? (
                  <img src={hero.imageDataUrl} alt="" className="h-14 w-24 rounded-[9px] object-cover" />
                ) : (
                  <span className="flex h-14 w-24 items-center justify-center rounded-[9px] border border-dashed border-[var(--octo-border-input)] text-[var(--octo-text-faint)]">
                    <Upload size={14} />
                  </span>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => readLogoFile(e.target.files?.[0], (imageDataUrl) => patch({ imageDataUrl }))}
                />
                <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                  {t("publicLink.hero.changeImage")}
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-[var(--octo-text-muted)]">{t("publicLink.hero.imageHint")}</p>
            </>
          </FieldRow>

          <FieldRow label={t("publicLink.hero.heading")}>
            <Input
              placeholder={t("publicLink.hero.headingPlaceholder")}
              value={hero.heading}
              onChange={(e) => patch({ heading: e.target.value })}
            />
          </FieldRow>

          <FieldRow label={t("publicLink.hero.subheading")}>
            <Input
              placeholder={t("publicLink.hero.subheadingPlaceholder")}
              value={hero.subheading}
              onChange={(e) => patch({ subheading: e.target.value })}
            />
          </FieldRow>

          <div className="grid grid-cols-2 gap-3">
            <FieldRow label={t("publicLink.hero.primaryCta")}>
              <Input
                placeholder={t("publicLink.hero.ctaPlaceholder")}
                value={hero.primaryCta}
                onChange={(e) => patch({ primaryCta: e.target.value })}
              />
            </FieldRow>
            <FieldRow label={t("publicLink.hero.linkAction")}>
              <TargetSelect value={hero.primaryTarget} onChange={(primaryTarget) => patch({ primaryTarget })} />
            </FieldRow>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FieldRow label={`${t("publicLink.hero.secondaryCta")} (${t("publicLink.hero.optional")})`}>
              <Input
                placeholder={t("publicLink.hero.ctaPlaceholder")}
                value={hero.secondaryCta}
                onChange={(e) => patch({ secondaryCta: e.target.value })}
              />
            </FieldRow>
            <FieldRow label={t("publicLink.hero.linkAction")}>
              <TargetSelect value={hero.secondaryTarget} onChange={(secondaryTarget) => patch({ secondaryTarget })} />
            </FieldRow>
          </div>

          <Button
            variant="ghost"
            className="w-full justify-center bg-[#EF4444]/5 text-[#EF4444] hover:bg-[#EF4444]/10"
            onClick={deleteSection}
          >
            {t("publicLink.customize.deleteSection")}
          </Button>
        </div>
      )}

      {tab === "style" && (
        <div className="flex flex-col gap-4">
          <FieldRow label={t("publicLink.hero.overlay")}>
            <>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={5}
                  value={hero.overlay}
                  onChange={(e) => patch({ overlay: Number(e.target.value) })}
                  aria-label={t("publicLink.hero.overlay")}
                  className="flex-1 accent-[#0D6EFD]"
                />
                <span className="w-10 text-end text-[12px] tabular-nums text-[var(--octo-text-secondary)]">{hero.overlay}%</span>
              </div>
              <p className="mt-1 text-[11px] text-[var(--octo-text-muted)]">{t("publicLink.hero.overlayNote")}</p>
            </>
          </FieldRow>

          <FieldRow label={t("publicLink.hero.textAlign")}>
            <Segmented
              options={ALIGN_OPTIONS.map((id) => ({ id, label: t(`publicLink.hero.align.${id}`) }))}
              value={hero.textAlign}
              onChange={(id) => patch({ textAlign: id as HeroSettings["textAlign"] })}
            />
          </FieldRow>

          <FieldRow label={t("publicLink.hero.height")}>
            <Segmented
              options={HEIGHT_OPTIONS.map((id) => ({ id, label: t(`publicLink.hero.height.${id}`) }))}
              value={hero.height}
              onChange={(id) => patch({ height: id as HeroSettings["height"] })}
            />
          </FieldRow>
        </div>
      )}

      {tab === "advanced" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2.5 rounded-[10px] border border-[var(--octo-border-input)] px-3 py-2.5">
            <p className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">{t("publicLink.hero.visibility")}</p>
            <ToggleRow
              label={t("publicLink.hero.showOnDesktop")}
              checked={hero.showOnDesktop}
              onChange={() => patch({ showOnDesktop: !hero.showOnDesktop })}
            />
            <ToggleRow
              label={t("publicLink.hero.showOnMobile")}
              checked={hero.showOnMobile}
              onChange={() => patch({ showOnMobile: !hero.showOnMobile })}
            />
          </div>

          <FieldRow label={t("publicLink.hero.anchorId")}>
            <>
              <Input
                dir="ltr"
                value={hero.anchorId}
                // An anchor is part of a URL fragment: lowercase letters,
                // digits and hyphens only, so what the merchant types is what
                // actually works in a link.
                onChange={(e) => patch({ anchorId: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") })}
              />
              <p className="mt-1 text-[11px] text-[var(--octo-text-muted)]">{t("publicLink.hero.anchorNote")}</p>
            </>
          </FieldRow>
        </div>
      )}
    </div>
  );
}
