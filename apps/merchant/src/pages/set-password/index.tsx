// Shown once, right after sign-in, when the merchant skipped the password
// field during onboarding. Blocks the rest of the shell until a password is
// set — MOCK: like everywhere else in this prototype, the password itself is
// never stored, only the fact that one now exists (see auth-provider.tsx).
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@ui/primitives";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";

const LOGO_URL = new URL("../../../../assets/Logo/OCTOPUS LOGO.svg", import.meta.url).href;

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggleVisible,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
}) {
  const { t } = useI18n();
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{label}</span>
      <span className="relative flex items-center">
        <span className="pointer-events-none absolute start-3 flex items-center text-[var(--octo-text-muted)]">
          <Lock size={14} />
        </span>
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          autoFocus
          className="w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2 ps-8 pe-9 text-[12.5px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-faint)] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/30 focus:border-[#0D6EFD]"
        />
        <button
          type="button"
          onClick={onToggleVisible}
          aria-label={t(visible ? "common.hidePassword" : "common.showPassword")}
          className="absolute end-3 flex items-center text-[var(--octo-text-muted)] transition-colors hover:text-[var(--octo-text-secondary)]"
        >
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </span>
    </label>
  );
}

export function SetPasswordPage() {
  const { t } = useI18n();
  const { setPasswordSet } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.trim().length < 8) {
      setError(t("setPassword.error.tooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("setPassword.error.mismatch"));
      return;
    }
    setPasswordSet();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--octo-page-bg)] px-4">
      <div className="w-full max-w-[400px] rounded-2xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-7 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.25)]">
        <div className="flex items-center gap-2">
          <img src={LOGO_URL} alt="OCTOPUS" width={32} height={32} className="rounded-lg object-contain" />
          <span className="text-[15px] font-bold tracking-tight text-[var(--octo-text-primary)]">OCTOPUS</span>
        </div>

        <h1 className="mt-5 text-[20px] font-bold leading-tight tracking-tight text-[var(--octo-text-primary)]">
          {t("setPassword.title")}
        </h1>
        <p className="mt-1.5 text-[12.5px] text-[var(--octo-text-muted)]">{t("setPassword.subtitle")}</p>

        <form onSubmit={handleSubmit} noValidate className="mt-5 flex flex-col gap-3">
          <PasswordField
            label={t("setPassword.passwordLabel")}
            value={password}
            onChange={(v) => {
              setPassword(v);
              setError(null);
            }}
            visible={visible}
            onToggleVisible={() => setVisible((v) => !v)}
          />
          <PasswordField
            label={t("setPassword.confirmLabel")}
            value={confirm}
            onChange={(v) => {
              setConfirm(v);
              setError(null);
            }}
            visible={visible}
            onToggleVisible={() => setVisible((v) => !v)}
          />

          {error && <p className="text-[11.5px] text-[#EF4444]">{error}</p>}

          <Button type="submit" className="mt-1 w-full !py-2.5 !text-[13px]">
            {t("setPassword.submit")}
          </Button>
        </form>
      </div>
    </div>
  );
}
