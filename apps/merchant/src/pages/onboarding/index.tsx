// The signup flow. Seven steps, driven by the shared Wizard, wrapped in a
// header of its own — logo, help, language, avatar — because it renders
// outside the app shell: the sidebar it would show does not exist yet at this
// point.
//
// No theme toggle: the wizard is drawn light-only (see wizard.tsx), so a
// control that promised to darken it would be lying.
import { useNavigate } from "react-router-dom";
import { CircleHelp, Globe } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { useAuth } from "@/app/providers/auth-provider";
import { useTenantConfig } from "@/app/providers/tenant-config-provider";
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

/** "Omar Al-Harbi" → "OA"; a one-word name gives its first two letters. */
function initials(name: string | undefined): string | null {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  return parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0];
}

export function OnboardingPage() {
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { createBusiness } = useTenantConfig();

  function handleFinish(draft: OnboardingDraft) {
    if (!draft.vertical || !draft.type) return;
    // Signing up (features/session/signup) is what mints a real session now
    // — there is no local fallback that can fake one from a draft anymore,
    // since a real account needs a password only the merchant knows. Landing
    // on /onboarding directly with no session has nowhere useful to go but
    // back to signup.
    if (!isAuthenticated) {
      navigate("/signup", { replace: true });
      return;
    }
    createBusiness({
      vertical: draft.vertical,
      businessType: draft.type,
      enabledModules: draft.enabled,
      branchCount: draft.brand.branchCount,
      businessName: draft.brand.businessName.trim() || "My Business",
    });
    navigate("/", { replace: true });
  }

  const chrome = (
    <header className="border-b border-[var(--octo-border-card)] bg-[var(--octo-card)]">
      <div className="mx-auto flex max-w-[1248px] items-center justify-between px-6 py-3.5">
        <button
          type="button"
          onClick={() => navigate("/login")}
          aria-label={t("onboarding.backToSignIn")}
          className="flex items-center gap-2"
        >
          <img src={LOGO_URL} alt="OCTOPUS" width={30} height={30} className="rounded-lg object-contain" />
          <span className="text-[16px] font-bold tracking-tight text-[var(--octo-text-primary)]">OCTOPUS</span>
        </button>

        <div className="flex items-center gap-2.5">
          <span className="hidden items-center gap-1.5 rounded-[10px] bg-[var(--octo-shell)] px-4 py-2.5 text-[13px] font-semibold text-[var(--octo-text-primary)] sm:inline-flex">
            <CircleHelp size={16} className="text-[var(--octo-text-secondary)]" />
            {t("onboarding.getStarted.needHelp")}
          </span>
          <button
            type="button"
            onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
            aria-label={t("topbar.language")}
            className="grid h-10 w-10 place-items-center rounded-[10px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
          >
            <Globe size={17} />
          </button>
          {/* Initials, not a photo, the way the frame draws it. The merchant
              signed up before the wizard, so the session's name is normally
              there; the frame's own "OM" stands in on the one demoable path
              that has no session (landing on /onboarding directly). */}
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#0D6EFD] text-[12.5px] font-bold uppercase text-white">
            {initials(user?.name) ?? "OM"}
          </span>
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
