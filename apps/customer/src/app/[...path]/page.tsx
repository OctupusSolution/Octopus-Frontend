import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStorefront, loadPage, requireStorefront, tryLoadPage } from "@/entities/tenant/load";
import { PublishedPageView, publishedPageMetadata } from "@/views/published-page";

// Any path the storefront has no route of its own for is a page of the published
// site (/about, /our-story, …). An old path redirects (301/308) to its current one;
// a hidden, missing or unavailable page is a 404.
const decode = (segment: string) => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};
// Next hands the segments over still percent-encoded; the API wants the path itself.
const toPath = (segments: string[]) => `/${segments.map(decode).join("/")}`;

export async function generateMetadata({ params }: { params: { path: string[] } }): Promise<Metadata> {
  // Never throws: a missing site or page is the page's own notFound(), rendered in full.
  const { shell } = await getStorefront();
  const page = shell ? await tryLoadPage(toPath(params.path)) : null;
  return shell && page ? publishedPageMetadata(page, shell) : {};
}

export default async function PublishedPage({ params }: { params: { path: string[] } }) {
  const { shell } = await requireStorefront();
  if (!shell) notFound(); // the sample storefront has no published pages
  const page = await loadPage(toPath(params.path));
  return <PublishedPageView page={page} shell={shell} />;
}
