import { headers } from "next/headers";
import { readLocaleCookie } from "@/shared/lib/locale-cookie";
import { getTenantBySlug, TENANT_SLUG_HEADER } from "@/entities/tenant";
import { LandingView } from "@/views/landing";

export default function HomePage() {
  const slug = headers().get(TENANT_SLUG_HEADER) ?? "burger-house";
  const tenant = getTenantBySlug(slug);
  const locale = readLocaleCookie();

  return <LandingView tenant={tenant} locale={locale} />;
}
