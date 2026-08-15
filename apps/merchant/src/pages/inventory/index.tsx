// Bridge for the current route registry (`/inventory` -> `InventoryPage`).
// The real implementation now lives at `./ingredients` per docs/TASKS-PAGES.md
// W2-03's route-table split (`/inventory/ingredients`, `/inventory/recipes`,
// `/inventory/purchasing`, `/inventory/counts`, `/inventory/waste`,
// `/inventory/transfers`, `/inventory/production`). This re-export keeps the
// existing `/inventory` route working without duplicating content.
export { IngredientsPage as InventoryPage } from "./ingredients";
