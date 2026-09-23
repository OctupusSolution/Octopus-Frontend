// Strings for reinstating an expired reservation and for the "nearest
// alternatives" picker. The shared i18n dictionaries are edited by several
// people at once, so these live beside the module for now (same approach as
// waitlist/_shared/extra-text.ts).
import { useI18n } from "@/app/providers/i18n-provider";

const EN = {
  expiredTitle: "This reservation expired",
  expiredBody: "The deposit wasn't paid in time, so the table was released. Reinstating re-checks that the table is still free.",
  reinstate: "Reinstate",
  reinstating: "Reinstating…",
  slotTaken: "That time is no longer free on this table.",
  alternativesTitle: "Nearest free times",
  alternativesLoading: "Looking for nearby times…",
  alternativesNone: "No other free time on this table that day.",
  alternativesFailed: "Couldn't load nearby times.",
};

type Text = typeof EN;

const AR: Text = {
  expiredTitle: "انتهت صلاحية هذا الحجز",
  expiredBody: "لم يُدفع العربون في الوقت المحدد فتم تحرير الطاولة. إعادة التفعيل تتحقق أولًا من أن الطاولة ما زالت متاحة.",
  reinstate: "إعادة التفعيل",
  reinstating: "جارٍ إعادة التفعيل…",
  slotTaken: "هذا الوقت لم يعد متاحًا على هذه الطاولة.",
  alternativesTitle: "أقرب أوقات متاحة",
  alternativesLoading: "جارٍ البحث عن أوقات قريبة…",
  alternativesNone: "لا يوجد وقت آخر متاح على هذه الطاولة في نفس اليوم.",
  alternativesFailed: "تعذر تحميل الأوقات القريبة.",
};

export function useReservationsExtraText(): Text {
  const { locale } = useI18n();
  return locale === "ar" ? AR : EN;
}
