// The three ways to build a floor plan, each card in its own accent as the
// frames paint them: violet for the canvas, green for AI, orange for Quick Box.
import { CircleCheck } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import { FLOOR_PLAN_ASSETS } from "@/shared/lib/floor-plan-assets";

export type BuildMethod = "scratch" | "ai" | "quick";

const CARDS: { id: BuildMethod; image: string; accent: string; tint: string; imageClass: string; available: boolean }[] = [
  { id: "scratch", image: FLOOR_PLAN_ASSETS.fromScratch, accent: "#6D28D9", tint: "rgba(109,40,217,0.06)", imageClass: "h-[104px]", available: true },
  { id: "ai", image: FLOOR_PLAN_ASSETS.withAi, accent: "#16A34A", tint: "rgba(22,163,74,0.06)", imageClass: "h-[92px]", available: false },
  { id: "quick", image: FLOOR_PLAN_ASSETS.quickLayout, accent: "#EA670C", tint: "rgba(234,103,12,0.05)", imageClass: "h-[100px]", available: true },
];

export function MethodCards({ onStart, className }: { onStart: (method: BuildMethod) => void; className?: string }) {
  const { t } = useI18n();
  return (
    <div className={clsx("grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3", className)}>
      {CARDS.map((card) => (
        <article key={card.id} className="flex flex-col rounded-[22px] p-6" style={{ backgroundColor: card.tint }}>
          <div className="flex min-h-[104px] items-start justify-between gap-3">
            <img src={card.image} alt="" className={clsx("w-auto max-w-[78%] object-contain object-left rtl:object-right", card.imageClass)} />
            <span className="shrink-0 rounded-full px-3 py-0.5 text-[14px] font-medium text-white" style={{ backgroundColor: card.accent }}>
              {t(`floorPlan.method.${card.id}.badge`)}
            </span>
          </div>
          <h3 className="mt-5 text-[20px] font-bold text-[var(--octo-text-primary)]">{t(`floorPlan.method.${card.id}.title`)}</h3>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--octo-text-secondary)]">{t(`floorPlan.method.${card.id}.body`)}</p>
          <ul className="mt-4 flex flex-1 flex-col gap-3">
            {[1, 2, 3, 4].map((n) => (
              <li key={n} className="flex items-center gap-2.5 text-[14px] text-[var(--octo-text-primary)]">
                <CircleCheck size={20} strokeWidth={1.6} className="shrink-0" style={{ color: card.accent }} />
                {t(`floorPlan.method.${card.id}.point${n}`)}
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={!card.available}
            onClick={() => onStart(card.id)}
            className="mt-6 h-11 w-full rounded-[10px] text-[15px] font-semibold text-white transition-[filter,opacity] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:brightness-100"
            style={{ backgroundColor: card.accent }}
          >
            {card.available ? t("floorPlan.method.start") : t("floorPlan.method.comingSoon")}
          </button>
        </article>
      ))}
    </div>
  );
}
