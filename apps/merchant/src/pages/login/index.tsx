// Sign In. Also the host for the password-reset flow, which the frames draw
// as a stack of dialogs over this page rather than as routes of their own —
// the sign-in card stays visible behind every step.
//
// The reset flow spans three real backend calls with no single endpoint tying
// them together, so this page holds the email/code between dialogs:
// forgot-password(email) -> [merchant reads the emailed code] -> the code is
// only actually checked by reset-password(email, code, newPassword) at the
// very end, not by a separate "verify code" call — see AuthEndpoints.cs.
import { useState } from "react";
import { forgotPassword, resendCode, resetPassword } from "@octopus/api-client";
import { LoginForm } from "@/features/session/login";
import { AuthLayout } from "@/pages/auth/_shared/auth-layout";
import { useAuthFlow } from "@/features/session/auth-flow";
import {
  ForgotPasswordDialog,
  OtpDialog,
  SetPasswordDialog,
  PasswordChangedDialog,
} from "@/features/session/auth-dialogs";
import { useI18n } from "@/app/providers/i18n-provider";

export function LoginPage() {
  const { t } = useI18n();
  const flow = useAuthFlow();
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");

  return (
    <AuthLayout heading={t("auth.signIn.heading")} subheading={t("auth.signIn.subheading")}>
      <LoginForm onForgotPassword={() => flow.go("forgot")} />

      <ForgotPasswordDialog
        open={flow.is("forgot")}
        onClose={flow.close}
        onSent={async (email) => {
          await forgotPassword({ email });
          setResetEmail(email);
          flow.go("resetOtp");
        }}
      />
      <OtpDialog
        open={flow.is("resetOtp")}
        onClose={flow.close}
        variant="enterCode"
        // No standalone verify-code endpoint for password reset — the code
        // is only actually checked by reset-password below, so this just
        // remembers it and moves on.
        onVerified={async (code) => {
          setResetCode(code);
          flow.go("setPassword");
        }}
        onResend={() => resendCode({ email: resetEmail })}
      />
      <SetPasswordDialog
        open={flow.is("setPassword")}
        onClose={flow.close}
        onDone={async (password) => {
          await resetPassword({ email: resetEmail, code: resetCode, newPassword: password, confirmPassword: password });
          flow.go("success");
        }}
      />
      <PasswordChangedDialog open={flow.is("success")} onClose={flow.close} />
    </AuthLayout>
  );
}
