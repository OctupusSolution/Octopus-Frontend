import { Card, CardBody } from "@ui/primitives";
import { LoginForm } from "@/features/session/login";
import { useI18n } from "@/app/providers/i18n-provider";

const LOGO_URL = new URL("../../../../assets/Logo/OCTOPUS LOGO.svg", import.meta.url).href;

export function LoginPage() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--octo-page-bg)] px-4 py-10">
      <div className="flex w-full max-w-[920px] items-stretch overflow-hidden rounded-2xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] shadow-[0_24px_60px_-24px_rgba(15,23,42,0.25)]">
        {/* Brand panel — hidden below lg so the form owns smaller screens */}
        <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0D6EFD] to-[#6C4DFF] p-10 lg:flex">
          {/* Ambient glow — echoes the brand gradient, not a literal illustration */}
          <div className="pointer-events-none absolute -end-24 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -start-16 h-72 w-72 rounded-full bg-[#16161d]/10 blur-3xl" />

          <div className="relative flex items-center gap-2.5">
            <img src={LOGO_URL} alt="OCTOPUS logo" width={36} height={36} className="rounded-xl bg-white object-contain p-1.5" />
            <span className="text-[15px] font-bold tracking-tight text-white">OCTOPUS</span>
          </div>

          <div className="relative">
            <h2 className="max-w-[380px] text-[28px] font-bold leading-[1.15] tracking-tight text-white">
              {t("login.tagline")}
            </h2>
            <p className="mt-3.5 max-w-[360px] text-[13px] leading-relaxed text-white/80">
              {t("login.description")}
            </p>
          </div>

          <p className="relative text-[11px] text-white/60">© 2026 OCTOPUS · {t("login.madeInSaudi")}</p>
        </div>

        {/* Form side */}
        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-12">
          <div className="w-full max-w-[360px]">
            <div className="mb-8 flex items-center gap-2 lg:hidden">
              <img src={LOGO_URL} alt="OCTOPUS logo" width={32} height={32} className="rounded-lg object-contain" />
              <span className="text-[15px] font-bold tracking-tight text-[var(--octo-text-primary)]">OCTOPUS</span>
            </div>

            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
