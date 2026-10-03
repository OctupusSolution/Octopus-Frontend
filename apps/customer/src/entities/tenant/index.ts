// Tenant data is owned by @octopus/api-client so the merchant portal and the
// mock API resolve the exact same branch ids and names. This slice is the
// customer app's public surface onto it.
export type { Tenant, Branch } from "@octopus/api-client";
export { getTenantBySlug, getBranchName } from "@octopus/api-client";

export const TENANT_SLUG_HEADER = "x-tenant-slug";
/** Set by middleware when the host has no subdomain: render the built-in sample tenant. */
export const SAMPLE_STOREFRONT_HEADER = "x-storefront-sample";
export const SAMPLE_TENANT_SLUG = "burger-house";
