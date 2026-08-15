// Tenant data is owned by @octopus/api-client so the merchant portal and the
// mock API resolve the exact same branch ids and names. This slice is the
// customer app's public surface onto it.
export type { Tenant, Branch } from "@octopus/api-client";
export { getTenantBySlug, getBranchName } from "@octopus/api-client";

export const TENANT_SLUG_HEADER = "x-tenant-slug";
