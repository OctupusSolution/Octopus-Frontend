// The link/theming panel beside step 8. Same registry `Aside` slot, same width
// and same treatment as the panels on steps 2, 4 and 5.
//
// Every control here edits the draft the preview beside it reads, so nothing in
// this panel is decoration: the colours, the typeface, the style and the logo
// all change the page rendered in public-link-step.tsx as they are set.
import { useRef } from "react";
import { Check, Link2, Pencil, Upload } from "lucide-react";
import { Input, Select } from "@ui/primitives";
import { getModule } from "@/shared/catalog";
import { CatalogIcon } from "@/shared/lib/catalog-icon";
import { useI18n } from "@/app/providers/i18n-provider";
import { FONTS, THEME_TEMPLATES } from "../_shared/brand-catalog";
import { readLogoFile } from "../_shared/logo-file";
import { dnsLabel, sanitizeTag } from "./public-link-tag";
import type { StepProps } from "../_shared/steps";

export function PublicLinkAside({ draft, dispatch }: StepProps) {
  const { t } = useI18n();
  const logoRef = useRef<HTMLInputElement>(null);
  const { brand, publicLink } = draft;
  const url = `https://${dnsLabel(publicLink.tag) || "restaurant"}.octopus.app`;

  return (
    <section className="flex h-fit flex-col gap-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-hover)] p-4">
      <div>
        <p className="text-[11.5px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.publicLink.yourLink")}</p>
        <p className="mt-1 text-[10.5px] text-[var(--octo-text-muted)]">{t("onboarding.publicLink.yourLinkNote")}</p>
        <p className="mt-2 flex items-center gap-1.5 rounded-[9px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-2.5 py-2 text-[11px] text-[#0D6EFD]">
          <Link2 size={12} className="shrink-0" />
          <span className="truncate">{url}</span>
        </p>
      </div>

      <Input
        label={t("onboarding.publicLink.customTag")}
        value={publicLink.tag}
        onChange={(e) => dispatch({ type: "patchPublicLink", patch: { tag: sanitizeTag(e.target.value) } })}
        className="!py-2 !text-[12px]"
      />

      <div>
        <p className="text-[11.5px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.publicLink.theming")}</p>
        <p className="mt-1 text-[10.5px] text-[var(--octo-text-muted)]">{t("onboarding.publicLink.themingNote")}</p>

        <label className="mt-2 flex items-center justify-between gap-3 text-[11px] text-[var(--octo-text-secondary)]">
          {t("onboarding.publicLink.primaryColor")}
          <input
            type="color"
            value={brand.primary}
            onChange={(e) => dispatch({ type: "patchBrand", patch: { primary: e.target.value } })}
            className="h-6 w-14 cursor-pointer rounded border border-[var(--octo-border-input)] bg-transparent p-0.5"
          />
        </label>

        <label className="mt-2 flex items-center justify-between gap-3 text-[11px] text-[var(--octo-text-secondary)]">
          {t("onboarding.publicLink.secondaryColor")}
          <input
            type="color"
            value={brand.secondary}
            onChange={(e) => dispatch({ type: "patchBrand", patch: { secondary: e.target.value } })}
            className="h-6 w-14 cursor-pointer rounded border border-[var(--octo-border-input)] bg-transparent p-0.5"
          />
        </label>

        {/* The Select primitive renders its own <label>, so these two rows name
            the control with aria-label and put the visible text beside it
            instead — nesting a <label> inside a <label> would be invalid. */}
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[11px] text-[var(--octo-text-secondary)]">{t("onboarding.publicLink.font")}</span>
          <Select
            aria-label={t("onboarding.publicLink.font")}
            value={brand.font}
            onChange={(e) => dispatch({ type: "patchBrand", patch: { font: e.target.value } })}
            className="!w-[135px] !py-1.5 !text-[11.5px]"
          >
            {FONTS.map((font) => (
              <option key={font.id} value={font.id} style={{ fontFamily: font.stack }}>
                {font.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Style edits `brand.themeTemplate` — the field step 4's template cards
            already set — rather than a second, parallel style field. */}
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[11px] text-[var(--octo-text-secondary)]">{t("onboarding.publicLink.style")}</span>
          <Select
            aria-label={t("onboarding.publicLink.style")}
            value={brand.themeTemplate ?? "modern"}
            onChange={(e) => dispatch({ type: "patchBrand", patch: { themeTemplate: e.target.value } })}
            className="!w-[135px] !py-1.5 !text-[11.5px]"
          >
            {THEME_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>
                {t(template.nameKey)}
              </option>
            ))}
          </Select>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[11px] text-[var(--octo-text-secondary)]">{t("onboarding.publicLink.logo")}</span>
          <input
            ref={logoRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) =>
              readLogoFile(e.target.files?.[0], (logoDataUrl) =>
                dispatch({ type: "patchBrand", patch: { logoDataUrl } })
              )
            }
          />
          <button
            type="button"
            onClick={() => logoRef.current?.click()}
            aria-label={t(brand.logoDataUrl ? "onboarding.details.changeLogo" : "onboarding.details.uploadLogo")}
            className="flex h-8 w-[135px] items-center justify-center gap-2 rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2 text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)]"
          >
            {brand.logoDataUrl ? (
              <img src={brand.logoDataUrl} alt="" className="h-5 max-w-[80px] object-contain" />
            ) : (
              <Upload size={13} />
            )}
            <Pencil size={11} className="shrink-0" />
          </button>
        </div>
      </div>

      <div>
        <p className="text-[11.5px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.publicLink.connectedModules")}</p>
        <p className="mt-1 text-[10.5px] text-[var(--octo-text-muted)]">
          {t("onboarding.publicLink.connectedNote").replace("{n}", String(draft.enabled.length))}
        </p>
        <ul className="mt-2 flex flex-col gap-1">
          {draft.enabled.map((id) => {
            const module = getModule(id);
            return module ? (
              <li key={id} className="flex items-center justify-between gap-2 rounded-[8px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-2.5 py-1.5 text-[10.5px]">
                <span className="flex min-w-0 items-center gap-1.5 text-[var(--octo-text-secondary)]">
                  <CatalogIcon name={module.icon} size={12} className="shrink-0 text-[var(--octo-text-faint)]" />
                  <span className="truncate">{t(module.nameKey)}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-[#22C55E]">
                  <Check size={10} strokeWidth={3} />
                  {t("onboarding.publicLink.live")}
                </span>
              </li>
            ) : null;
          })}
        </ul>
      </div>
    </section>
  );
}
