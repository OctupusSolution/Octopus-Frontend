// features/order/manage-order — operate one real order (lifecycle, lines,
// discounts, details, payment links, refunds, wastage, activity, receipt).
export { OrderWorkspacePanel } from "./order-workspace";
// The panel's own sections, for a screen that lays them out itself around one
// shared useOrderWorkspace (the Order Details page).
export { ActivitySection } from "./activity-section";
export { DetailsSection } from "./details-section";
export { LifecycleBar } from "./lifecycle-bar";
export { LinesPanel } from "./lines-panel";
export { PaymentsSection, RefundsSection, WastageSection } from "./money-sections";
