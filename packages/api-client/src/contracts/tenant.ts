export interface Branch {
  id: string;
  name: string;
  city: string;
  address: string;
  /** Arabic storefront label — "أوكتابوس — فرع الصحافة". `name` stays the
   *  merchant console's label and must not drift from mock-orders.ts. */
  displayName: string;
  /** "حي الصحافة، الرياض" — the neighbourhood line under the branch name. */
  district: string;
  /** Photograph shown on the branch picker card. */
  imageUrl: string;
  /** Whether the branch is taking orders right now. */
  isOpen: boolean;
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
    {
      id: "branch-riyadh-sahafa",
      name: "Riyadh - Sahafa",
      city: "Riyadh",
      address: "Al Sahafa District, Riyadh",
      displayName: "أوكتابوس — فرع الصحافة",
      district: "حي الصحافة، الرياض",
      imageUrl: "/images/storefront/hero.webp",
      isOpen: true,
    },
    {
      id: "branch-riyadh-olaya",
      name: "Riyadh - Olaya",
      city: "Riyadh",
      address: "Olaya Street, Riyadh",
      displayName: "أوكتابوس — فرع العليا",
      district: "حي العليا، الرياض",
      imageUrl: "/images/storefront/hero.webp",
      isOpen: false,
    },
    {
      id: "branch-riyadh-narjis",
      name: "Riyadh - Narjis",
      city: "Riyadh",
      address: "Al Narjis District, Riyadh",
      displayName: "أوكتابوس — فرع النرجس",
      district: "حي النرجس، الرياض",
      imageUrl: "/images/storefront/hero.webp",
      isOpen: true,
    },
    {
      id: "branch-riyadh-malqa",
      name: "Riyadh - Malqa",
      city: "Riyadh",
      address: "Al Malqa District, Riyadh",
      displayName: "أوكتابوس — فرع الملقا",
      district: "حي الملقا، الرياض",
      imageUrl: "/images/storefront/hero.webp",
      isOpen: true,
    },
    {
      id: "branch-jeddah-corniche",
      name: "Jeddah - Corniche",
      city: "Jeddah",
      address: "Corniche Road, Jeddah",
      displayName: "أوكتابوس — فرع الكورنيش",
      district: "الكورنيش، جدة",
      imageUrl: "/images/storefront/hero.webp",
      isOpen: true,
    },
    {
      id: "branch-dammam-corniche",
      name: "Dammam - Corniche",
      city: "Dammam",
      address: "Corniche Road, Dammam",
      displayName: "أوكتابوس — فرع الدمام",
      district: "الكورنيش، الدمام",
      imageUrl: "/images/storefront/hero.webp",
      isOpen: true,
    },
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
