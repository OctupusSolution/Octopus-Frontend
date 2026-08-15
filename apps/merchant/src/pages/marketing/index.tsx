// Bridge for the current route registry (`/marketing` -> `MarketingPage`).
// The real implementation now lives at `./loyalty` per docs/TASKS-PAGES.md
// W2-06's route-table split (`/marketing/loyalty`, `/marketing/gift-cards`,
// `/marketing/subscriptions`, `/marketing/promotions`, `/marketing/campaigns`).
// This re-export keeps the existing `/marketing` route working without
// duplicating content.
export { LoyaltyProgramPage as MarketingPage } from "./loyalty";
