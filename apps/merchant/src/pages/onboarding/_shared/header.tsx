// Logo, help, language and avatar — the bar every full-screen page outside the
// app shell (signup wizard, business picker) sits under.
import { CircleHelp, Globe } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { useAuth } from "@/app/providers/auth-provider";
import { LOGO_URL } from "./assets";

/** "Omar Al-Harbi" → "OA"; a one-word name gives its first two letters. */
function initials(name: string | undefined): string | null {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  return parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0];
}

export function OnboardingHeader({ onLogoClick, logoLabel }: { onLogoClick: () => void; logoLabel: string }) {
  const { t, locale, setLocale } = useI18n();
  const { user } = useAuth();

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
