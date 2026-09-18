// Bridge for the current route registry (`/settings` -> `SettingsPage`).
// W2-10's route-table split (`/settings/business`, `/settings/branches`,
// `/settings/devices`, `/settings/roles`, `/settings/tax`, `/settings/modules`)
// gave every settings section its own route; this re-export keeps the
// existing `/settings` route working by landing on Businesses.
export { BusinessesSettingsPage as SettingsPage } from "./businesses";
