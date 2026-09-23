// Strings for the Menu screens added after the shared locale files were
// frozen for this module (packages/i18n is owned elsewhere). Same two locales,
// same fallback rule as `t`: a missing key renders as itself.
import { useCallback } from "react";
import { useI18n } from "@/app/providers/i18n-provider";

const en = {
  loading: "Loading…",
  retry: "Retry",
  cancel: "Cancel",
  close: "Close",
  save: "Save",
  saving: "Saving…",
  delete: "Delete",
  add: "Add",
  search: "Search",
  empty: "Nothing here yet.",

  // Menu settings (library header)
  "settings.open": "Menu settings",
  "settings.title": "Menu settings",
  "settings.tab.branches": "Branch time zones",
  "settings.tab.labels": "Labels",
  "settings.branches.hint":
    "Each branch serves its menus on its own clock. Schedules and availability windows are read in this time zone.",
  "settings.branches.empty": "No branch profiles yet. Add one by entering a branch id and its time zone.",
  "settings.branches.branchId": "Branch id",
  "settings.branches.timeZone": "Time zone",
  "settings.branches.add": "Add branch",
  "settings.branches.saved": "Saved",

  // Labels
  "labels.hint": "Labels are the tags and allergens an item can carry. Built-in labels can't be renamed or deleted.",
  "labels.kind": "Kind",
  "labels.code": "Code",
  "labels.name": "Display name",
  "labels.nameAr": "Arabic name",
  "labels.usage": "{n} items",
  "labels.builtIn": "Built-in",
  "labels.new": "New label",
  "labels.create": "Create label",
  "labels.rename": "Rename",
  "labels.confirmDelete": "Delete the label “{name}”? Items using it lose it.",
  "labels.manage": "Manage labels",
  "labels.none": "No labels of this kind yet.",

  // Items
  "items.addExisting": "Add existing item",
  "items.catalogTitle": "Add items from your catalog",
  "items.catalogHint": "Items are shared across menus. Placing one here keeps a single item — edits reach every menu it's in.",
  "items.unplacedOnly": "Only items not on any menu",
  "items.inSections": "In {n} sections",
  "items.alreadyHere": "Already in this section",
  "items.addSelected": "Add {n} items",
  "items.noneFound": "No items match.",
  "items.moveTo": "Move to section",
  "items.moveTitle": "Move “{name}” to…",
  "items.move": "Move",
  "items.deleteEverywhere": "Also delete it from the catalog (removes it from every menu)",
  "items.saveFirst": "Save the menu first — this item isn't on the server yet.",
  "items.facts": "Facts",
  "items.factsHint": "The facts your business declares for items. Leave blank when unknown.",
  "items.factsEmpty": "No fact types are configured.",
  "items.unit": "Unit",

  // Modifier groups
  "groups.reuse": "Reuse existing group",
  "groups.reuseTitle": "Reuse a modifier group",
  "groups.reuseHint": "Groups are shared: attaching one here links the same group, so later edits reach every item using it.",
  "groups.options": "{n} options",
  "groups.attached": "Attached",
  "groups.attach": "Attach",
  "groups.deleteForever": "Delete group",
  "groups.confirmDelete": "Delete “{name}” for good? It's detached from every item that uses it.",

  // Offers
  "offers.addExisting": "Add existing offer",
  "offers.pickTitle": "Add an existing offer",
  "offers.inactive": "Inactive",
  "offers.active": "Active",
  "offers.incomplete": "Incomplete",
  "offers.quoteTitle": "Server price check",
  "offers.quoteHint": "What the platform will charge for this offer, computed from the items' current prices.",
  "offers.quoteReference": "Items total",
  "offers.quotePrice": "Offer price",
  "offers.quoteSaving": "Customer saves",
  "offers.quoteUnavailable": "Save the offer's items first to get a server quote.",

  // Preview
  "preview.open": "Customer view",
  "preview.title": "Customer view (draft)",
  "preview.hint": "Rendered by the platform from the saved draft — exactly what customers would get if you published now.",
  "preview.lang": "Language",
  "preview.empty": "The draft has nothing to show yet.",
  "preview.unsaved": "Unsaved changes aren't included — save first to see them here.",

  // Schedule (library)
  "schedule.presets": "Platform presets",
  "schedule.timeline": "Next 7 days",
  "schedule.timelineHint": "When this menu is actually served, from the saved schedule, in {tz}.",
  "schedule.timelineEmpty": "Not served in the next 7 days.",
  "schedule.timelineAlways": "Served around the clock.",

  // Versions
  "versions.view": "View",
  "versions.back": "Back to versions",
  "versions.schema": "Schema v{n}",
  "versions.hash": "Content hash",
  "versions.sections": "Sections",
  "versions.download": "Download JSON",

  // Bulk
  "bulk.history": "Recent bulk changes",
  "bulk.historyEmpty": "No bulk changes yet.",
  "bulk.kind.PriceAdjustment": "Price adjustment",
  "bulk.kind.TextReplacement": "Text replacement",

  // Access codes
  "qr.show": "QR image",
  "qr.hide": "Hide QR",
  "qr.download": "Download PNG",
  "qr.downloadSvg": "Download SVG",
  "qr.failed": "Couldn't load the QR image.",

  // Theme
  "theme.serverPresets": "Available from the platform",
} as const;

