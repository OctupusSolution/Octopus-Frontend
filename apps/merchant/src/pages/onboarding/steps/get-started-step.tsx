// Step 1 — the doorway. A welcome page rather than a wizard step: it hides
// the rail and the sticky footer (see `hideRail`/`hideFooter` in steps.tsx)
// and carries its own full-width call to action, because the merchant has not
// agreed to start anything yet.
//
// The three entry cards this screen used to offer (AI / template / scratch)
// are gone. All three ran the same wizard, so they were a choice that changed
// nothing; the frame replaces them with the one card that is actually true.
import { Button } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { SETUP_HERO_URL, setupIcon } from "../_shared/assets";
import type { StepProps } from "../_shared/steps";

const CREATE_POINTS = [
  "onboarding.getStarted.create.one",
  "onboarding.getStarted.create.two",
  "onboarding.getStarted.create.three",
  "onboarding.getStarted.create.four",
];

/** `icon` is a file in apps/assets/Setup/icons, drawn at its exported size. */
const FEATURES: readonly { icon: string; titleKey: string; descKey: string }[] = [
  { icon: "clock.svg",         titleKey: "onboarding.getStarted.feature.minutes.title",  descKey: "onboarding.getStarted.feature.minutes.desc" },
  { icon: "security-safe.svg", titleKey: "onboarding.getStarted.feature.secure.title",   descKey: "onboarding.getStarted.feature.secure.desc" },
  { icon: "cloud-backup.svg",  titleKey: "onboarding.getStarted.feature.platform.title", descKey: "onboarding.getStarted.feature.platform.desc" },
  { icon: "trend-up.svg",      titleKey: "onboarding.getStarted.feature.scale.title",    descKey: "onboarding.getStarted.feature.scale.desc" },
];

export function GetStartedStep({ dispatch }: StepProps) {
  function start() {
    // The draft still carries an entry path, and there is now only one way in.
    dispatch({ type: "setEntryPath", path: "scratch" });
    dispatch({ type: "next" });
  }

  return <GetStartedHero onStart={start} />;
}

/** The welcome page itself, with no draft behind it — the backend-driven setup
 *  wizard (widgets/business-setup) opens on the same frame. */
export function GetStartedHero({ onStart }: { onStart: () => void }) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col items-center gap-6 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <h1 className="text-[34px] font-bold leading-[1.2] text-[#0f172a] sm:text-[48px]">
            {t("onboarding.getStarted.welcome")}{" "}
            <span className="text-[#0058da]">{t("onboarding.getStarted.brand")}</span>
            <br />
            {t("onboarding.getStarted.needs")}
            <br />
            <span className="text-[#0058da]">{t("onboarding.getStarted.onePlace")}</span>
          </h1>
          <p className="text-[16px] leading-[1.5] text-[#58606c]">{t("onboarding.getStarted.subtitle")}</p>
        </div>
        <img src={SETUP_HERO_URL} alt="" width={384} height={279} className="h-[279px] w-[384px] max-w-full shrink-0 object-contain" />
      </section>

      <div className="flex flex-col gap-12">
        <section className="flex flex-col gap-6">
          <h2 className="text-[24px] font-bold leading-[24px] text-[#0f172a]">{t("onboarding.getStarted.today")}</h2>

          <div className="flex flex-col gap-4 rounded-[24px] border border-[#cbd5e1] bg-[#f5f9ff] p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[8px] bg-white drop-shadow-[0_0_4px_rgba(0,0,0,0.08)]">
                <img src={setupIcon("plus.svg")} alt="" className="block shrink-0" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-[24px] font-bold leading-[24px] text-[#0f172a]">{t("onboarding.getStarted.create.title")}</h3>
                    <span className="rounded-full bg-[#0d6efd]/15 px-3 py-1 text-[16px] font-medium leading-[16px] text-[#004bb9]">
                      {t("onboarding.getStarted.create.recommended")}
                    </span>
                  </div>
                  <p className="text-[16px] font-medium leading-[16px] text-[#58606c]">{t("onboarding.getStarted.create.desc")}</p>
                </div>
                <ul className="flex flex-wrap items-start gap-2">
                  {CREATE_POINTS.map((key) => (
                    <li key={key} className="flex items-center gap-1 text-[16px] font-medium leading-[16px] text-[#0f172a]">
                      <img src={setupIcon("done-outlined-24.svg")} alt="" className="block shrink-0" />
                      {t(key)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={onStart}
              className="h-10 w-full justify-center !rounded-lg !text-[16px] !font-bold !leading-[16px]"
            >
              {t("onboarding.getStarted.create.cta")}
            </Button>
          </div>
        </section>

        <section className="grid gap-y-2 rounded-[24px] border border-[#cbd5e1] bg-white p-3 drop-shadow-[0_0_4px_rgba(0,0,0,0.08)] sm:grid-cols-2 lg:flex lg:items-center lg:justify-between">
          {FEATURES.map(({ icon, titleKey, descKey }, i) => (
            <div
              key={titleKey}
              className={
                "flex items-center gap-2 p-2 lg:w-[282px]" +
                (i < FEATURES.length - 1 ? " lg:border-e lg:border-[#cbd5e1]" : "")
              }
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f5f9ff]">
                <img src={setupIcon(icon)} alt="" className="block shrink-0" />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-[16px] font-semibold leading-[16px] text-[#0f172a]">{t(titleKey)}</p>
                <p className="text-[12px] font-medium leading-[12px] text-[#58606c]">{t(descKey)}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
