import { headers } from "next/headers";
import { loadMenu, loadMenuDocument } from "@/entities/menu-item/load";
import { TENANT_SLUG_HEADER } from "@/entities/tenant";
import { loadLocale, loadTenant } from "@/entities/tenant/load";
import { createTranslator } from "@/shared/i18n/translate";
import { MenuView } from "@/views/menu";
import { ThemedMenu } from "@/widgets/themed-menu";

export default async function MenuPage() {
  const document = await loadMenuDocument();
  if (document) return <ThemedMenu document={document} mode="order" header="none" />;

  const slug = headers().get(TENANT_SLUG_HEADER) ?? "burger-house";
  await loadTenant(slug);
  const { categories } = await loadMenu(slug);
  const t = createTranslator(await loadLocale());
  return <MenuView categories={categories} homeLabel={t("store.nav.home")} menuLabel={t("store.nav.menu")} />;
}
