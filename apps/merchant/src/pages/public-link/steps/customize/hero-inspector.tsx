// The Hero section's inspector. Content is the tab the frames draw; Style and
// Advanced hold the settings a hero needs beyond its copy — how dark the scrim
// is, where the text sits and how tall the band is, which devices show it and
// the anchor its home link scrolls to. All three drive the live preview.
import { useRef, useState } from "react";
import { useI18n } from "@/app/providers/i18n-provider";
import { readLogoFile } from "@/pages/onboarding/_shared/logo-file";
import type { HeroBackground, HeroSettings, SiteAction, SiteDraft } from "../../_shared/site-draft";
import { usePlText } from "../../_shared/texts";
import { rules, useTouched, useValidation, type RuleFailure } from "../../_shared/validation";
import { PlButton, PlInput, PlSelect, plText } from "../../ui/kit";
import { FieldRow, IMAGE_ACCEPT, ImageSlot, imageFileFailure, InspectorTabs, SegmentedChips, ToggleRow } from "./controls";

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

// What fits the hero band: one line of heading, two of supporting copy, and a
// button label short enough to stay on one line on a phone.
const HEADING_MAX = 80;
const SUBHEADING_MAX = 160;
const CTA_MAX = 30;
const ANCHOR_MAX = 40;

/** Module scope, not nested inside `HeroInspector`: a component redefined on
 *  every render would remount on every keystroke elsewhere in this panel —
 *  exactly the focus-loss bug this file exists to avoid. */
function TargetSelect({
  label,
  value,
  onChange,
  onBlur,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  onBlur: () => void;
  invalid: boolean;
}) {
  const { t } = useI18n();
  return (
    <PlSelect aria-label={label} invalid={invalid} value={value} onBlur={onBlur} onChange={(e) => onChange(e.target.value)}>
      <option value="">{t("publicLink.hero.linkAction")}</option>
      {TARGET_IDS.map((id) => (
        <option key={id} value={id}>
          {t(`publicLink.target.${id}`)}
        </option>
      ))}
    </PlSelect>
  );
}

