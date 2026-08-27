// "Create another business" — the same onboarding flow signup uses, minus the
// Get Started hero (a merchant who is already signed in doesn't need the
// pitch) and, on Payment, the Create Account modal (they already have an
// account). Runs inside the app shell, with the existing back-link and page
// title standing in for the header the standalone signup flow renders.
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { useTenantConfig } from "@/app/providers/tenant-config-provider";
import { Wizard } from "@/pages/onboarding/_shared/wizard";
import { ADD_BUSINESS_STEPS } from "@/pages/onboarding/_shared/steps";
import type { OnboardingDraft } from "@/pages/onboarding/_shared/draft";
import type { OnboardingDraftConfig } from "@/pages/onboarding/_shared/use-onboarding-draft";

const DRAFT_CONFIG: OnboardingDraftConfig = {
  draftKey: "octopus.addBusiness.draft",
  keptKey: "octopus.addBusiness.draft.kept",
  stepCount: ADD_BUSINESS_STEPS.length,
  // The merchant creating a second business already has an account — the
  // Payment step's Create Account modal opens only when `!accountCreated`,
  // so starting a fresh draft with this already true keeps it from ever
  // appearing on this flow.
  patch: { accountCreated: true },
};

export function CreateBusinessPage() {
  const { t, dir } = useI18n();
  const navigate = useNavigate();
  const { createBusiness } = useTenantConfig();

  function handleFinish(draft: OnboardingDraft) {
    if (!draft.vertical || !draft.type) return;
    const businessName = draft.brand.businessName.trim() || "My Business";
    createBusiness({
      vertical: draft.vertical,
      businessType: draft.type,
      enabledModules: draft.enabled,
      branchCount: draft.brand.branchCount,
      businessName,
    });
    navigate("/settings/businesses", { replace: true, state: { created: businessName } });
  }

  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;

  return (
    <div className="px-4 pb-10 pt-4 sm:px-[26px] sm:pt-5">
      <button
        type="button"
        onClick={() => navigate("/settings/businesses")}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--octo-text-secondary)] transition-colors hover:text-[var(--octo-text-primary)]"
      >
        <BackArrow size={14} />
        {t("settings.businesses.title")}
      </button>

      <h1 className="mt-3 text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
        {t("settings.businesses.wizard.title")}
      </h1>

      <Wizard
        steps={ADD_BUSINESS_STEPS}
        draftConfig={DRAFT_CONFIG}
        onFinish={handleFinish}
        finishLabelKey="settings.businesses.wizard.create"
      />
    </div>
  );
}
