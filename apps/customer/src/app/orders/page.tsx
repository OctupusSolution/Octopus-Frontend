import { loadLocale } from "@/entities/tenant/load";
import { createTranslator } from "@/shared/i18n/translate";
import { TrackOrderForm } from "@/views/order-tracking";

export default async function OrdersPage() {
  const t = createTranslator(await loadLocale());

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-[21px] font-bold text-[var(--octo-text-primary)]">
        {t("store.nav.trackOrder")}
      </h1>
      <TrackOrderForm />
    </div>
  );
}
