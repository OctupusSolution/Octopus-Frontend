// The Hero section's inspector — the first of the five per-section panels
// Tasks 16-18 build on top of `controls.tsx`. The frames draw its Content tab
// in full; Style and Advanced are named in the tab strip but never drawn, so
// those two render an `EmptyState` rather than invented controls.
import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button, EmptyState, Input, Segmented, Select } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { readLogoFile } from "@/pages/onboarding/_shared/logo-file";
import type { HeroBackground, SiteAction, SiteDraft } from "../../_shared/site-draft";
import { FieldRow, InspectorTabs } from "./controls";

const BACKGROUND_OPTIONS: readonly { id: HeroBackground; labelKey: string }[] = [
  { id: "image", labelKey: "publicLink.hero.image" },
  { id: "video", labelKey: "publicLink.hero.video" },
  { id: "slider", labelKey: "publicLink.hero.slider" },
];

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

  function patch(patch: Partial<SiteDraft["sectionSettings"]["hero"]>) {
    dispatch({ type: "patchSection", section: "hero", patch });
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
            onClick={() => dispatch({ type: "setSections", sections: draft.sections.filter((section) => section.id !== "hero") })}
          >
            {t("publicLink.customize.deleteSection")}
          </Button>
        </div>
      )}

      {tab !== "content" && (
        <EmptyState title={t(tab === "style" ? "publicLink.hero.style" : "publicLink.hero.advanced")} description={t("publicLink.notBuiltYet")} />
      )}
    </div>
  );
}
