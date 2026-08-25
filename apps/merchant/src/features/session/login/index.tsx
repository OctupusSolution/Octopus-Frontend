// MOCK AUTH — replace with the real /auth/login endpoint when the backend exists.
// Any email plus password "octopus" signs in; nothing sensitive is ever stored.
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import { Input, Checkbox, Button } from "@ui/primitives";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { GoogleIcon, MicrosoftIcon, AppleIcon } from "./social-icons";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LoginErrors {
  email?: string;
  password?: string;
}

type SocialProvider = "google" | "microsoft" | "apple";

const SOCIAL_PROVIDERS: { id: SocialProvider; icon: (size: number) => JSX.Element; labelKey: "login.google" | "login.microsoft" | "login.apple"; ariaKey: "login.continueWithGoogle" | "login.continueWithMicrosoft" | "login.continueWithApple" }[] = [
  { id: "google", icon: (size) => <GoogleIcon size={size} />, labelKey: "login.google", ariaKey: "login.continueWithGoogle" },
  { id: "microsoft", icon: (size) => <MicrosoftIcon size={size} />, labelKey: "login.microsoft", ariaKey: "login.continueWithMicrosoft" },
  { id: "apple", icon: (size) => <AppleIcon size={size} />, labelKey: "login.apple", ariaKey: "login.continueWithApple" },
];

export function LoginForm() {
  const { signIn } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});

  function clearError(field: keyof LoginErrors) {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const next: LoginErrors = {};
    if (!email.trim()) next.email = t("login.error.emailRequired");
    else if (!EMAIL_RE.test(email.trim())) next.email = t("login.error.emailInvalid");
    if (!password) next.password = t("login.error.passwordRequired");
    else if (password !== "octopus") next.password = t("login.error.passwordIncorrect");

    setErrors(next);
    if (next.email || next.password) return;

    // remember is captured but a mock prototype always persists the session
    // under "octopus.session" — swap for real session expiry when wired to an API.
    signIn(email.trim());
    navigate("/", { replace: true });
  }

  // Mock OAuth — same fake-session shortcut as the email form, no provider is
  // actually contacted. Swap for a real redirect flow once auth exists.
  function handleSocialSignIn(provider: SocialProvider) {
    signIn(`owner@${provider}.demo`);
    navigate("/", { replace: true });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col">
      <h1 className="text-[26px] font-bold leading-tight tracking-tight text-[var(--octo-text-primary)]">{t("login.signIn")}</h1>
      <p className="mt-1.5 text-[13px] text-[var(--octo-text-muted)]">
        {t("login.welcome")}
      </p>

      <div className="mt-7 grid grid-cols-3 gap-2.5">
        {SOCIAL_PROVIDERS.map(({ id, icon, labelKey, ariaKey }) => (
          <button
            key={id}
            type="button"
            aria-label={t(ariaKey)}
            onClick={() => handleSocialSignIn(id)}
            className="flex items-center justify-center gap-1.5 rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] py-2.5 text-[11.5px] font-medium text-[var(--octo-text-primary)] transition-colors hover:border-[var(--octo-text-faint)] hover:bg-[var(--octo-hover)]"
          >
            {icon(15)}
            <span className="hidden sm:inline">{t(labelKey)}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--octo-divider)]" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--octo-text-faint)]">
          {t("login.orContinueWithEmail")}
        </span>
        <span className="h-px flex-1 bg-[var(--octo-divider)]" />
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <Input
          type="email"
          label={t("login.email")}
          icon={<Mail size={14} />}
          placeholder="owner@albahri.sa"
          autoComplete="email"
          value={email}
          error={errors.email}
          onChange={(e) => {
            setEmail(e.target.value);
            clearError("email");
          }}
        />

        <Input
          type="password"
          label={t("login.password")}
          icon={<Lock size={14} />}
          placeholder="••••••••"
          autoComplete="current-password"
          value={password}
          error={errors.password}
          onChange={(e) => {
            setPassword(e.target.value);
            clearError("password");
          }}
        />

        <div className="flex items-center justify-between">
          <Checkbox
            label={t("login.rememberMe")}
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <button
            type="button"
            className="text-[11.5px] font-medium text-[#0D6EFD] hover:underline"
          >
            {t("login.forgotPassword")}
          </button>
        </div>
      </div>

      <Button type="submit" className="mt-6 w-full !py-2.5 !text-[13px] justify-center font-semibold">
        {t("login.signIn")}
      </Button>

      <p className="mt-5 text-center text-[12.5px] text-[var(--octo-text-muted)]">
        {t("login.noAccount")}{" "}
        <button
          type="button"
          onClick={() => navigate("/onboarding")}
          className="font-semibold text-[#0D6EFD] hover:underline"
        >
          {t("login.createAccount")}
        </button>
      </p>

      <p className="mt-6 rounded-lg bg-[var(--octo-hover)] px-3 py-2 text-center text-[11px] text-[var(--octo-text-faint)]">
        {t("login.demoHint")} <span className="font-mono text-[var(--octo-text-secondary)]">octopus</span>
      </p>
    </form>
  );
}
