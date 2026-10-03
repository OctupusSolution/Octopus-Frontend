// "Add a new Business" from the picker — the same backend-driven setup wizard
// as signup, full-screen under the same header. Finishing makes the new
// business active and opens the console on it.
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/app/providers/i18n-provider";
import { useTenantConfig } from "@/app/providers/tenant-config-provider";
import { SetupWizard } from "@/widgets/business-setup";
import { OnboardingHeader } from "@/pages/onboarding/_shared/header";

export function NewBusinessPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { reload, switchBusiness } = useTenantConfig();

  async function handleFinish(businessId: string) {
    // Activation flips the business from Provisioning to Active moments after
    // creation, so the very first mint attempt can land in that gap and fail —
    // retried a few times, a beat apart, rather than opening the console on a
    // token with no grants.
    await reload();
    await switchBusinessWithRetry(businessId);
    navigate("/", { replace: true });
  }

  async function switchBusinessWithRetry(businessId: string, attempts = 4, delayMs = 400) {
    for (let attempt = 1; ; attempt++) {
      try {
        await switchBusiness(businessId);
        return;
      } catch (err) {
        if (attempt >= attempts) throw err;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  return (
    <SetupWizard
      chrome={<OnboardingHeader onLogoClick={() => navigate("/select-business")} logoLabel={t("businessPicker.back")} />}
      containerClassName="min-h-screen bg-[var(--octo-page-bg)]"
      onFinish={handleFinish}
      finishLabelKey="businessPicker.wizard.open"
    />
  );
}
