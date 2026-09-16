// Create Account. The verification dialog opens over the filled-in form, and
// only clearing it mints the session — so abandoning the code leaves the
// merchant on their own form with everything they typed still there.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { resendVerificationCode, verifyEmail } from "@octopus/api-client";
import { SignUpForm, type SignUpDraft } from "@/features/session/signup";
import { AuthLayout } from "@/pages/auth/_shared/auth-layout";
import { OtpDialog } from "@/features/session/auth-dialogs";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";

export function SignUpPage() {
  const { t } = useI18n();
  const { signInWithPassword } = useAuth();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<SignUpDraft | null>(null);

  // Registration and verification are two separate backend calls with no
  // token in the verify response — the account doesn't have a session until
  // it explicitly logs in, so this signs in for real (with the password the
  // merchant just set) right after the code checks out, rather than getting
  // one handed to it.
  async function handleVerified(code: string) {
    if (!draft) return;
    await verifyEmail({ email: draft.email, code });
    await signInWithPassword(draft.email, draft.password);
    navigate("/onboarding", { replace: true });
  }

  return (
    <AuthLayout heading={t("auth.signUp.heading")} subheading={t("auth.signUp.subheading")}>
      <SignUpForm onSubmitted={setDraft} />

      <OtpDialog
        open={draft !== null}
        onClose={() => setDraft(null)}
        variant="verifyAccount"
        onVerified={handleVerified}
        onResend={() => resendVerificationCode({ email: draft?.email ?? "" })}
      />
    </AuthLayout>
  );
}
