// Step 5 — the only details we ask for. Everything else was inferred.
//
// MOCK: nothing is sent anywhere; the mock auth provider signs the merchant
// in on the email alone. The password field is optional here on purpose —
// skip it and the app shell will ask for one on first sign-in instead of
// silently leaving the account without one. The social buttons are the same
// kind of mock shortcut the login screen uses — they fill in a demo email,
// nothing actually authenticates against Google/Apple/Microsoft.
import { useState } from "react";
import { Building2, Eye, EyeOff, Lock, Mail, Phone } from "lucide-react";
import { Input } from "@ui/primitives";
import { getRestaurantType, type TypeCode } from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { GoogleIcon, MicrosoftIcon, AppleIcon } from "@/features/session/login/social-icons";

export interface AccountDetails {
  businessName: string;
  email: string;
  phone: string;
  password: string;
}

type SocialProvider = "google" | "microsoft" | "apple";

const SOCIAL_PROVIDERS: { id: SocialProvider; icon: (size: number) => JSX.Element; labelKey: "login.google" | "login.microsoft" | "login.apple" }[] = [
  { id: "google", icon: (size) => <GoogleIcon size={size} />, labelKey: "login.google" },
  { id: "microsoft", icon: (size) => <MicrosoftIcon size={size} />, labelKey: "login.microsoft" },
  { id: "apple", icon: (size) => <AppleIcon size={size} />, labelKey: "login.apple" },
];

export function AccountStep({
  type,
  details,
  onChange,
}: {
  type: TypeCode;
  details: AccountDetails;
  onChange: (next: AccountDetails) => void;
}) {
  const { t } = useI18n();
  const restaurantType = getRestaurantType(type);
  const [passwordVisible, setPasswordVisible] = useState(false);

  function handleSocialSignUp(provider: SocialProvider) {
    onChange({ ...details, email: details.email || `owner@${provider}.demo` });
  }

  return (
    <section className="mx-auto w-full rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-7">
      {restaurantType && (
        <p className="mb-5 rounded-[10px] bg-[var(--octo-hover)] px-3.5 py-3 text-[13px] text-[var(--octo-text-secondary)]">
          {t("onboarding.summaryFor").replace("{type}", t(restaurantType.nameKey))}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2.5">
        {SOCIAL_PROVIDERS.map(({ id, icon, labelKey }) => (
          <button
            key={id}
            type="button"
            onClick={() => handleSocialSignUp(id)}
            aria-label={t(labelKey)}
            className="flex items-center justify-center gap-2 rounded-[10px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] py-3 text-[13px] font-medium text-[var(--octo-text-primary)] transition-colors hover:border-[var(--octo-text-faint)] hover:bg-[var(--octo-hover)]"
          >
            {icon(17)}
            <span className="hidden sm:inline">{t(labelKey)}</span>
          </button>
        ))}
      </div>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--octo-divider)]" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--octo-text-faint)]">
          {t("onboarding.account.or")}
        </span>
        <span className="h-px flex-1 bg-[var(--octo-divider)]" />
      </div>

      <div className="flex flex-col gap-4">
        <Input
          label={t("onboarding.businessName")}
          icon={<Building2 size={15} />}
          value={details.businessName}
          onChange={(e) => onChange({ ...details, businessName: e.target.value })}
          autoFocus
          required
          className="!py-2.5 !text-[13.5px]"
        />
        <Input
          type="email"
          label={t("onboarding.email")}
          icon={<Mail size={15} />}
          value={details.email}
          onChange={(e) => onChange({ ...details, email: e.target.value })}
          required
          className="!py-2.5 !text-[13.5px]"
        />

        <label className="flex flex-col gap-1.5">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
            {t("onboarding.password")}
          </span>
          <span className="relative flex items-center">
            <span className="pointer-events-none absolute start-3.5 flex items-center text-[var(--octo-text-muted)]">
              <Lock size={15} />
            </span>
            <input
              type={passwordVisible ? "text" : "password"}
              value={details.password}
              onChange={(e) => onChange({ ...details, password: e.target.value })}
              placeholder="••••••••"
              className="w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3.5 py-2.5 ps-9 pe-10 text-[13.5px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-faint)] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/30 focus:border-[#0D6EFD]"
            />
            <button
              type="button"
              onClick={() => setPasswordVisible((v) => !v)}
              aria-label={t(passwordVisible ? "common.hidePassword" : "common.showPassword")}
              className="absolute end-3.5 flex items-center text-[var(--octo-text-muted)] transition-colors hover:text-[var(--octo-text-secondary)]"
            >
              {passwordVisible ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </span>
          <span className="text-[11px] leading-relaxed text-[var(--octo-text-faint)]">{t("onboarding.password.hint")}</span>
        </label>

        <Input
          type="tel"
          label={t("onboarding.phone")}
          icon={<Phone size={15} />}
          value={details.phone}
          onChange={(e) => onChange({ ...details, phone: e.target.value })}
          placeholder="+966 5X XXX XXXX"
          className="!py-2.5 !text-[13.5px]"
        />
      </div>

      <p className="mt-5 text-[11.5px] text-[var(--octo-text-faint)]">{t("pricing.vatNote")}</p>
    </section>
  );
}
