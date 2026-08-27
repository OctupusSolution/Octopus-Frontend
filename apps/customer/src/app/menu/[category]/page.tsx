import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getMenuGroups } from "@octopus/api-client";
import { getMenuForTenant } from "@/entities/menu-item";
import { getTenantBySlug, TENANT_SLUG_HEADER } from "@/entities/tenant";
import { CategoryView } from "@/views/category";

export default function CategoryPage({ params }: { params: { category: string } }) {
  const slug = headers().get(TENANT_SLUG_HEADER) ?? "burger-house";
  const tenant = getTenantBySlug(slug);
  const { categories, items } = getMenuForTenant(tenant.id);

  const category = categories.find((c) => c.slug === params.category);
  if (!category) notFound();

  return (
    <CategoryView
      category={category}
      items={items.filter((item) => item.categoryId === category.id)}
      groups={getMenuGroups()}
    />
  );
}
