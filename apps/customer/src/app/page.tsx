import type { Metadata } from "next";
import { loadMenu } from "@/entities/menu-item/load";
import { getStorefront, loadPage, loadTenant, requireStorefront, tryLoadPage } from "@/entities/tenant/load";
import { LandingView } from "@/views/landing";
import { PublishedPageView, publishedPageMetadata } from "@/views/published-page";

const homePath = (pages: { path: string; isHome: boolean }[]) => pages.find((p) => p.isHome)?.path ?? "/";

export async function generateMetadata(): Promise<Metadata> {
  // Never throws: a missing site or page is the page's own notFound(), rendered in full.
  const { shell } = await getStorefront();
  const page = shell ? await tryLoadPage(homePath(shell.pages)) : null;
  return shell && page ? publishedPageMetadata(page, shell) : {};
}

export default async function HomePage() {
  const { sample, shell } = await requireStorefront();

  // A published site: its home page, section by section.
  if (!sample && shell) {
    const page = await loadPage(homePath(shell.pages));
    return <PublishedPageView page={page} shell={shell} />;
  }

  // Plain localhost: the built-in sample storefront.
  const [tenant, { categories, items }] = await Promise.all([loadTenant(), loadMenu()]);
  return <LandingView tenant={tenant} categories={categories} items={items} />;
}
