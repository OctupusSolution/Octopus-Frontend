// Step 7 — the rail's last label. The frames draw the "Go Live" moment as the
// payment step's success dialog, whose one button provisions the business and
// opens the dashboard directly, so a merchant who pays never lands here. The
// screen exists so the rail's seventh stop has something behind it (a restored
// draft, a future frame); it shows only what the frames already establish —
// the stamp and the "Go To My Dashboard" wording — so replacing it with a real
// design is a rewrite of this file alone.
import { Check } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { PAYMENT_STAMP_URL } from "../_shared/assets";

const POINTS = [
  "onboarding.goLive.point.modules",
  "onboarding.goLive.point.integrations",
  "onboarding.goLive.point.link",
];

export function GoLiveStep() {
  const { t } = useI18n();

  return (
    <section className="rounded-[20px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-8 py-12 text-center">
      <img src={PAYMENT_STAMP_URL} alt="" width={96} height={96} className="mx-auto h-24 w-24 object-contain" />
      <h2 className="mt-6 text-[24px] font-bold tracking-tight text-[var(--octo-text-primary)]">
        {t("onboarding.goLive.ready")}
      </h2>
      <p className="mx-auto mt-3 max-w-[440px] text-[13.5px] leading-relaxed text-[var(--octo-text-muted)]">
        {t("onboarding.goLive.readyBody")}
      </p>
      <ul className="mx-auto mt-7 flex max-w-[360px] flex-col gap-3 text-start">
        {POINTS.map((key) => (
          <li key={key} className="flex items-start gap-2.5 text-[13px] text-[var(--octo-text-secondary)]">
            <span className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-[#0D6EFD] text-white">
              <Check size={11} strokeWidth={3} />
            </span>
            {t(key)}
          </li>
        ))}
      </ul>
    </section>
  );
}
