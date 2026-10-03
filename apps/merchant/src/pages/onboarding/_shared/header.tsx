// Logo, help, language and avatar — the bar every full-screen page outside the
// app shell (signup wizard, business picker) sits under.
//
// The Setup frames draw two bars of their own: the welcome page's tall one
// ("welcome") and the steps' logo-only one ("minimal"). "default" is the bar
// the business picker has always had.
import { CircleHelp, Globe } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { useAuth } from "@/app/providers/auth-provider";
import { LOGO_URL, setupIcon } from "./assets";

/** "Omar Al-Harbi" → "OA"; a one-word name gives its first two letters. */
function initials(name: string | undefined): string | null {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  return parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0];
}

export interface OnboardingHeaderProps {
  onLogoClick: () => void;
  logoLabel: string;
  variant?: "default" | "welcome" | "minimal";
}

export function OnboardingHeader({ onLogoClick, logoLabel, variant = "default" }: OnboardingHeaderProps) {
  const { t, locale, setLocale } = useI18n();
  const { user } = useAuth();

  if (variant === "minimal") {
    return (
      <header className="border-b border-[#cbd5e1]">
        <div className="mx-auto flex max-w-[1248px] items-center justify-between px-6 py-4">
          <button type="button" onClick={onLogoClick} aria-label={logoLabel} className="flex items-center gap-0.5">
            <img src={LOGO_URL} alt="OCTOPUS" width={30} height={30} className="h-[30px] w-[30px] object-contain" />
            <span className="text-[14px] font-bold leading-[14px] text-[#0f172a]">OCTOPUS</span>
          </button>
        </div>
      </header>
    );
  }

  if (variant === "welcome") {
    return (
      <header className="border-b border-[#f0f0f2] bg-white">
        <div className="mx-auto flex h-20 max-w-[1248px] items-center justify-between px-6">
          <button type="button" onClick={onLogoClick} aria-label={logoLabel} className="flex items-center gap-0.5">
            <img src={LOGO_URL} alt="OCTOPUS" width={56} height={56} className="h-14 w-14 object-contain" />
            <span className="text-[16px] font-bold leading-[16px] text-[#0d6efd]">OCTOPUS</span>
          </button>

          <div className="flex items-center gap-6">
            <span className="hidden h-12 w-[171px] items-center justify-center gap-2 rounded-[8px] bg-[#f1f5f9] text-[18px] font-bold leading-[18px] text-[#58606c] sm:inline-flex">
              <img src={setupIcon("help-circle.svg")} alt="" className="block shrink-0" />
              {t("onboarding.getStarted.needHelp")}
            </span>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
                aria-label={t("topbar.language")}
                className="grid h-12 w-12 place-items-center rounded-[8px] border border-[#e8e8ec] transition-colors hover:bg-[#f1f5f9]"
              >
                <img src={setupIcon("language.svg")} alt="" className="block shrink-0" />
              </button>
              {/* Initials, not a photo, the way the frame draws it. "OM" stands
                  in on the one demoable path with no session. */}
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[#0d6efd] text-[14px] font-bold uppercase leading-[14px] text-white">
                {initials(user?.name) ?? "OM"}
              </span>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-[var(--octo-border-card)] bg-[var(--octo-card)]">
      <div className="mx-auto flex max-w-[1248px] items-center justify-between px-6 py-3.5">
        <button type="button" onClick={onLogoClick} aria-label={logoLabel} className="flex items-center gap-2">
          <img src={LOGO_URL} alt="OCTOPUS" width={30} height={30} className="rounded-lg object-contain" />
          <span className="text-[16px] font-bold tracking-tight text-[var(--octo-text-primary)]">OCTOPUS</span>
        </button>

        <div className="flex items-center gap-2.5">
          <span className="hidden items-center gap-1.5 rounded-[10px] bg-[var(--octo-shell)] px-4 py-2.5 text-[13px] font-semibold text-[var(--octo-text-primary)] sm:inline-flex">
            <CircleHelp size={16} className="text-[var(--octo-text-secondary)]" />
            {t("onboarding.getStarted.needHelp")}
          </span>
          <button
            type="button"
            onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
            aria-label={t("topbar.language")}
            className="grid h-10 w-10 place-items-center rounded-[10px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
          >
            <Globe size={17} />
          </button>
          {/* Initials, not a photo, the way the frame draws it. "OM" stands in
              on the one demoable path with no session (landing on /onboarding
              directly). */}
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#0D6EFD] text-[12.5px] font-bold uppercase text-white">
            {initials(user?.name) ?? "OM"}
          </span>
        </div>
      </div>
    </header>
  );
}
