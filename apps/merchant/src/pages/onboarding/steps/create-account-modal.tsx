// The account gate in front of payment. MOCK: nothing is sent anywhere and the
// social buttons only fill in a demo address, the same shortcut the login
// screen takes — they do not authenticate against Google, Apple or Microsoft.
import { useState } from "react";
import { Building2, CheckCircle2, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { Button, Input, Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { GoogleIcon, AppleIcon, MicrosoftIcon } from "@/features/session/login/social-icons";
import type { AccountFields } from "../_shared/draft";

const PROVIDERS = [
  { id: "google", Icon: GoogleIcon, labelKey: "login.google" },
  { id: "apple", Icon: AppleIcon, labelKey: "login.apple" },
  { id: "microsoft", Icon: MicrosoftIcon, labelKey: "login.microsoft" },
] as const;

export function CreateAccountModal({
  open, account, created, onPatch, onCreate, onContinue,
}: {
  open: boolean;
  account: AccountFields;
  created: boolean;
  onPatch: (patch: Partial<AccountFields>) => void;
  onCreate: () => void;
  onContinue: () => void;
}) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  const valid = account.fullName.trim() !== "" && account.email.trim() !== "" && account.password.trim() !== "";

  if (created) {
    return (
      <Modal open={open} onClose={onContinue}>
        <div className="flex flex-col items-center gap-3 px-2 py-4 text-center">
          <CheckCircle2 size={40} className="text-[#22C55E]" />
          <p className="text-[17px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.account.createdTitle")}</p>
          <p className="max-w-[380px] text-[12px] leading-relaxed text-[var(--octo-text-muted)]">
            {t("onboarding.account.createdNote")}
          </p>
          <Button variant="primary" className="mt-2 w-full justify-center !py-2.5" onClick={onContinue}>
            {t("onboarding.account.continueToPayment")}
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={() => undefined} title={t("onboarding.account.title")}>
      <div className="grid grid-cols-3 gap-2">
        {PROVIDERS.map(({ id, Icon, labelKey }) => (
          <button
            key={id}
            type="button"
            onClick={() => onPatch({ email: account.email || `owner@${id}.demo` })}
            className="flex items-center justify-center gap-2 rounded-[10px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] py-2.5 text-[12px] font-medium text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]"
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{t(labelKey)}</span>
          </button>
        ))}
      </div>

      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--octo-divider)]" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--octo-text-faint)]">
          {t("onboarding.account.or")}
        </span>
        <span className="h-px flex-1 bg-[var(--octo-divider)]" />
      </div>

      <div className="flex flex-col gap-3">
        <Input
          label={t("onboarding.account.fullName")}
          icon={<User size={15} />}
          placeholder={t("onboarding.account.fullNamePlaceholder")}
          value={account.fullName}
          onChange={(e) => onPatch({ fullName: e.target.value })}
          className="!py-2.5 !text-[13px]"
        />
        <Input
          type="email"
          label={t("onboarding.email")}
          icon={<Mail size={15} />}
          placeholder={t("onboarding.account.emailPlaceholder")}
          value={account.email}
          onChange={(e) => onPatch({ email: e.target.value })}
          className="!py-2.5 !text-[13px]"
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
            {t("onboarding.account.createPassword")}
          </span>
          <span className="relative flex items-center">
            <span className="pointer-events-none absolute start-3.5 text-[var(--octo-text-muted)]"><Lock size={15} /></span>
            <input
              type={visible ? "text" : "password"}
              value={account.password}
              onChange={(e) => onPatch({ password: e.target.value })}
              placeholder={t("onboarding.account.passwordPlaceholder")}
              className="w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3.5 py-2.5 ps-9 pe-10 text-[13px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-faint)] focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/30"
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={t(visible ? "common.hidePassword" : "common.showPassword")}
              className="absolute end-3.5 text-[var(--octo-text-muted)] transition-colors hover:text-[var(--octo-text-secondary)]"
            >
              {visible ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </span>
        </label>
        <Input
          label={t("onboarding.account.companyName")}
          icon={<Building2 size={15} />}
          placeholder={t("onboarding.account.companyNamePlaceholder")}
          value={account.companyName}
          onChange={(e) => onPatch({ companyName: e.target.value })}
          className="!py-2.5 !text-[13px]"
        />

        <Button variant="primary" disabled={!valid} className="mt-1 w-full justify-center !py-2.5" onClick={onCreate}>
          {t("onboarding.account.submit")}
        </Button>
      </div>
    </Modal>
  );
}
