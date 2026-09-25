import { headers } from "next/headers";
import { loadMenu } from "@/entities/menu-item/load";
import { TENANT_SLUG_HEADER } from "@/entities/tenant";
import { loadLocale, loadTenant } from "@/entities/tenant/load";
import { createTranslator } from "@/shared/i18n/translate";
import { MenuView } from "@/views/menu";

export default async function MenuPage() {
  const slug = headers().get(TENANT_SLUG_HEADER) ?? "burger-house";
  const tenant = await loadTenant(slug);
  const { categories } = await loadMenu(slug);
  const t = createTranslator(await loadLocale());

  return (
    <MenuView
      categories={categories}
      homeLabel={t("store.nav.home")}
      menuLabel={t("store.nav.menu")}
    />
  );
}
