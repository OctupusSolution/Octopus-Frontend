// The signup flow. Ten steps, driven by the shared Wizard, wrapped in a
// header of its own — logo, language, theme — because it renders outside the
// app shell: the sidebar it would show does not exist yet at this point.
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Languages, Moon, Sun } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { useAuth } from "@/app/providers/auth-provider";
import { useTenantConfig } from "@/app/providers/tenant-config-provider";
import { useTheme } from "@/app/providers/theme-provider";
import { Wizard } from "./_shared/wizard";
import { STEPS, STEP_COUNT } from "./_shared/steps";
import type { OnboardingDraft } from "./_shared/draft";
import type { OnboardingDraftConfig } from "./_shared/use-onboarding-draft";
import { LOGO_URL } from "./_shared/assets";

const DRAFT_CONFIG: OnboardingDraftConfig = {
  draftKey: "octopus.onboarding.draft",
  keptKey: "octopus.onboarding.draft.kept",
  stepCount: STEP_COUNT,
};

export function OnboardingPage() {
  const { t, dir, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { createBusiness } = useTenantConfig();

  function handleFinish(draft: OnboardingDraft) {
    if (!draft.vertical || !draft.type) return;
    createBusiness({
      vertical: draft.vertical,
      businessType: draft.type,
      enabledModules: draft.enabled,
      branchCount: draft.brand.branchCount,
      businessName: draft.brand.businessName.trim() || "My Business",
    });
    // `passwordSet` comes from `accountCreated`, not from the password value.
    // The password is deliberately not persisted (see use-onboarding-draft.ts),
    // so after a mid-flow refresh it is "" even for a merchant who set one —
    // deriving the flag from it would hand them the Set Password screen the
    // moment they finished paying, with no way back to the account modal
    // (`accountCreated` is persisted, so that modal never reopens). The flag
    // itself is the honest signal: the account form cannot be submitted without
    // a non-empty password, so `accountCreated` means one was set.
    signIn(draft.account.email.trim() || "owner@octopus.sa", draft.accountCreated);
    navigate("/", { replace: true });
  }

  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;

  const chrome = (
    <header className="border-b border-[var(--octo-border-card)] bg-[var(--octo-card)]">
      <div className="mx-auto grid max-w-[1180px] grid-cols-[1fr_auto_1fr] items-center px-5 py-4">
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="inline-flex items-center gap-1.5 justify-self-start text-[12px] font-medium text-[var(--octo-text-secondary)] transition-colors hover:text-[var(--octo-text-primary)]"
        >
          <BackArrow size={14} />
          <span className="hidden sm:inline">{t("onboarding.backToSignIn")}</span>
        </button>
        <div className="flex items-center gap-2 justify-self-center">
          <img src={LOGO_URL} alt="OCTOPUS" width={30} height={30} className="rounded-lg object-contain" />
          <span className="text-[15px] font-bold tracking-tight text-[var(--octo-text-primary)]">OCTOPUS</span>
        </div>
        <div className="flex items-center justify-self-end gap-2">
          <button
            type="button"
            onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
            aria-label={t("topbar.language")}
            className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
          >
            <Languages size={15} />
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={t("topbar.theme")}
            className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>
    </header>
  );

  return (
    <Wizard
      steps={STEPS}
      draftConfig={DRAFT_CONFIG}
      onFinish={handleFinish}
      chrome={chrome}
      containerClassName="min-h-screen bg-[var(--octo-page-bg)]"
    />
  );
}