export function HeroInspector({ draft, dispatch }: { draft: SiteDraft; dispatch: (action: SiteAction) => void }) {
  const { t } = useI18n();
  const tx = usePlText();
  const { check, message } = useValidation();
  const { touched, touch } = useTouched();
  const [tab, setTab] = useState<TabId>("content");
  const [imageFailure, setImageFailure] = useState<RuleFailure | null>(null);
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

  // PNG / JPG / WebP up to the builder's size cap; a refused file leaves the
  // current image in place and says why.
  function pickImage(file: File | undefined) {
    if (!file) return;
    const failure = imageFileFailure(file, tx("pl.customize.hero.imageTypes"));
    setImageFailure(failure);
    if (!failure) readLogoFile(file, (imageDataUrl) => patch({ imageDataUrl }));
  }

  const show = (name: string, error: string | undefined) => (touched(name) ? error : undefined);

  const headingError = show("heading", check(hero.heading, [rules.required(), rules.maxLength(HEADING_MAX)]));
  const subheadingError = show("subheading", check(hero.subheading, [rules.maxLength(SUBHEADING_MAX)]));
  // A button with somewhere to go needs a label; a label with nowhere to go
  // needs a destination. The secondary button is optional as a whole.
  const primaryCtaError = show(
    "primaryCta",
    check(hero.primaryCta, [...(hero.primaryTarget ? [rules.required()] : []), rules.maxLength(CTA_MAX)])
  );
  const secondaryCtaError = show("secondaryCta", check(hero.secondaryCta, [rules.maxLength(CTA_MAX)]));
  const secondaryTargetError = show(
    "secondaryTarget",
    hero.secondaryCta.trim() && !hero.secondaryTarget ? tx("pl.customize.hero.chooseAction") : undefined
  );
  const anchorError = show("anchorId", check(hero.anchorId, [rules.slug(), rules.maxLength(ANCHOR_MAX)]));
  const imageError = message(imageFailure);

  return (
    <div className="flex flex-col gap-4">
      <InspectorTabs
        items={TABS.map((entry) => ({ id: entry.id, label: t(entry.labelKey) }))}
        value={tab}
        onChange={(id) => setTab(id as TabId)}
      />

      {tab === "content" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <FieldRow small label={t("publicLink.hero.backgroundType")}>
              <SegmentedChips
                label={t("publicLink.hero.backgroundType")}
                options={BACKGROUND_OPTIONS.map((opt) => ({ id: opt.id, label: t(opt.labelKey) }))}
                value={hero.background}
                onChange={(background) => patch({ background })}
              />
            </FieldRow>

            <ImageSlot src={hero.imageDataUrl} empty={tx("pl.customize.noImage")} invalid={Boolean(imageError)} />

            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept={IMAGE_ACCEPT}
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => {
                  pickImage(e.target.files?.[0]);
                  // Let the same file be picked again after a refusal.
                  e.target.value = "";
                }}
              />
              <PlButton variant="outline" size="md" className="w-full" onClick={() => fileRef.current?.click()}>
                {t("publicLink.hero.changeImage")}
              </PlButton>
              {imageError ? (
                <p role="alert" className="text-[12px] leading-[1.4] text-[var(--pl-error)]">
                  {imageError}
                </p>
              ) : (
                <p className={plText.hint}>{t("publicLink.hero.imageHint")}</p>
              )}
            </div>
          </div>

          <FieldRow label={t("publicLink.hero.heading")} error={headingError}>
            <PlInput
              aria-label={t("publicLink.hero.heading")}
              placeholder={tx("pl.customize.hero.headingPlaceholder")}
              invalid={Boolean(headingError)}
              value={hero.heading}
              onBlur={() => touch("heading")}
              onChange={(e) => patch({ heading: e.target.value })}
            />
          </FieldRow>

          <FieldRow label={t("publicLink.hero.subheading")} error={subheadingError}>
            <PlInput
              aria-label={t("publicLink.hero.subheading")}
              placeholder={tx("pl.customize.hero.subheadingPlaceholder")}
              invalid={Boolean(subheadingError)}
              value={hero.subheading}
              onBlur={() => touch("subheading")}
              onChange={(e) => patch({ subheading: e.target.value })}
            />
          </FieldRow>

          <FieldRow label={t("publicLink.hero.primaryCta")} error={primaryCtaError}>
            <PlInput
              aria-label={t("publicLink.hero.primaryCta")}
              placeholder={tx("pl.customize.hero.primaryCtaPlaceholder")}
              invalid={Boolean(primaryCtaError)}
              value={hero.primaryCta}
              onBlur={() => touch("primaryCta")}
              onChange={(e) => patch({ primaryCta: e.target.value })}
            />
          </FieldRow>

          <FieldRow label={t("publicLink.hero.linkAction")}>
            <TargetSelect
              label={`${t("publicLink.hero.primaryCta")} — ${t("publicLink.hero.linkAction")}`}
              value={hero.primaryTarget}
              invalid={false}
              // Choosing a destination is what makes the label required.
              onBlur={() => touch("primaryCta")}
              onChange={(primaryTarget) => patch({ primaryTarget })}
            />
          </FieldRow>

          <FieldRow label={t("publicLink.hero.secondaryCta")} optional={`(${t("publicLink.hero.optional")})`} error={secondaryCtaError}>
            <PlInput
              aria-label={t("publicLink.hero.secondaryCta")}
              placeholder={tx("pl.customize.hero.secondaryCtaPlaceholder")}
              invalid={Boolean(secondaryCtaError)}
              value={hero.secondaryCta}
              onBlur={() => {
                touch("secondaryCta");
                touch("secondaryTarget");
              }}
              onChange={(e) => patch({ secondaryCta: e.target.value })}
            />
          </FieldRow>

          <FieldRow label={t("publicLink.hero.linkAction")} error={secondaryTargetError}>
            <TargetSelect
              label={`${t("publicLink.hero.secondaryCta")} — ${t("publicLink.hero.linkAction")}`}
              value={hero.secondaryTarget}
              invalid={Boolean(secondaryTargetError)}
              onBlur={() => touch("secondaryTarget")}
              onChange={(secondaryTarget) => patch({ secondaryTarget })}
            />
          </FieldRow>

          <PlButton variant="dangerSoft" size="lg" className="w-full !text-[16px] !leading-[16px]" onClick={deleteSection}>
            {t("publicLink.customize.deleteSection")}
          </PlButton>
        </div>
      )}

      {tab === "style" && (
        <div className="flex flex-col gap-4">
          <FieldRow label={t("publicLink.hero.overlay")} hint={t("publicLink.hero.overlayNote")}>
            <div className="flex h-10 items-center gap-3">
              <input
                type="range"
                min={0}
                max={80}
                step={5}
                value={hero.overlay}
                onChange={(e) => patch({ overlay: Number(e.target.value) })}
                aria-label={t("publicLink.hero.overlay")}
                className="min-w-0 flex-1 accent-[#0D6EFD]"
              />
              <span className="w-10 text-end text-[14px] font-medium tabular-nums leading-[14px] text-[var(--pl-text-2)]">{hero.overlay}%</span>
            </div>
          </FieldRow>

          <FieldRow label={t("publicLink.hero.textAlign")}>
            <SegmentedChips
              label={t("publicLink.hero.textAlign")}
              options={ALIGN_OPTIONS.map((id) => ({ id, label: t(`publicLink.hero.align.${id}`) }))}
              value={hero.textAlign}
              onChange={(textAlign) => patch({ textAlign })}
              className="!justify-start"
            />
          </FieldRow>

          <FieldRow label={t("publicLink.hero.height")}>
            <SegmentedChips
              label={t("publicLink.hero.height")}
              options={HEIGHT_OPTIONS.map((id) => ({ id, label: t(`publicLink.hero.height.${id}`) }))}
              value={hero.height}
              onChange={(height) => patch({ height })}
            />
          </FieldRow>
        </div>
      )}

      {tab === "advanced" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 rounded-[12px] border border-[var(--pl-g300)] p-3">
            <p className={plText.h6}>{t("publicLink.hero.visibility")}</p>
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

          <FieldRow label={t("publicLink.hero.anchorId")} hint={t("publicLink.hero.anchorNote")} error={anchorError}>
            <PlInput
              dir="ltr"
              aria-label={t("publicLink.hero.anchorId")}
              invalid={Boolean(anchorError)}
              value={hero.anchorId}
              onBlur={() => touch("anchorId")}
              // An anchor is part of a URL fragment: lowercase letters,
              // digits and hyphens only, so what the merchant types is what
              // actually works in a link.
              onChange={(e) => patch({ anchorId: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") })}
            />
          </FieldRow>
        </div>
      )}
    </div>
  );
}
