import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getMenuForTenant } from "@/entities/menu-item";
import { getTenantBySlug, TENANT_SLUG_HEADER } from "@/entities/tenant";
import { ProductView } from "@/views/product";

export default function ProductPage({ params }: { params: { category: string; item: string } }) {
  const slug = headers().get(TENANT_SLUG_HEADER) ?? "burger-house";
  const tenant = getTenantBySlug(slug);
  const { categories, items } = getMenuForTenant(tenant.id);

  const category = categories.find((c) => c.slug === params.category);
  const item = items.find((i) => i.id === params.item);
  if (!category || !item) notFound();

  return (
    // ProductView reads ?line= through useSearchParams, which the production
    // build refuses to render without a suspense boundary above it.
    <Suspense fallback={null}>
      <ProductView item={item} category={category} categories={categories} items={items} />
    </Suspense>
  );
}
