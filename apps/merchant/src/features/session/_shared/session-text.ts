// Strings for external sign-in (link confirmation) and the approval-PIN
// dialog. The shared i18n dictionaries are edited by several people at once,
// so these live beside the feature for now.
import { useI18n } from "@/app/providers/i18n-provider";

const EN = {
  // external sign-in
  socialNotConfigured: "Not available yet",
  socialFailed: "Couldn't sign in with {provider}. Try again or use your email.",
  socialProviderDown: "{provider} sign-in is temporarily unavailable. Use your email and password.",
  socialEmailRequired: "{provider} didn't share a verified email address, which an Octopus account needs.",
  linkTitle: "Link your {provider} account",
  linkBody: "An Octopus account already uses {email}. Sign in with its password below and we'll link {provider} to it, so you can use either next time.",
  linkBodyNoEmail: "An Octopus account already uses this email. Sign in with its password below and we'll link {provider} to it.",
  linkExpired: "The link request expired. Continue with {provider} again to start over.",
  linkFailed: "Signed in, but linking {provider} failed. You can try again from the sign-in page later.",
  linkDismiss: "Don't link",
  devPrompt: "Development sign-in: email address the {provider} account should report",
  // approval PIN
  pinTitle: "Approval PIN",
  pinIntro: "Managers enter this PIN to approve sensitive actions such as removing a waitlist guest or issuing a refund.",
  pinLoading: "Checking your PIN…",
  pinLoadFailed: "Couldn't load your PIN status.",
  pinStatusSet: "PIN is set",
  pinStatusSetOn: "Last changed {when}",
  pinStatusNotSet: "No PIN set yet",
  pinLocked: "Locked after too many wrong attempts, until {when}.",
  pinSetUp: "Set PIN",
  pinChange: "Change PIN",
  pinRemove: "Remove PIN",
  pinCurrentPassword: "Your account password",
  pinNew: "New PIN (4–6 digits)",
  pinConfirm: "Repeat the PIN",
  pinSave: "Save PIN",
  pinSaving: "Saving…",
  pinRemoveConfirm: "Remove PIN",
  pinRemoving: "Removing…",
  pinBack: "Back",
  pinClose: "Close",
  pinSaved: "Your approval PIN is saved.",
  pinRemoved: "Your approval PIN was removed.",
  pinErrDigits: "Use 4 to 6 digits.",
  pinErrMismatch: "The two PINs don't match.",
  pinErrWeak: "Choose a PIN that isn't one repeated digit or a straight run like 1234.",
  pinErrPasswordRequired: "Enter your password.",
  pinErrWrongPassword: "That password isn't correct.",
  pinErrNoPassword: "This account has no password (it signs in with a provider). Set a password first.",
  pinErrRateLimited: "Too many attempts. Wait a few minutes and try again.",
  pinErrSession: "Your session expired. Sign in again to manage your PIN.",
  pinErrGeneric: "Something went wrong. Try again.",
  pinManageLink: "Set up or change your approval PIN",
};

type Text = typeof EN;

const AR: Text = {
  socialNotConfigured: "غير متاح حاليًا",
  socialFailed: "تعذر تسجيل الدخول عبر {provider}. حاول مرة أخرى أو استخدم بريدك الإلكتروني.",
  socialProviderDown: "تسجيل الدخول عبر {provider} غير متاح مؤقتًا. استخدم بريدك وكلمة المرور.",
  socialEmailRequired: "لم يشارك {provider} بريدًا إلكترونيًا موثّقًا، وحساب أوكتوبس يحتاج إليه.",
  linkTitle: "ربط حساب {provider}",
  linkBody: "يوجد حساب أوكتوبس يستخدم {email} بالفعل. سجّل الدخول بكلمة مروره بالأسفل وسنربط {provider} به لتستخدم أيهما لاحقًا.",
  linkBodyNoEmail: "يوجد حساب أوكتوبس يستخدم هذا البريد بالفعل. سجّل الدخول بكلمة مروره بالأسفل وسنربط {provider} به.",
  linkExpired: "انتهت صلاحية طلب الربط. تابع عبر {provider} مرة أخرى للبدء من جديد.",
  linkFailed: "تم تسجيل الدخول لكن فشل ربط {provider}. يمكنك المحاولة لاحقًا من صفحة تسجيل الدخول.",
  linkDismiss: "عدم الربط",
  devPrompt: "تسجيل دخول تجريبي: البريد الإلكتروني الذي يعيده حساب {provider}",
  pinTitle: "رمز الموافقة (PIN)",
  pinIntro: "يدخل المدير هذا الرمز للموافقة على الإجراءات الحساسة مثل إزالة ضيف من قائمة الانتظار أو إصدار استرداد.",
  pinLoading: "جارٍ التحقق من الرمز…",
  pinLoadFailed: "تعذر تحميل حالة الرمز.",
  pinStatusSet: "تم تعيين الرمز",
  pinStatusSetOn: "آخر تغيير {when}",
  pinStatusNotSet: "لم يتم تعيين رمز بعد",
  pinLocked: "مقفل بسبب محاولات خاطئة كثيرة حتى {when}.",
  pinSetUp: "تعيين الرمز",
  pinChange: "تغيير الرمز",
  pinRemove: "إزالة الرمز",
  pinCurrentPassword: "كلمة مرور حسابك",
  pinNew: "الرمز الجديد (4–6 أرقام)",
  pinConfirm: "أعد إدخال الرمز",
  pinSave: "حفظ الرمز",
  pinSaving: "جارٍ الحفظ…",
  pinRemoveConfirm: "إزالة الرمز",
  pinRemoving: "جارٍ الإزالة…",
  pinBack: "رجوع",
  pinClose: "إغلاق",
  pinSaved: "تم حفظ رمز الموافقة.",
  pinRemoved: "تمت إزالة رمز الموافقة.",
  pinErrDigits: "استخدم من 4 إلى 6 أرقام.",
  pinErrMismatch: "الرمزان غير متطابقين.",
  pinErrWeak: "اختر رمزًا ليس رقمًا مكررًا أو تسلسلًا مثل 1234.",
  pinErrPasswordRequired: "أدخل كلمة المرور.",
  pinErrWrongPassword: "كلمة المرور غير صحيحة.",
  pinErrNoPassword: "هذا الحساب بلا كلمة مرور (يسجّل الدخول عبر مزوّد خارجي). عيّن كلمة مرور أولًا.",
  pinErrRateLimited: "محاولات كثيرة. انتظر بضع دقائق ثم حاول مجددًا.",
  pinErrSession: "انتهت الجلسة. سجّل الدخول مرة أخرى لإدارة الرمز.",
  pinErrGeneric: "حدث خطأ ما. حاول مرة أخرى.",
  pinManageLink: "تعيين أو تغيير رمز الموافقة",
};

export type SessionText = Text;

export function useSessionText(): Text {
  const { locale } = useI18n();
  return locale === "ar" ? AR : EN;
}

export function fillText(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}
