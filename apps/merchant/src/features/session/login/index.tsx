// Real /auth/login. Backend refuses any bad credential the same generic way
// (401, no distinction between "wrong password" and "no such account") — see
// AuthEndpoints.cs — so the password field carries a fixed generic error
// message rather than pretending to know which part was wrong.
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { AuthField, AuthButton } from "../_shared/auth-field";
import { SocialRow, type SocialProvider } from "../_shared/social-row";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LoginErrors {
  email?: string;
  password?: string;
}

export function LoginForm({ onForgotPassword }: { onForgotPassword: () => void }) {
  const { signInWithPassword } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
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

    setSubmitting(true);
    try {
      await signInWithPassword(email, password);
      navigate("/", { replace: true });
    } catch {
      // Every login failure (wrong password, unverified email, unknown
      // account) comes back as the same generic 401 — see AuthEndpoints.cs.
      setErrors({ password: t("login.error.passwordIncorrect") });
    } finally {
      setSubmitting(false);
    }
  }

  // Social sign-in isn't wired to a real OAuth flow yet — no provider is
  // contacted, so this can't mint a session the way it used to as a mock.
  function handleSocialSignIn(_provider: SocialProvider) {
    setErrors({ password: t("auth.error.socialUnavailable") });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-6 rounded-[26px] bg-[var(--octo-card)] p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.30)] sm:p-10"
    >
      <h1 className="text-[34px] font-bold leading-tight tracking-tight text-[var(--octo-text-primary)]">
        {t("auth.signIn.title")}
      </h1>

      <SocialRow onPick={handleSocialSignIn} />

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
