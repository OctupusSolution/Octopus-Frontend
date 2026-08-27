// Step 1 — the doorway. Three entry cards and a headline; picking a card
// records the merchant's intent and moves on. All three lead to the same
// wizard today, so the card is a stated preference, not a different flow —
// and it is not dressed up as one.
import { Check, Sparkles } from "lucide-react";
import clsx from "clsx";
import { Button } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { HERO_URL, getStartedAsset } from "../_shared/assets";
import type { EntryPath } from "../_shared/draft";
import type { StepProps } from "../_shared/steps";

const PATHS: readonly { id: EntryPath; image: string; nameKey: string; descKey: string }[] = [
  { id: "ai",       image: "AI.png",           nameKey: "onboarding.getStarted.ai.name",       descKey: "onboarding.getStarted.ai.desc" },
  { id: "template", image: "templete.png",     nameKey: "onboarding.getStarted.template.name", descKey: "onboarding.getStarted.template.desc" },
  { id: "scratch",  image: "from scratch.png", nameKey: "onboarding.getStarted.scratch.name",  descKey: "onboarding.getStarted.scratch.desc" },
];

const EASY_POINTS = [
  "onboarding.getStarted.easy.one",
  "onboarding.getStarted.easy.two",
  "onboarding.getStarted.easy.three",
];

export function GetStartedStep({ draft, dispatch }: StepProps) {
  const { t } = useI18n();

  function choose(path: EntryPath) {
    dispatch({ type: "setEntryPath", path });
    dispatch({ type: "next" });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
        <div>
          <h2 className="text-[30px] font-bold leading-[1.15] tracking-tight text-[var(--octo-text-primary)] sm:text-[38px]">
            <span className="text-[#0D6EFD]">{t("onboarding.getStarted.title.a")}</span>{" "}
            {t("onboarding.getStarted.title.b")}{" "}
            <span className="text-[#0D6EFD]">{t("onboarding.getStarted.title.c")}</span>
          </h2>
          <p className="mt-4 max-w-[520px] text-[13px] leading-relaxed text-[var(--octo-text-muted)]">
            {t("onboarding.getStarted.subtitle")}
          </p>
          <Button
            variant="primary"
            className="mt-6 w-full max-w-[440px] justify-center !py-3 !text-[14px]"
            onClick={() => choose(draft.entryPath ?? "scratch")}
          >
            {t("onboarding.getStarted.cta")}
          </Button>
        </div>
        <img src={HERO_URL} alt="" className="mx-auto w-full max-w-[440px] object-contain" />
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {PATHS.map((path) => {
          const active = draft.entryPath === path.id;
          return (
            <button
              key={path.id}
              type="button"
              onClick={() => choose(path.id)}
              aria-pressed={active}
              className={clsx(
                "flex flex-col items-start gap-2 rounded-xl border p-5 text-start transition-all duration-200",
                active
                  ? "border-[#0D6EFD] bg-[var(--octo-selected)] shadow-[0_0_0_3px_rgba(13,110,253,0.08)]"
                  : "border-[var(--octo-border-card)] bg-[var(--octo-card)] hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
              )}
            >
              <img src={getStartedAsset(path.image)} alt="" width={40} height={40} className="h-10 w-10 object-contain" />
              <span className="mt-1 text-[16px] font-bold text-[var(--octo-text-primary)]">{t(path.nameKey)}</span>
              <span className="text-[12px] leading-relaxed text-[var(--octo-text-muted)]">{t(path.descKey)}</span>
            </button>
          );
        })}

        <section className="rounded-xl border border-[#0D6EFD]/20 bg-[var(--octo-selected)] p-5">
          <h3 className="flex items-center gap-1.5 text-[13px] font-bold text-[var(--octo-text-primary)]">
            <Sparkles size={14} className="text-[#0D6EFD]" />
            {t("onboarding.getStarted.easy.title")}
          </h3>
          <ul className="mt-3 flex flex-col gap-2">
            {EASY_POINTS.map((key) => (
              <li key={key} className="flex items-start gap-2 text-[11.5px] leading-relaxed text-[var(--octo-text-secondary)]">
                <Check size={12} strokeWidth={3} className="mt-0.5 shrink-0 text-[#0D6EFD]" />
                {t(key)}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
