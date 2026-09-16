// The three provider buttons plus the "Or" rule, identical on Sign In and
// Create Account. MOCK OAUTH — no provider is contacted; picking one just
// mints the same fake session the email form does.
import { useI18n } from "@/app/providers/i18n-provider";
import { GoogleIcon, MicrosoftIcon, AppleIcon } from "../login/social-icons";

export type SocialProvider = "google" | "apple" | "microsoft";

const PROVIDERS: {
  id: SocialProvider;
  icon: JSX.Element;
  labelKey: "auth.continueWithGoogle" | "auth.continueWithApple" | "auth.continueWithMicrosoft";
}[] = [
  { id: "google", icon: <GoogleIcon size={18} />, labelKey: "auth.continueWithGoogle" },
  { id: "apple", icon: <AppleIcon size={18} />, labelKey: "auth.continueWithApple" },
  { id: "microsoft", icon: <MicrosoftIcon size={18} />, labelKey: "auth.continueWithMicrosoft" },
];

export function SocialRow({ onPick }: { onPick: (provider: SocialProvider) => void }) {
  const { t } = useI18n();

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {PROVIDERS.map(({ id, icon, labelKey }) => (
          <button
            key={id}
            type="button"
            onClick={() => onPick(id)}
            className="flex h-[54px] items-center justify-center gap-2 rounded-xl border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2.5 text-[13.5px] font-medium text-[var(--octo-text-primary)] transition-colors hover:border-[var(--octo-text-faint)] hover:bg-[var(--octo-hover)]"
          >
            <span className="shrink-0">{icon}</span>
            <span className="whitespace-nowrap">{t(labelKey)}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <span className="h-px flex-1 bg-[var(--octo-border-card)]" />
        <span className="text-[15px] text-[var(--octo-text-muted)]">{t("auth.or")}</span>
        <span className="h-px flex-1 bg-[var(--octo-border-card)]" />
      </div>
    </>
  );
}
