import { AccountStep } from "./account-step";
import type { StepProps } from "../_shared/steps";

export function PaymentStepSlot({ draft, dispatch }: StepProps) {
  if (!draft.type) return null;
  return (
    <AccountStep
      type={draft.type}
      details={{
        businessName: draft.brand.businessName,
        email: draft.account.email,
        phone: draft.account.phone,
        password: draft.account.password,
      }}
      onChange={(next) => {
        dispatch({ type: "patchBrand", patch: { businessName: next.businessName } });
        dispatch({ type: "patchAccount", patch: { email: next.email, phone: next.phone, password: next.password } });
      }}
    />
  );
}
