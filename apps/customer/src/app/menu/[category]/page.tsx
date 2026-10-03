import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getMenuGroups } from "@octopus/api-client";
import { loadMenu } from "@/entities/menu-item/load";
import { TENANT_SLUG_HEADER } from "@/entities/tenant";
import { loadTenant } from "@/entities/tenant/load";
import { CategoryView } from "@/views/category";

export default async function CategoryPage({ params }: { params: { category: string } }) {
  const slug = headers().get(TENANT_SLUG_HEADER) ?? "burger-house";
  const tenant = await loadTenant(slug);
  const { categories, items } = await loadMenu(slug);

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
