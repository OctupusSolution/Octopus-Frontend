// MOCK AUTH — replace with the real /auth/login endpoint when the backend exists.
// Any email plus password "octopus" signs in; nothing sensitive is ever stored.
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import { Input, Checkbox, Button } from "@ui/primitives";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LoginErrors {
  email?: string;
  password?: string;
}

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

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col">
      <h1 className="text-[26px] font-bold leading-tight tracking-tight text-[var(--octo-text-primary)]">{t("login.signIn")}</h1>
      <p className="mt-1.5 text-[13px] text-[var(--octo-text-muted)]">
        {t("login.welcome")}
      </p>

      <div className="mt-7 flex flex-col gap-4">
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

      <Button type="submit" className="mt-6 w-full !py-2.5 !text-[13px]">
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
