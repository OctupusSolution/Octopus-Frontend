// Step 8 — the merchant looking at their own customer-facing page.
//
// Three parts, each in its own file: the depicted page (public-link-preview),
// the link and theming controls in the registry's `Aside` slot
// (public-link-aside), and the section list under it (public-link-sections).
// What is left here is the frame around them — the desktop/mobile toggle and
// the two cards.
//
// The preview and the section list read and write the same
// `publicLink.sections` array, so reordering or removing a section below
// changes the page above as it happens.
import { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { Segmented } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { StorefrontPreview } from "@/widgets/storefront-preview";
import { previewModelFromOnboarding } from "./public-link-model";
import { PublicLinkSections } from "./public-link-sections";
import type { StepProps } from "../_shared/steps";

export function PublicLinkStep({ draft, dispatch }: StepProps) {
  const { t, locale } = useI18n();
  const [view, setView] = useState<"desktop" | "mobile">("desktop");
  const model = previewModelFromOnboarding(draft, view === "mobile" ? "mobile" : "desktop", t, locale);

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            options={[
              {
                id: "desktop",
                label: (
                  <>
                    <Monitor size={14} />
                    <span className="sr-only">{t("onboarding.publicLink.desktop")}</span>
                  </>
                ),
              },
              {
                id: "mobile",
                label: (
                  <>
                    <Smartphone size={14} />
                    <span className="sr-only">{t("onboarding.publicLink.mobile")}</span>
                  </>
                ),
              },
            ]}
            value={view}
            onChange={(id) => setView(id as "desktop" | "mobile")}
          />
          <span className="text-[11.5px] text-[var(--octo-text-muted)]">{t("onboarding.publicLink.viewAsCustomer")}</span>
        </div>

        <div className="mt-4">
          <StorefrontPreview model={model} />
        </div>
      </section>

      <PublicLinkSections draft={draft} dispatch={dispatch} />
    </div>
  );
}
