// W2-07 split the legacy Finance page into five sub-pages (payments,
// tax-invoices, settlements, accounting, house-accounts). The bare `/finance`
// route is wired to this file by the route registry, so keep it as a
// compatibility re-export of the Payments page.
export { PaymentsPage as FinancePage } from "./payments";
