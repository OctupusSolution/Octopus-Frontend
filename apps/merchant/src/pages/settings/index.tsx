// Bridge for the current route registry (`/settings` -> `SettingsPage`).
// The real implementation now lives at `./integrations` per docs/TASKS-PAGES.md
// W2-10's route-table split (`/settings/business`, `/settings/branches`,
// `/settings/devices`, `/settings/roles`, `/settings/tax`, `/settings/modules`,
// `/settings/integrations`). This re-export keeps the existing `/settings`
// route working without duplicating content.
export { IntegrationsSettingsPage as SettingsPage } from "./integrations";
