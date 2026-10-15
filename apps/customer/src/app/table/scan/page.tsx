import { Suspense } from "react";
import { loadTenant, requireStorefront } from "@/entities/tenant/load";
import { TableScanView } from "@/views/table";

/** The table used when the sample storefront's scanner has nothing to read. */
const SAMPLE_TABLE = "12";

export default async function TableScanPage() {
  const [{ sample }, tenant] = await Promise.all([requireStorefront(), loadTenant()]);

  return (
    // The view reads ?table= through useSearchParams, which the production
    // build refuses to render without a suspense boundary above it.
    <Suspense fallback={null}>
      <TableScanView tenantId={tenant.id} demoTable={sample ? SAMPLE_TABLE : null} />
    </Suspense>
  );
}
