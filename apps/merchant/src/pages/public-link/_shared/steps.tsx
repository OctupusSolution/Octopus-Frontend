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

export const SITE_STEPS: readonly { id: string; labelKey: string; Component: ComponentType<StepProps> }[] = [
  { id: "theme", labelKey: "publicLink.step.theme", Component: ThemeStep },
  { id: "brand", labelKey: "publicLink.step.brand", Component: BrandStep },
  { id: "pages", labelKey: "publicLink.step.pages", Component: PagesStep },
  { id: "navigation", labelKey: "publicLink.step.navigation", Component: NavigationStep },
  { id: "customize", labelKey: "publicLink.step.customize", Component: CustomizeStep },
  { id: "preview", labelKey: "publicLink.step.preview", Component: PreviewStep },
  { id: "publish", labelKey: "publicLink.step.publish", Component: PublishStep },
];
