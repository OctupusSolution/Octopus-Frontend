import { headers } from "next/headers";
import { getMenuForTenant } from "@/entities/menu-item";
import { getTenantBySlug, TENANT_SLUG_HEADER } from "@/entities/tenant";
import { createTranslator } from "@/shared/i18n/translate";
import { readLocaleCookie } from "@/shared/lib/locale-cookie";
import { MenuView } from "@/views/menu";

export default function MenuPage() {
  const slug = headers().get(TENANT_SLUG_HEADER) ?? "burger-house";
  const tenant = getTenantBySlug(slug);
  const { categories } = getMenuForTenant(tenant.id);
  const t = createTranslator(readLocaleCookie());

  return (
    <MenuView
      categories={categories}
      homeLabel={t("store.nav.home")}
      menuLabel={t("store.nav.menu")}
    />
  );
}