type Key = keyof typeof en;

const ar: Record<Key, string> = {
  loading: "جارٍ التحميل…",
  retry: "إعادة المحاولة",
  cancel: "إلغاء",
  close: "إغلاق",
  save: "حفظ",
  saving: "جارٍ الحفظ…",
  delete: "حذف",
  add: "إضافة",
  search: "بحث",
  empty: "لا يوجد شيء بعد.",

  "settings.open": "إعدادات المنيو",
  "settings.title": "إعدادات المنيو",
  "settings.tab.branches": "المناطق الزمنية للفروع",
  "settings.tab.labels": "الوسوم",
  "settings.branches.hint": "كل فرع يقدّم قوائمه حسب توقيته. الجداول ونوافذ التوفّر تُقرأ بهذه المنطقة الزمنية.",
  "settings.branches.empty": "لا توجد ملفات فروع بعد. أضف فرعًا بإدخال معرّفه ومنطقته الزمنية.",
  "settings.branches.branchId": "معرّف الفرع",
  "settings.branches.timeZone": "المنطقة الزمنية",
  "settings.branches.add": "إضافة فرع",
  "settings.branches.saved": "تم الحفظ",

  "labels.hint": "الوسوم هي العلامات ومسببات الحساسية التي يحملها الصنف. الوسوم المدمجة لا يمكن تعديلها أو حذفها.",
  "labels.kind": "النوع",
  "labels.code": "الرمز",
  "labels.name": "الاسم المعروض",
  "labels.nameAr": "الاسم بالعربية",
  "labels.usage": "{n} أصناف",
  "labels.builtIn": "مدمج",
  "labels.new": "وسم جديد",
  "labels.create": "إنشاء وسم",
  "labels.rename": "إعادة تسمية",
  "labels.confirmDelete": "حذف الوسم «{name}»؟ الأصناف التي تستخدمه ستفقده.",
  "labels.manage": "إدارة الوسوم",
  "labels.none": "لا توجد وسوم من هذا النوع بعد.",

  "items.addExisting": "إضافة صنف موجود",
  "items.catalogTitle": "أضف أصنافًا من الكتالوج",
  "items.catalogHint": "الأصناف مشتركة بين القوائم. وضع صنف هنا يبقيه صنفًا واحدًا — التعديلات تصل لكل قائمة هو فيها.",
  "items.unplacedOnly": "الأصناف غير الموجودة في أي قائمة فقط",
  "items.inSections": "في {n} أقسام",
  "items.alreadyHere": "موجود في هذا القسم",
  "items.addSelected": "إضافة {n} أصناف",
  "items.noneFound": "لا توجد أصناف مطابقة.",
  "items.moveTo": "نقل إلى قسم",
  "items.moveTitle": "نقل «{name}» إلى…",
  "items.move": "نقل",
  "items.deleteEverywhere": "احذفه أيضًا من الكتالوج (يُزال من كل القوائم)",
  "items.saveFirst": "احفظ المنيو أولًا — هذا الصنف غير محفوظ على الخادم بعد.",
  "items.facts": "المعلومات",
  "items.factsHint": "المعلومات التي يصرّح بها نشاطك للأصناف. اتركها فارغة إن لم تكن معروفة.",
  "items.factsEmpty": "لا توجد أنواع معلومات مهيأة.",
  "items.unit": "الوحدة",

  "groups.reuse": "استخدام مجموعة موجودة",
  "groups.reuseTitle": "استخدام مجموعة إضافات",
  "groups.reuseHint": "المجموعات مشتركة: ربطها هنا يربط نفس المجموعة، فالتعديلات اللاحقة تصل لكل صنف يستخدمها.",
  "groups.options": "{n} خيارات",
  "groups.attached": "مرتبطة",
  "groups.attach": "ربط",
  "groups.deleteForever": "حذف المجموعة",
  "groups.confirmDelete": "حذف «{name}» نهائيًا؟ ستُفصل عن كل صنف يستخدمها.",

  "offers.addExisting": "إضافة عرض موجود",
  "offers.pickTitle": "إضافة عرض موجود",
  "offers.inactive": "غير نشط",
  "offers.active": "نشط",
  "offers.incomplete": "غير مكتمل",
  "offers.quoteTitle": "تسعير المنصة",
  "offers.quoteHint": "ما ستحسبه المنصة لهذا العرض، بناءً على أسعار الأصناف الحالية.",
  "offers.quoteReference": "إجمالي الأصناف",
  "offers.quotePrice": "سعر العرض",
  "offers.quoteSaving": "توفير العميل",
  "offers.quoteUnavailable": "احفظ أصناف العرض أولًا للحصول على تسعير المنصة.",

  "preview.open": "عرض العميل",
  "preview.title": "عرض العميل (مسودة)",
  "preview.hint": "تعرضه المنصة من المسودة المحفوظة — تمامًا ما سيراه العملاء لو نشرت الآن.",
  "preview.lang": "اللغة",
  "preview.empty": "لا يوجد ما يُعرض في المسودة بعد.",
  "preview.unsaved": "التغييرات غير المحفوظة لا تظهر هنا — احفظ أولًا.",

  "schedule.presets": "قوالب المنصة",
  "schedule.timeline": "الأيام السبعة القادمة",
  "schedule.timelineHint": "متى تُقدَّم هذه القائمة فعليًا حسب الجدول المحفوظ، بتوقيت {tz}.",
  "schedule.timelineEmpty": "لن تُقدَّم خلال الأيام السبعة القادمة.",
  "schedule.timelineAlways": "تُقدَّم على مدار الساعة.",

  "versions.view": "عرض",
  "versions.back": "العودة للإصدارات",
  "versions.schema": "المخطط v{n}",
  "versions.hash": "بصمة المحتوى",
  "versions.sections": "الأقسام",
  "versions.download": "تنزيل JSON",

  "bulk.history": "آخر التعديلات الجماعية",
  "bulk.historyEmpty": "لا توجد تعديلات جماعية بعد.",
  "bulk.kind.PriceAdjustment": "تعديل الأسعار",
  "bulk.kind.TextReplacement": "استبدال النص",

  "qr.show": "صورة QR",
  "qr.hide": "إخفاء QR",
  "qr.download": "تنزيل PNG",
  "qr.downloadSvg": "تنزيل SVG",
  "qr.failed": "تعذّر تحميل صورة QR.",

  "theme.serverPresets": "المتاح من المنصة",
};

const dictionaries: Record<"en" | "ar", Record<Key, string>> = { en, ar };

export type MenuCopyKey = Key;

/** `c(key, { n: 3 })` — `{name}` style placeholders are filled from `vars`. */
export function useMenuCopy() {
  const { locale } = useI18n();
  return useCallback(
    (key: Key, vars?: Record<string, string | number>) => {
      let text: string = (dictionaries[locale as "en" | "ar"] ?? en)[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) text = text.split(`{${k}}`).join(String(v));
      return text;
    },
    [locale]
  );
}
