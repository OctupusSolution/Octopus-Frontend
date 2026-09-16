// The four dialogs the auth frames layer over the sign-in / sign-up page.
// Each async callback prop (onSent/onVerified/onDone) calls a real /auth or
// /accounts endpoint at the call site (pages/login/index.tsx,
// pages/signup/index.tsx) — these components stay presentational and just
// await the promise, showing whatever error it throws.
import { useEffect, useState, type FormEvent } from "react";
import { Mail, Lock } from "lucide-react";
import { ApiError } from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import { AuthDialog, VERIFY_ART_URL, STAMP_ART_URL } from "../_shared/auth-dialog";
import { AuthField, AuthButton } from "../_shared/auth-field";
import { OtpInput, OTP_LENGTH } from "../_shared/otp-input";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_SECONDS = 30;

function errorMessage(err: unknown, t: (key: string) => string): string {
  if (err instanceof ApiError) return err.problem?.errorCode ?? err.message;
  return t("auth.error.genericFailure");
}

export function ForgotPasswordDialog({
  open,
  onClose,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  /** Calls POST /auth/forgot-password — always 202 regardless of whether the
   *  email exists (enumeration-safe), so a "no such account" error never
   *  surfaces here; only network/validation failures do. */
  onSent: (email: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return setError(t("login.error.emailRequired"));
    if (!EMAIL_RE.test(trimmed)) return setError(t("login.error.emailInvalid"));
    setSubmitting(true);
    try {
      await onSent(trimmed);
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthDialog open={open} onClose={onClose} title={t("auth.forgot.title")} art={VERIFY_ART_URL} body={t("auth.forgot.body")}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <AuthField
          label={t("auth.email")}
          icon={<Mail size={19} />}
          type="email"
          value={email}
          onChange={(v) => { setEmail(v); setError(undefined); }}
          placeholder={t("auth.emailPlaceholder")}
          error={error}
          autoComplete="email"
          autoFocus
        />
        <AuthButton disabled={submitting}>{t("auth.forgot.submit")}</AuthButton>
      </form>
    </AuthDialog>
  );
}

export function OtpDialog({
  open,
  onClose,
  variant,
  onVerified,
  onResend,
}: {
  open: boolean;
  onClose: () => void;
  /** The frames differ only in their heading — same dialog otherwise. */
  variant: "verifyAccount" | "enterCode";
  /** `verifyAccount` calls POST /accounts/verify-email with this code and
   *  throws on a wrong one. `enterCode` (password reset) has no standalone
   *  verify endpoint — the backend only checks the code as part of
   *  POST /auth/reset-password — so that variant's handler just stores the
   *  code and never rejects it here. */
  onVerified: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [invalid, setInvalid] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  // The countdown restarts every time the dialog is opened, not once on mount
  // — reopening it after a back-step should not show a dead "Resend" link.
  useEffect(() => {
    if (!open) return;
    setDigits(Array(OTP_LENGTH).fill(""));
    setInvalid(false);
    setErrorText(null);
    setSecondsLeft(RESEND_SECONDS);
  }, [open]);

  useEffect(() => {
    if (!open || secondsLeft === 0) return;
    const id = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [open, secondsLeft]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (digits.some((d) => !d)) {
      setInvalid(true);
      return;
    }
    setSubmitting(true);
    setErrorText(null);
    try {
      await onVerified(digits.join(""));
    } catch (err) {
      setInvalid(true);
      setErrorText(errorMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setSecondsLeft(RESEND_SECONDS);
    try {
      await onResend();
    } catch {
      // Resend failing silently is better than blocking the countdown reset
      // — the merchant can just hit Resend again once it re-enables.
    }
  }

  const clock = `00:${String(secondsLeft).padStart(2, "0")}`;

  return (
    <AuthDialog
      open={open}
      onClose={onClose}
      title={t(variant === "verifyAccount" ? "auth.otp.verifyTitle" : "auth.otp.codeTitle")}
      art={VERIFY_ART_URL}
      body={t("auth.otp.body")}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <OtpInput value={digits} onChange={(next) => { setDigits(next); setInvalid(false); }} invalid={invalid} />

        {invalid && (
          <p className="text-center text-[12.5px] text-[#EF4444]">
            {errorText ?? t("auth.error.otpIncomplete")}
          </p>
        )}

        <div className="text-center text-[14px] text-[var(--octo-text-secondary)]">
          <p>{t("auth.otp.noCode")}</p>
          <p className="mt-1">
            <button
              type="button"
              disabled={secondsLeft > 0}
              onClick={handleResend}
              className="font-semibold text-ocean-blue transition-colors enabled:hover:underline disabled:cursor-default disabled:text-ocean-blue/60"
            >
              {t("auth.otp.resend")}
            </button>
            {secondsLeft > 0 && <span className="ms-1">{t("auth.otp.resendIn").replace("{time}", clock)}</span>}
          </p>
        </div>

        <AuthButton disabled={submitting}>{t("auth.otp.submit")}</AuthButton>
      </form>
    </AuthDialog>
  );
}

export function SetPasswordDialog({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  /** Calls POST /auth/reset-password with the new password (plus the email
   *  and code captured by the two dialogs before this one). Throws if the
   *  code turned out to be wrong or expired — the backend only validates it
   *  here, not in the OTP step. */
  onDone: (password: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    // Backend enforces a 12-character minimum (Identity's password policy).
    if (password.length < 12) return setError(t("auth.error.passwordTooShort"));
    if (password !== confirm) return setError(t("auth.error.passwordMismatch"));
    setSubmitting(true);
    try {
      await onDone(password);
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthDialog open={open} onClose={onClose} title={t("auth.setPassword.title")} art={VERIFY_ART_URL} body={t("auth.setPassword.body")}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <AuthField
          label={t("auth.setPassword.new")}
          icon={<Lock size={19} />}
          type="password"
          value={password}
          onChange={(v) => { setPassword(v); setError(undefined); }}
          placeholder={t("auth.passwordPlaceholder")}
          autoComplete="new-password"
          autoFocus
        />
        <AuthField
          label={t("auth.setPassword.confirm")}
          icon={<Lock size={19} />}
          type="password"
          value={confirm}
          onChange={(v) => { setConfirm(v); setError(undefined); }}
          placeholder={t("auth.passwordPlaceholder")}
          error={error}
          autoComplete="new-password"
        />
        <AuthButton disabled={submitting}>{t("auth.setPassword.submit")}</AuthButton>
      </form>
    </AuthDialog>
  );
}

export function PasswordChangedDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();

  // The stamp is a play-once GIF (its NETSCAPE looping block was stripped, so
  // it runs through and holds the last frame instead of spinning forever).
  // The catch: a finished GIF stays finished for that URL, so reopening the
  // dialog would show the completed stamp with no animation. Giving the URL a
  // fresh query per open makes the browser treat it as a new image and start
  // it from frame one.
  const [play, setPlay] = useState(0);
  useEffect(() => {
    if (open) setPlay((n) => n + 1);
  }, [open]);

  return (
    <AuthDialog
      open={open}
      onClose={onClose}
      title=""
      art={`${STAMP_ART_URL}?play=${play}`}
      artClassName="mx-auto h-[150px] w-auto object-contain"
    >
      <div className="-mt-1 text-center">
        <h2 className="text-[26px] font-bold leading-tight tracking-tight text-[var(--octo-text-primary)]">
          {t("auth.success.title")}
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--octo-text-secondary)]">{t("auth.success.body")}</p>
      </div>
      <AuthButton type="button" onClick={onClose}>
        {t("auth.success.submit")}
      </AuthButton>
    </AuthDialog>
  );
}
