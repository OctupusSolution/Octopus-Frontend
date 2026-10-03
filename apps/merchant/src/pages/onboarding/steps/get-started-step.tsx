// Step 1 — the doorway. A welcome page rather than a wizard step: it hides
// the rail and the sticky footer (see `hideRail`/`hideFooter` in steps.tsx)
// and carries its own full-width call to action, because the merchant has not
// agreed to start anything yet.
//
// The three entry cards this screen used to offer (AI / template / scratch)
// are gone. All three ran the same wizard, so they were a choice that changed
// nothing; the frame replaces them with the one card that is actually true.
import { Clock, Layers, Plus, ShieldCheck, TrendingUp, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { SETUP_HERO_URL } from "../_shared/assets";
import type { StepProps } from "../_shared/steps";

const CREATE_POINTS = [
  "onboarding.getStarted.create.one",
  "onboarding.getStarted.create.two",
  "onboarding.getStarted.create.three",
  "onboarding.getStarted.create.four",
];

const FEATURES: readonly { icon: LucideIcon; titleKey: string; descKey: string }[] = [
  { icon: Clock,       titleKey: "onboarding.getStarted.feature.minutes.title",  descKey: "onboarding.getStarted.feature.minutes.desc" },
  { icon: ShieldCheck, titleKey: "onboarding.getStarted.feature.secure.title",   descKey: "onboarding.getStarted.feature.secure.desc" },
  { icon: Layers,      titleKey: "onboarding.getStarted.feature.platform.title", descKey: "onboarding.getStarted.feature.platform.desc" },
  { icon: TrendingUp,  titleKey: "onboarding.getStarted.feature.scale.title",    descKey: "onboarding.getStarted.feature.scale.desc" },
];

export function GetStartedStep({ dispatch }: StepProps) {
  const { t } = useI18n();

  function start() {
    // The draft still carries an entry path, and there is now only one way in.
    dispatch({ type: "setEntryPath", path: "scratch" });
    dispatch({ type: "next" });
  }

  return (
    <div className="flex flex-col gap-[72px] pb-8 pt-2">
      <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
        <div>
          <h1 className="text-[34px] font-bold leading-[1.14] tracking-tight text-[var(--octo-text-primary)] sm:text-[44px]">
            {t("onboarding.getStarted.welcome")}{" "}
            <span className="text-[#0D6EFD]">{t("onboarding.getStarted.brand")}</span>
            <br />
            {t("onboarding.getStarted.needs")}
            <br />
            <span className="text-[#0D6EFD]">{t("onboarding.getStarted.onePlace")}</span>
          </h1>
          <p className="mt-6 max-w-[560px] text-[14.5px] leading-relaxed text-[var(--octo-text-muted)]">
            {t("onboarding.getStarted.subtitle")}
          </p>
        </div>
        <img
          src={SETUP_HERO_URL}
          alt=""
          className="mx-auto w-full max-w-[520px] object-contain"
        />
      </section>

      <section>
        <h2 className="text-[21px] font-bold tracking-tight text-[var(--octo-text-primary)]">
          {t("onboarding.getStarted.today")}
        </h2>

        <div className="mt-5 rounded-[16px] bg-[#f1f3f7] p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] text-[#0D6EFD]">
              <Plus size={22} strokeWidth={2.5} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[21px] font-bold tracking-tight text-[var(--octo-text-primary)]">
                  {t("onboarding.getStarted.create.title")}
                </h3>
                <span className="rounded-full bg-[#dfeaff] px-3 py-1 text-[12px] font-medium text-[#0D6EFD]">
                  {t("onboarding.getStarted.create.recommended")}
                </span>
              </div>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--octo-text-muted)]">
                {t("onboarding.getStarted.create.desc")}
              </p>
              <ul className="mt-4 flex flex-wrap items-center gap-x-7 gap-y-2.5">
                {CREATE_POINTS.map((key) => (
                  <li key={key} className="flex items-center gap-2 text-[13px] text-[var(--octo-text-secondary)]">
                    <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px] border-[#0D6EFD] text-[#0D6EFD]">
                      <Check size={10} strokeWidth={3.5} />
                    </span>
                    {t(key)}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={start}
            className="mt-6 w-full justify-center !py-3.5 !text-[14px] !font-semibold"
          >
            {t("onboarding.getStarted.create.cta")}
          </Button>
        </div>
      </section>

      <section className="grid rounded-[16px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-2 py-6 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, titleKey, descKey }, i) => (
          <div
            key={titleKey}
            className={
              "flex items-center gap-3 px-6 py-2" +
              (i > 0 ? " lg:border-s lg:border-[var(--octo-divider)]" : "")
            }
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-[var(--octo-selected)] text-[#0D6EFD]">
              <Icon size={19} />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-bold leading-tight text-[var(--octo-text-primary)]">{t(titleKey)}</p>
              <p className="mt-1 text-[12.5px] text-[var(--octo-text-muted)]">{t(descKey)}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
