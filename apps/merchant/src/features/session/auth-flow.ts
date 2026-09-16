// Which auth dialog is open, as one value rather than four booleans — the
// steps are mutually exclusive and strictly ordered, so a union makes the
// illegal states (two dialogs at once, "success" before "otp") unspellable.
import { useCallback, useState } from "react";

export type AuthStep = "none" | "forgot" | "resetOtp" | "setPassword" | "success" | "signUpOtp";

export function useAuthFlow() {
  const [step, setStep] = useState<AuthStep>("none");

  return {
    step,
    is: useCallback((candidate: AuthStep) => step === candidate, [step]),
    go: setStep,
    close: useCallback(() => setStep("none"), []),
  };
}
