// "Need Help? Watch Tutorial". There is no tutorial video in this build, so
// the dialog walks through the same four steps a video would, with the
// shortcuts that make the builder fast.
import { useState } from "react";
import { ArrowLeft, ArrowRight, Keyboard, LayoutGrid, PlayCircle, Rocket, Settings2, Shapes } from "lucide-react";
import clsx from "clsx";
import { Button, Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { FLOOR_PLAN_ASSETS } from "@/shared/lib/floor-plan-assets";

const STEPS = [
  { id: "choose", Icon: LayoutGrid },
  { id: "arrange", Icon: Shapes },
  { id: "rules", Icon: Settings2 },
  { id: "publish", Icon: Rocket },
] as const;

const SHORTCUTS = [
  ["V", "floorPlan.tutorial.shortcut.select"],
  ["Space", "floorPlan.tutorial.shortcut.pan"],
  ["Ctrl + Z", "floorPlan.tutorial.shortcut.undo"],
  ["Ctrl + D", "floorPlan.tutorial.shortcut.duplicate"],
  ["Delete", "floorPlan.tutorial.shortcut.delete"],
  ["R", "floorPlan.tutorial.shortcut.rotate"],
] as const;

export function WatchTutorialButton({ className }: { className?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={clsx(
          "flex items-center gap-3 rounded-2xl bg-[var(--octo-selected)] px-4 py-2.5 text-start transition-colors hover:brightness-[0.98]",
          className
        )}
      >
        <PlayCircle size={28} strokeWidth={1.6} className="shrink-0 text-[#0D6EFD]" />
        <span>
          <span className="block text-[13px] leading-tight text-[var(--octo-text-primary)]">{t("floorPlan.tutorial.needHelp")}</span>
          <span className="block text-[17px] font-bold leading-tight text-[#0D6EFD]">{t("floorPlan.tutorial.watch")}</span>
        </span>
      </button>
      <TutorialModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function TutorialModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  function close() {
    onClose();
    setIndex(0);
  }

  return (
    <Modal open={open} onClose={close} className="max-w-3xl !p-0">
      <div className="grid overflow-hidden rounded-xl md:grid-cols-[240px_1fr]">
        <div className="flex flex-col justify-between gap-4 bg-[var(--octo-selected)] p-5">
          <img src={FLOOR_PLAN_ASSETS.welcome} alt="" className="w-full" />
          <ol className="flex flex-col gap-1.5">
            {STEPS.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  className={clsx(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-[12.5px] transition-colors",
                    i === index ? "bg-[var(--octo-card)] font-semibold text-[#0D6EFD] shadow-sm" : "text-[var(--octo-text-secondary)] hover:bg-[var(--octo-card)]/60"
                  )}
                >
                  <span
                    className={clsx(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                      i <= index ? "bg-[#0D6EFD] text-white" : "bg-[var(--octo-card)] text-[var(--octo-text-muted)]"
                    )}
                  >
                    {i + 1}
                  </span>
                  {t(`floorPlan.tutorial.step.${s.id}.title`)}
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex min-h-[380px] flex-col p-6">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--octo-text-faint)]">
            {t("floorPlan.tutorial.stepOf").replace("{n}", String(index + 1)).replace("{total}", String(STEPS.length))}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#0D6EFD]/10 text-[#0D6EFD]">
              <step.Icon size={22} />
            </span>
            <h2 className="text-[19px] font-bold text-[var(--octo-text-primary)]">{t(`floorPlan.tutorial.step.${step.id}.title`)}</h2>
          </div>
          <p className="mt-3 text-[13.5px] leading-relaxed text-[var(--octo-text-secondary)]">{t(`floorPlan.tutorial.step.${step.id}.body`)}</p>

          {isLast && (
            <div className="mt-5 rounded-xl border border-[var(--octo-border-card)] p-3.5">
              <p className="flex items-center gap-2 text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
                <Keyboard size={15} /> {t("floorPlan.tutorial.shortcuts")}
              </p>
              <dl className="mt-2.5 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
                {SHORTCUTS.map(([keys, labelKey]) => (
                  <div key={keys} className="flex items-center justify-between gap-2 text-[12px]">
                    <dt className="text-[var(--octo-text-secondary)]">{t(labelKey)}</dt>
                    <dd dir="ltr">
                      <kbd className="rounded-md border border-[var(--octo-border-input)] bg-[var(--octo-soft-bg)] px-1.5 py-0.5 font-sans text-[11px] font-semibold text-[var(--octo-text-primary)]">
                        {keys}
                      </kbd>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="mt-auto flex items-center justify-between gap-2 pt-6">
            <Button variant="ghost" onClick={close} className="h-10 px-3 text-[13px]">
              {t("floorPlan.tutorial.skip")}
            </Button>
            <div className="flex gap-2">
              {index > 0 && (
                <Button variant="secondary" icon={<ArrowLeft size={14} className="rtl:rotate-180" />} onClick={() => setIndex(index - 1)} className="h-10 px-4 text-[13px]">
                  {t("floorPlan.common.back")}
                </Button>
              )}
              <Button onClick={() => (isLast ? close() : setIndex(index + 1))} className="h-10 px-4 text-[13px]">
                {isLast ? t("floorPlan.tutorial.done") : t("floorPlan.common.next")}
                {!isLast && <ArrowRight size={14} className="rtl:rotate-180" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
