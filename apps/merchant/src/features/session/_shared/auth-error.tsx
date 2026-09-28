// Server failures on the auth screens are shown in a dialog of their own, in
// words a merchant understands, instead of the raw error code under a field.
import { useCallback, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { ApiError } from "@octopus/api-client";
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";

type Locale = "ar" | "en";
type Pair = Record<Locale, string>;

const MESSAGES: Record<string, Pair> = {
  "identity.auth.invalid-credentials": {
    ar: "البريد الإلكتروني أو كلمة المرور غير صحيحة. إذا أنشأت حسابك للتو، تأكد أولًا من تأكيد بريدك الإلكتروني.",
    en: "The email or password is incorrect. If you just created your account, confirm your email first.",
  },
  "identity.email-verification.code-invalid": {
    ar: "الرمز غير صحيح أو انتهت صلاحيته. اطلب رمزًا جديدًا وحاول مرة أخرى. إذا كان لديك حساب بهذا البريد بالفعل، فسجّل الدخول بدلًا من ذلك.",
    en: "The code is wrong or has expired. Request a new code and try again. If this email already has an account, sign in instead.",
  },
  "identity.email-verification.cooldown": {
    ar: "انتظر قليلًا قبل طلب رمز جديد.",
    en: "Please wait a moment before requesting a new code.",
  },
  "identity.email-verification.locked-out": {
    ar: "محاولات كثيرة غير صحيحة. انتظر بعض الوقت ثم اطلب رمزًا جديدًا.",
    en: "Too many wrong attempts. Wait a while, then request a new code.",
  },
  "identity.recovery.code-invalid": {
    ar: "رمز الاستعادة غير صحيح أو انتهت صلاحيته. اطلب رمزًا جديدًا.",
    en: "The recovery code is wrong or has expired. Request a new one.",
  },
  "identity.recovery.locked-out": {
    ar: "محاولات كثيرة غير صحيحة. انتظر بعض الوقت ثم حاول مرة أخرى.",
    en: "Too many wrong attempts. Wait a while and try again.",
  },
  "identity.recovery.password-mismatch": {
    ar: "كلمتا المرور غير متطابقتين.",
    en: "The passwords don't match.",
  },
  "identity.password.policy-not-met": {
    ar: "كلمة المرور لا تستوفي الشروط. استخدم 12 حرفًا على الأقل.",
    en: "The password doesn't meet the requirements. Use at least 12 characters.",
  },
  "identity.email.invalid": { ar: "صيغة البريد الإلكتروني غير صحيحة.", en: "The email address isn't valid." },
  "identity.email.required": { ar: "البريد الإلكتروني مطلوب.", en: "The email address is required." },
  "identity.account.full-name-required": { ar: "الاسم الكامل مطلوب.", en: "Your full name is required." },
  "identity.account.company-name-required": { ar: "اسم الشركة مطلوب.", en: "The company name is required." },
  "identity.email.delivery-rejected": {
    ar: "تعذّر إرسال البريد إلى هذا العنوان. تأكد من صحته.",
    en: "We couldn't send email to this address. Check that it's correct.",
  },
  "identity.email.delivery-unavailable": {
    ar: "خدمة البريد غير متاحة الآن. حاول مرة أخرى بعد قليل.",
    en: "The email service is unavailable right now. Try again shortly.",
  },
  "identity.email.provider-not-configured": {
    ar: "خدمة البريد غير مُعدّة على الخادم. تواصل مع الدعم.",
    en: "Email isn't configured on the server. Contact support.",
  },
  // Not sent by the backend today (registration answers 200 for a taken email
  // on purpose); handled so it reads well the day it is.
  "identity.account.email-taken": {
    ar: "هذا البريد الإلكتروني مسجّل بالفعل. سجّل الدخول، أو استخدم «نسيت كلمة المرور».",
    en: "This email is already registered. Sign in, or use “Forgot password”.",
  },
};

const FALLBACK: Record<string, Pair> = {
  rateLimited: { ar: "محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.", en: "Too many attempts. Wait a moment and try again." },
  network: { ar: "تعذّر الاتصال بالخادم. تحقق من اتصالك وحاول مرة أخرى.", en: "Couldn't reach the server. Check your connection and try again." },
  generic: { ar: "حدث خطأ غير متوقع. حاول مرة أخرى.", en: "Something went wrong. Please try again." },
};

const UI: Record<string, Pair> = {
  title: { ar: "حدث خطأ", en: "Something went wrong" },
  ok: { ar: "حسنًا", en: "OK" },
};

/** Whether the failure is the "email already registered" answer. */
export function isEmailTaken(err: unknown): boolean {
  return err instanceof ApiError && err.problem?.errorCode === "identity.account.email-taken";
}

export function authErrorMessage(err: unknown, locale: string): string {
  const l: Locale = locale === "ar" ? "ar" : "en";
  if (err instanceof ApiError) {
    const code = err.problem?.errorCode;
    if (code && MESSAGES[code]) return MESSAGES[code][l];
    if (err.status === 429) return FALLBACK.rateLimited[l];
    if (err.status === 0 || err.status >= 500) return FALLBACK.network[l];
    return err.problem?.detail ?? FALLBACK.generic[l];
  }
  if (err instanceof TypeError) return FALLBACK.network[l]; // fetch failed
  return FALLBACK.generic[l];
}

export function AuthErrorDialog({
  message,
  onClose,
  action,
}: {
  message: string | null;
  onClose: () => void;
  /** An optional second button, e.g. "Sign in" when the email is taken. */
  action?: { label: string; onClick: () => void };
}) {
  const { locale } = useI18n();
  const l: Locale = locale === "ar" ? "ar" : "en";
  return (
    <Modal
      open={message !== null}
      onClose={onClose}
      dismissible={false}
      backdropClassName="bg-[#0B1B3F]/55 backdrop-blur-[2px]"
      className="!max-w-[440px] !rounded-[22px] !p-7"
    >
      <div role="alertdialog" aria-labelledby="auth-error-title" className="flex flex-col items-center text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-[#EF4444]/10 text-[#EF4444]">
          <AlertTriangle size={26} />
        </span>
        <h2 id="auth-error-title" className="mt-4 text-[20px] font-bold text-[var(--octo-text-primary)]">
          {UI.title[l]}
        </h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--octo-text-secondary)]">{message}</p>
        <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row-reverse">
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="h-11 flex-1 rounded-[12px] bg-ocean-blue text-[15px] font-semibold text-white transition-colors hover:bg-[#0B5ED7]"
            >
              {action.label}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className={
              action
                ? "h-11 flex-1 rounded-[12px] border border-[var(--octo-border-input)] text-[15px] font-semibold text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
                : "h-11 flex-1 rounded-[12px] bg-ocean-blue text-[15px] font-semibold text-white transition-colors hover:bg-[#0B5ED7]"
            }
          >
            {UI.ok[l]}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** `show(err)` opens the error dialog for a failure; render `dialog` once. */
export function useAuthError(action?: { label: string; onClick: () => void; when: (err: unknown) => boolean }) {
  const { locale } = useI18n();
  const [state, setState] = useState<{ message: string; err: unknown } | null>(null);
  const show = useCallback((err: unknown) => setState({ message: authErrorMessage(err, locale), err }), [locale]);
  const close = useCallback(() => setState(null), []);
  const dialog = (
    <AuthErrorDialog
      message={state?.message ?? null}
      onClose={close}
      action={
        action && state && action.when(state.err)
          ? { label: action.label, onClick: () => { close(); action.onClick(); } }
          : undefined
      }
    />
  );
  return { show, close, dialog };
}
