// Real /accounts/register. Submitting calls the backend, then hands the
// collected details (password included — needed so the page can log the
// merchant in for real right after email verification) back to the page,
// which opens the verification dialog.
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User, Building2 } from "lucide-react";
import { register, ApiError } from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import { AuthField, AuthButton } from "../_shared/auth-field";
import { SocialRow } from "../_shared/social-row";
import { useExternalSignIn, type ExternalLinkRouteState } from "../_shared/use-external-sign-in";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SignUpDraft {
  name: string;
  email: string;
  password: string;
  company: string;
}

interface SignUpErrors {
  name?: string;
  email?: string;
  password?: string;
  company?: string;
}

export function SignUpForm({ onSubmitted }: { onSubmitted: (draft: SignUpDraft) => void }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [errors, setErrors] = useState<SignUpErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function clear(field: keyof SignUpErrors) {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const next: SignUpErrors = {};
    if (!name.trim()) next.name = t("auth.error.nameRequired");
    if (!email.trim()) next.email = t("login.error.emailRequired");
    else if (!EMAIL_RE.test(email.trim())) next.email = t("login.error.emailInvalid");
    if (!password) next.password = t("login.error.passwordRequired");
    // Backend enforces a 12-character minimum (Identity's password policy);
    // catching that here beats letting register() round-trip to a 422.
    else if (password.length < 12) next.password = t("auth.error.passwordTooShort");
    if (!company.trim()) next.company = t("auth.error.companyRequired");

    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    const draft: SignUpDraft = { name: name.trim(), email: email.trim(), password, company: company.trim() };

    setSubmitting(true);
    try {
      // register() always returns 200 regardless of whether the email is
      // already taken (AuthEndpoints.cs — enumeration-safe by design), so
      // there is no "email already registered" error to surface here; a
      // duplicate simply won't receive a new verification code.
      await register(
        { fullName: draft.name, email: draft.email, password: draft.password, companyName: draft.company },
        crypto.randomUUID()
      );
      onSubmitted(draft);
    } catch (err) {
      setErrors({ email: err instanceof ApiError ? err.problem?.errorCode ?? err.message : t("auth.error.genericFailure") });
    } finally {
      setSubmitting(false);
    }
  }

  // A provider whose verified email already has a password account can't be
  // linked from here — the owner has to sign in first, so the pending link
  // travels to the sign-in page, which finishes it.
  const social = useExternalSignIn((externalLink) => {
    const state: ExternalLinkRouteState = { externalLink };
    navigate("/login", { state });
  });

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-6 rounded-[26px] bg-[var(--octo-card)] p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.30)] sm:p-10"
    >
      <h1 className="text-[34px] font-bold leading-tight tracking-tight text-[var(--octo-text-primary)]">
        {t("auth.signUp.title")}
      </h1>

      <SocialRow
        intent="signup"
        onCredential={(provider, credential, mail) => void social.signIn(provider, credential, mail)}
        busy={social.busy}
      />
      {social.error && (
        <p role="alert" className="-mt-2 text-[13px] text-error">
          {social.error}
        </p>
      )}

      <AuthField
        label={t("auth.fullName")}
        icon={<User size={19} />}
        value={name}
        onChange={(v) => { setName(v); clear("name"); }}
        placeholder={t("auth.fullNamePlaceholder")}
        error={errors.name}
        autoComplete="name"
      />
      <AuthField
        label={t("auth.email")}
        icon={<Mail size={19} />}
        type="email"
        value={email}
        onChange={(v) => { setEmail(v); clear("email"); }}
        placeholder={t("auth.emailPlaceholder")}
        error={errors.email}
        autoComplete="email"
      />
      <AuthField
        label={t("auth.createPassword")}
        icon={<Lock size={19} />}
        type="password"
        value={password}
        onChange={(v) => { setPassword(v); clear("password"); }}
        placeholder={t("auth.passwordPlaceholder")}
        error={errors.password}
        autoComplete="new-password"
      />
      <AuthField
        label={t("auth.companyName")}
        icon={<Building2 size={19} />}
        value={company}
        onChange={(v) => { setCompany(v); clear("company"); }}
        placeholder={t("auth.companyPlaceholder")}
        error={errors.company}
        autoComplete="organization"
      />

      <AuthButton disabled={submitting}>{t("auth.createAccountSubmit")}</AuthButton>

      <p className="text-center text-[14px] text-[var(--octo-text-muted)]">
        {t("auth.haveAccount")}{" "}
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="font-semibold text-ocean-blue transition-colors hover:underline"
        >
          {t("auth.signInSubmit")}
        </button>
      </p>
    </form>
  );
}
