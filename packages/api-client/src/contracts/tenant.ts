export interface Branch {
  id: string;
  name: string;
  city: string;
  address: string;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  vertical: "restaurant";
  branches: Branch[];
  deliveryZones: string[];
  minDeliveryOrderSar: number;
}

// Branch display names must stay in sync with apps/merchant/src/shared/api/mock-orders.ts.
const BURGER_HOUSE: Tenant = {
  id: "tenant-burger-house",
  slug: "burger-house",
  name: "Burger House",
  vertical: "restaurant",
  branches: [
    { id: "branch-riyadh-olaya", name: "Riyadh - Olaya", city: "Riyadh", address: "Olaya Street, Riyadh" },
    { id: "branch-riyadh-narjis", name: "Riyadh - Narjis", city: "Riyadh", address: "Al Narjis District, Riyadh" },
    { id: "branch-jeddah-corniche", name: "Jeddah - Corniche", city: "Jeddah", address: "Corniche Road, Jeddah" },
    { id: "branch-dammam-corniche", name: "Dammam - Corniche", city: "Dammam", address: "Corniche Road, Dammam" },
  ],
  deliveryZones: ["Al Narjis", "Al Olaya", "Al Malqa"],
  minDeliveryOrderSar: 30,
};

const TENANTS: readonly Tenant[] = [BURGER_HOUSE];

export function getTenantBySlug(slug: string): Tenant {
  return TENANTS.find((tenant) => tenant.slug === slug) ?? BURGER_HOUSE;
}

export function getBranchName(branchId: string | null): string {
  if (!branchId) return "—";
  for (const tenant of TENANTS) {
    const branch = tenant.branches.find((b) => b.id === branchId);
    if (branch) return branch.name;
  }
  return "—";
}
