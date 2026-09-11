// The seven-step registry the shell and the page both walk. Each step
// component takes exactly `StepProps` — Tasks 10-21 replace the stub bodies
// below without ever touching this shape.
import type { ComponentType } from "react";
import type { SiteAction, SiteDraft } from "./site-draft";
import { ThemeStep } from "../steps/theme-step";
import { BrandStep } from "../steps/brand-step";
import { PagesStep } from "../steps/pages-step";
import { NavigationStep } from "../steps/navigation-step";
import { CustomizeStep } from "../steps/customize-step";
import { PreviewStep } from "../steps/preview-step";
import { PublishStep } from "../steps/publish-step";

export interface StepProps {
  draft: SiteDraft;
  dispatch: (action: SiteAction) => void;
}

export interface SiteStep {
  id: string;
  labelKey: string;
  /** The step's real heading, shown by the shell (not the step body) beside
   *  the rail — e.g. "Choose Your Theme", "Customize Sections". */
  titleKey: string;
  /** Muted copy under `titleKey`. Publish has none in the frame, so it's the
   *  one step that omits this. */
  subtitleKey?: string;
  Component: ComponentType<StepProps>;
}

export const SITE_STEPS: readonly SiteStep[] = [
  { id: "theme", labelKey: "publicLink.step.theme", titleKey: "publicLink.stepTitle.theme", subtitleKey: "publicLink.theme.subtitle", Component: ThemeStep },
  { id: "brand", labelKey: "publicLink.step.brand", titleKey: "publicLink.stepTitle.brand", subtitleKey: "publicLink.brand.subtitle", Component: BrandStep },
  { id: "pages", labelKey: "publicLink.step.pages", titleKey: "publicLink.stepTitle.pages", subtitleKey: "publicLink.pages.subtitle", Component: PagesStep },
  { id: "navigation", labelKey: "publicLink.step.navigation", titleKey: "publicLink.stepTitle.navigation", subtitleKey: "publicLink.navigation.subtitle", Component: NavigationStep },
  { id: "customize", labelKey: "publicLink.step.customize", titleKey: "publicLink.stepTitle.customize", subtitleKey: "publicLink.customize.subtitle", Component: CustomizeStep },
  { id: "preview", labelKey: "publicLink.step.preview", titleKey: "publicLink.stepTitle.preview", subtitleKey: "publicLink.preview.subtitle", Component: PreviewStep },
  { id: "publish", labelKey: "publicLink.step.publish", titleKey: "publicLink.stepTitle.publish", Component: PublishStep },
];
