// Real /auth/login. Backend refuses any bad credential the same generic way
// (401, no distinction between "wrong password" and "no such account") — see
// AuthEndpoints.cs — so the password field carries a fixed generic error
// message rather than pretending to know which part was wrong.
import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Mail, Lock, Link2 } from "lucide-react";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { AuthField, AuthButton } from "../_shared/auth-field";
import { SocialRow } from "../_shared/social-row";
import { fillText, useSessionText } from "../_shared/session-text";
import {
  confirmPendingLink,
  isLinkExpired,
  PROVIDER_NAME,
  readExternalLinkRouteState,
  useExternalSignIn,
  type PendingExternalLink,
} from "../_shared/use-external-sign-in";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LoginErrors {
  email?: string;
  password?: string;
}

export function LoginForm({ onForgotPassword }: { onForgotPassword: () => void }) {
  const { signInWithPassword, signInWithTokens } = useAuth();
  const { t } = useI18n();
  const text = useSessionText();
  const navigate = useNavigate();
  const location = useLocation();
  // A social sign-in whose email already belongs to a password account: the
  // backend links it only once that account's owner signs in below. Arrives
  // either from this form's own social row or from Create Account (router state).
  const [pendingLink, setPendingLink] = useState<PendingExternalLink | null>(() => readExternalLinkRouteState(location.state));
  const [email, setEmail] = useState(() => readExternalLinkRouteState(location.state)?.email ?? "");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const next: LoginErrors = {};
    if (!email.trim()) next.email = t("login.error.emailRequired");
    else if (!EMAIL_RE.test(email.trim())) next.email = t("login.error.emailInvalid");
    if (!password) next.password = t("login.error.passwordRequired");

    setErrors(next);
    if (next.email || next.password) return;

    if (pendingLink && isLinkExpired(pendingLink)) {
      setErrors({ password: fillText(text.linkExpired, { provider: PROVIDER_NAME[pendingLink.provider] }) });
      setPendingLink(null);
      return;
    }

    setSubmitting(true);
    try {
      await signInWithPassword(email, password);
    } catch {
      // Every login failure (wrong password, unverified email, unknown
      // account) comes back as the same generic 401 — see AuthEndpoints.cs.
      setErrors({ password: t("login.error.passwordIncorrect") });
      setSubmitting(false);
      return;
    }
    if (pendingLink) {
      try {
        // Carries the just-issued account token (no business picked yet).
        signInWithTokens(email.trim(), await confirmPendingLink(pendingLink));
      } catch {
        // Linking is a bonus on top of a successful sign-in — the merchant is
        // in either way; they can retry the provider button another time.
      }
    }
    setSubmitting(false);
    navigate("/select-business", { replace: true });
  }

  const social = useExternalSignIn((link) => {
    setPendingLink(link);
    if (link.email) setEmail(link.email);
    setErrors({});
  });

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-6 rounded-[26px] bg-[var(--octo-card)] p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.30)] sm:p-10"
    >
      <h1 className="text-[34px] font-bold leading-tight tracking-tight text-[var(--octo-text-primary)]">
        {t("auth.signIn.title")}
      </h1>

      {pendingLink ? (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-hover)] px-4 py-3">
          <Link2 size={18} className="mt-0.5 shrink-0 text-ocean-blue" />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-[var(--octo-text-primary)]">
              {fillText(text.linkTitle, { provider: PROVIDER_NAME[pendingLink.provider] })}
            </p>
            <p className="mt-1 text-[13px] text-[var(--octo-text-secondary)]">
              {pendingLink.email
                ? fillText(text.linkBody, { provider: PROVIDER_NAME[pendingLink.provider], email: pendingLink.email })
                : fillText(text.linkBodyNoEmail, { provider: PROVIDER_NAME[pendingLink.provider] })}
            </p>
            <button
              type="button"
              onClick={() => setPendingLink(null)}
              className="mt-2 text-[13px] font-medium text-ocean-blue hover:underline"
            >
              {text.linkDismiss}
            </button>
          </div>
        </div>
      ) : (
        <>
          <SocialRow onCredential={(provider, credential, mail) => void social.signIn(provider, credential, mail)} busy={social.busy} />
          {social.error && (
            <p role="alert" className="-mt-2 text-[13px] text-error">
              {social.error}
            </p>
          )}
        </>
      )}

      <AuthField
        label={t("auth.email")}
        icon={<Mail size={19} />}
        type="email"
        value={email}
        onChange={(v) => { setEmail(v); setErrors((p) => ({ ...p, email: undefined })); }}
        placeholder={t("auth.emailPlaceholder")}
        error={errors.email}
        autoComplete="email"
      />

      <div className="flex flex-col gap-2">
        <AuthField
          label={t("auth.password")}
          icon={<Lock size={19} />}
          type="password"
          value={password}
          onChange={(v) => { setPassword(v); setErrors((p) => ({ ...p, password: undefined })); }}
          placeholder={t("auth.passwordPlaceholder")}
          error={errors.password}
          autoComplete="current-password"
        />
        <button
          type="button"
          onClick={onForgotPassword}
          className="self-end text-[14px] text-ocean-blue underline underline-offset-2 transition-colors hover:text-[#0B5ED7]"
        >
          {t("auth.forgetPassword")}
        </button>
      </div>

      <AuthButton disabled={submitting}>{t("auth.signInSubmit")}</AuthButton>

      <p className="text-center text-[14px] text-[var(--octo-text-muted)]">
        {t("auth.noAccount")}{" "}
        <button
          type="button"
          onClick={() => navigate("/signup")}
          className="font-semibold text-ocean-blue transition-colors hover:underline"
        >
          {t("auth.createAccountSubmit")}
        </button>
      </p>
    </form>
  );
}
