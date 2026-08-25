// The link/theming panel beside step 8. Same registry `Aside` slot, same width
// and same treatment as the panels on steps 2, 4 and 5.
import { Check, Link2 } from "lucide-react";
import { Input } from "@ui/primitives";
import { getModule } from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { dnsLabel, sanitizeTag } from "./public-link-tag";
import type { StepProps } from "../_shared/steps";

export function PublicLinkAside({ draft, dispatch }: StepProps) {
  const { t } = useI18n();
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
                <span className="truncate text-[var(--octo-text-secondary)]">{t(module.nameKey)}</span>
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
