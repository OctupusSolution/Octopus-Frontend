// Strings for the settings dialog and the undo actions. The shared i18n
// dictionaries are owned elsewhere, so these live beside the page for now.
import { useI18n } from "@/app/providers/i18n-provider";

const EN = {
  settings: "Waitlist settings",
  loading: "Loading settings…",
  loadFailed: "Couldn't load the waitlist settings.",
  queueRules: "Queue rules",
  noShowGrace: "No-show grace (minutes)",
  noShowAuto: "Mark no-shows automatically",
  defaultService: "Default visit length (minutes)",
  sampleThreshold: "Visits before measured average",
  minAttendees: "Smallest party",
  maxAttendees: "Largest party",
  requireReason: "Require a reason to remove a guest",
  timeZone: "Time zone (IANA)",
  sources: "Sources",
  cancel: "Cancel",
  save: "Save",
  saving: "Saving…",
  revertReady: "Back to waiting",
  reinstate: "Reinstate",
  revertedToast: "{name} is back to waiting",
  reinstatedToast: "{name} is back in the queue",
};

type Text = typeof EN;

const AR: Text = {
  settings: "إعدادات قائمة الانتظار",
  loading: "جارٍ تحميل الإعدادات…",
  loadFailed: "تعذر تحميل إعدادات قائمة الانتظار.",
  queueRules: "قواعد الطابور",
  noShowGrace: "مهلة عدم الحضور (دقائق)",
  noShowAuto: "تسجيل عدم الحضور تلقائيًا",
  defaultService: "مدة الزيارة الافتراضية (دقائق)",
  sampleThreshold: "عدد الزيارات قبل اعتماد المتوسط الفعلي",
  minAttendees: "أصغر مجموعة",
  maxAttendees: "أكبر مجموعة",
  requireReason: "اشتراط سبب لإزالة الضيف",
  timeZone: "المنطقة الزمنية (IANA)",
  sources: "المصادر",
  cancel: "إلغاء",
  save: "حفظ",
  saving: "جارٍ الحفظ…",
  revertReady: "إعادة إلى الانتظار",
  reinstate: "إعادة إلى الطابور",
  revertedToast: "عاد {name} إلى الانتظار",
  reinstatedToast: "عاد {name} إلى الطابور",
};

export function useWaitlistExtraText(): Text {
  const { locale } = useI18n();
  return locale === "ar" ? AR : EN;
}
