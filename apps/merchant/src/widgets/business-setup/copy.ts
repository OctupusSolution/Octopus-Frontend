// Strings for the setup wizard's resume / cancel / live-price additions. Kept
// local to this widget (the shared locale files are owned elsewhere); the
// original step copy still comes from the global `t()`.
import { useI18n } from "@/app/providers/i18n-provider";

const EN = {
  "resume.title": "Welcome back — we kept your setup",
  "resume.note": "You're continuing where you left off{name}. Last saved {when}.",
  "resume.startOver": "Start over",
  "resume.dismiss": "Dismiss",
  "cancel.link": "Cancel setup",
  "cancel.title": "Cancel this setup?",
  "cancel.body": "Everything you've chosen so far will be discarded and you'll start again from the first step. Nothing has been charged.",
  "cancel.keep": "Keep my setup",
  "cancel.confirm": "Cancel and start over",
  "cancel.failed": "We couldn't cancel the setup. Please try again.",
  "live.label": "Estimated monthly total",
  "live.vat": "incl. VAT {rate}%",
  "live.updating": "Updating price…",
  "live.invalid": "This selection can't be priced yet",
  "live.failed": "Price unavailable right now",
  "checkout.backToEdit": "Back to edit",
  "checkout.awaiting": "A payment is in progress. Go back to edit your choices — this cancels the pending payment.",
  "checkout.alreadyPaid": "This payment has already gone through, so it can't be cancelled. Continue to finish setting up.",
  "checkout.cancelFailed": "We couldn't step back from the payment. Please try again.",
  "issue.business-type-unavailable": "The chosen business type is no longer available.",
  "issue.business-variant-unavailable": "The chosen style is no longer available.",
  "issue.module-unavailable": "A selected module is no longer available{item}.",
  "issue.add-on-unavailable": "A selected integration is no longer available{item}.",
  "issue.add-on-requires-module": "An integration needs a module you haven't selected{item}.",
  "issue.price-missing": "Part of this selection has no price yet{item}.",
} as const;

type CopyKey = keyof typeof EN;

const AR: Record<CopyKey, string> = {
  "resume.title": "مرحبًا بعودتك — احتفظنا بإعدادك",
  "resume.note": "أنت تكمل من حيث توقفت{name}. آخر حفظ {when}.",
  "resume.startOver": "البدء من جديد",
  "resume.dismiss": "إخفاء",
  "cancel.link": "إلغاء الإعداد",
  "cancel.title": "إلغاء هذا الإعداد؟",
  "cancel.body": "سيتم تجاهل كل ما اخترته حتى الآن وستبدأ من الخطوة الأولى. لم يتم خصم أي مبلغ.",
  "cancel.keep": "الاحتفاظ بالإعداد",
  "cancel.confirm": "إلغاء والبدء من جديد",
  "cancel.failed": "تعذّر إلغاء الإعداد. حاول مرة أخرى.",
  "live.label": "الإجمالي الشهري التقديري",
  "live.vat": "شامل ضريبة القيمة المضافة {rate}%",
  "live.updating": "جارٍ تحديث السعر…",
  "live.invalid": "لا يمكن تسعير هذا الاختيار بعد",
  "live.failed": "السعر غير متاح حاليًا",
  "checkout.backToEdit": "العودة للتعديل",
  "checkout.awaiting": "هناك عملية دفع قيد التنفيذ. عُد لتعديل اختياراتك — سيؤدي ذلك إلى إلغاء الدفع المعلّق.",
  "checkout.alreadyPaid": "تمت عملية الدفع بالفعل ولا يمكن إلغاؤها. تابع لإكمال الإعداد.",
  "checkout.cancelFailed": "تعذّر التراجع عن الدفع. حاول مرة أخرى.",
  "issue.business-type-unavailable": "نوع النشاط المختار لم يعد متاحًا.",
  "issue.business-variant-unavailable": "النمط المختار لم يعد متاحًا.",
  "issue.module-unavailable": "إحدى الوحدات المختارة لم تعد متاحة{item}.",
  "issue.add-on-unavailable": "أحد التكاملات المختارة لم يعد متاحًا{item}.",
  "issue.add-on-requires-module": "أحد التكاملات يتطلب وحدة لم تخترها{item}.",
  "issue.price-missing": "جزء من هذا الاختيار ليس له سعر بعد{item}.",
};

export function useSetupCopy(): (key: CopyKey) => string {
  const { locale } = useI18n();
  const dict: Record<CopyKey, string> = locale === "ar" ? AR : EN;
  return (key) => dict[key];
}

export function issueCopyKey(code: string): CopyKey | null {
  const key = `issue.${code}`;
  return key in EN ? (key as CopyKey) : null;
}
