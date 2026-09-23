// The signup flow's last stop: create the first business. Driven by the
// backend's BusinessSetup wizard (widgets/business-setup), wrapped in a header
// of its own — logo, help, language, avatar — because it renders outside the app
// shell: the sidebar it would show does not exist until a business does.
//
// The merchant reaches this after /signup -> verify -> real sign-in, so there is
// always a session by the time the wizard needs one. Landing here without one
// (a typed URL, an expired session) has no account to attach a business to, so
// it goes to sign-up instead of showing a wizard that cannot save anything.
import { Navigate, useNavigate } from "react-router-dom";
import { useI18n } from "@/app/providers/i18n-provider";
import { useAuth } from "@/app/providers/auth-provider";
import { useTenantConfig } from "@/app/providers/tenant-config-provider";
import { SetupWizard } from "@/widgets/business-setup";
import { OnboardingHeader } from "./_shared/header";

export function OnboardingPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { reload, switchBusiness } = useTenantConfig();

  if (!isAuthenticated) return <Navigate to="/signup" replace />;

  async function handleFinish(businessId: string) {
    // The new business exists server-side; make it the active one (mints its
    // business token) before opening the console on it. Activation flips the
    // business from Provisioning to Active moments after creation, so the very
    // first mint attempt can land in that gap and fail — retried a few times,
    // a beat apart, rather than opening the console on a token with no grants.
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
    />
  );
}
