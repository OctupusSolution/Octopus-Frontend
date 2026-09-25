// The validation report carries codes only; these are the merchant-facing
// sentences for the ones that can block publishing.
type Locale = "en" | "ar";

const TEXT: Record<string, Record<Locale, string>> = {
  "menu.review.menu.time-zone-missing": {
    en: "Set a time zone in the menu settings before publishing.",
    ar: "حدّد المنطقة الزمنية في إعدادات المنيو قبل النشر.",
  },
  "menu.review.menu.name-missing": { en: "The menu needs a name.", ar: "المنيو يحتاج اسمًا." },
  "menu.review.menu.no-publishable-section": {
    en: "Add at least one visible section with items.",
    ar: "أضف قسمًا ظاهرًا واحدًا على الأقل يحتوي على أصناف.",
  },
  "menu.review.menu.no-sales-channel": { en: "Choose at least one sales channel.", ar: "اختر قناة بيع واحدة على الأقل." },
  "menu.review.menu.schedule-expired": { en: "The menu's schedule has already ended.", ar: "جدولة المنيو انتهت بالفعل." },
  "menu.review.item.price-missing": { en: "Some items have no price.", ar: "بعض الأصناف بدون سعر." },
  "menu.review.item.name-missing": { en: "Some items have no name.", ar: "بعض الأصناف بدون اسم." },
  "menu.review.item.currency-mismatch": {
    en: "Some prices are in a different currency than the business.",
    ar: "بعض الأسعار بعملة مختلفة عن عملة النشاط.",
  },
  "menu.review.section.empty": { en: "A section has no items.", ar: "يوجد قسم بدون أصناف." },
  "menu.review.section.name-missing": { en: "A section has no name.", ar: "يوجد قسم بدون اسم." },
  "menu.review.tax.not-configured": { en: "Tax is not configured yet.", ar: "الضريبة غير مُعدّة بعد." },
  "menu.review.offer.incomplete": { en: "An offer is incomplete.", ar: "يوجد عرض غير مكتمل." },
  "menu.review.offer.component-invalid": { en: "An offer contains an unavailable item.", ar: "يحتوي عرض على صنف غير متاح." },
  "menu.review.modifier.min-above-available": {
    en: "A modifier group requires more choices than it offers.",
    ar: "مجموعة إضافات تطلب اختيارات أكثر من المتاح.",
  },
  "menu.review.modifier.no-max": { en: "A modifier group has no maximum.", ar: "مجموعة إضافات بدون حد أقصى." },
  "menu.review.modifier.name-missing": { en: "A modifier group has no name.", ar: "مجموعة إضافات بدون اسم." },
};

const LAPSED: Record<Locale, string> = {
  en: "This menu uses a feature your plan no longer includes.",
  ar: "المنيو يستخدم ميزة لم تعد ضمن باقتك.",
};

const FALLBACK: Record<Locale, string> = {
  en: "The menu cannot be published yet",
  ar: "لا يمكن نشر المنيو بعد",
};

export function findingText(code: string, locale: string): string {
  const l: Locale = locale === "ar" ? "ar" : "en";
  const known = TEXT[code];
  if (known) return known[l];
  if (code.endsWith("feature-lapsed")) return LAPSED[l];
  return `${FALLBACK[l]} (${code}).`;
}
