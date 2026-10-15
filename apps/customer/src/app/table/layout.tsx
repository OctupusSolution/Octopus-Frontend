import type { Metadata } from "next";
import { loadTenant, requireStorefront } from "@/entities/tenant/load";
import { TableCheckoutProvider } from "@/features/table/checkout";
import { TableBrandProvider } from "@/widgets/table-shell";

// A table session is one customer's order in progress: nothing here is for a crawler.
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** The dine-in flow's own frame: a phone-width column, with the restaurant
 *  resolved once for the table bar every screen shares. */
export default async function TableLayout({ children }: { children: React.ReactNode }) {
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
      <TableCheckoutProvider>
        {/* A menu written in Arabic is still set in the Arabic face when the page is in English. */}
        <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-gray-50 [font-family:var(--font-family-active),var(--font-arabic-loaded)]">
          {children}
        </div>
      </TableCheckoutProvider>
    </TableBrandProvider>
  );
}
