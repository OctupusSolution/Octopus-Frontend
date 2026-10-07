import type { Metadata } from "next";
import { loadTenant, requireStorefront } from "@/entities/tenant/load";
import { PickupCheckoutProvider } from "@/features/pickup/checkout";
import { MobileFlowProvider } from "@/shared/lib/flow-context";
import { TableBrandProvider } from "@/widgets/table-shell";

// An order or a reservation in progress is one customer's: nothing here is for a crawler.
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** The pickup flow's frame: the table flow's phone-width column and bar, told
 *  that there is no table — so its screens link within /pickup. */
export default async function PickupLayout({ children }: { children: React.ReactNode }) {
  const [{ shell }, tenant] = await Promise.all([requireStorefront(), loadTenant()]);
  const branch = tenant.branches[0];

  return (
    <TableBrandProvider
      brand={{
        name: shell?.brand.displayName ?? tenant.name,
        logoUrl: shell?.brand.logo?.url ?? null,
        branchName: branch?.displayName ?? branch?.name,
        languages: shell?.languages.map((language) => language.code),
      }}
    >
      <MobileFlowProvider mode="pickup">
        <PickupCheckoutProvider>
          {/* A menu written in Arabic is still set in the Arabic face when the page is in English. */}
          <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-gray-50 [font-family:var(--font-family-active),var(--font-arabic-loaded)]">
            {children}
          </div>
        </PickupCheckoutProvider>
      </MobileFlowProvider>
    </TableBrandProvider>
  );
}
