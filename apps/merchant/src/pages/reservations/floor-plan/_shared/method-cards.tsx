// The three ways to build a floor plan, each card in its own accent as the
// frames paint them: violet for the canvas, green for AI, orange for Quick Box.
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import { FLOOR_PLAN_ASSETS } from "@/shared/lib/floor-plan-assets";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { TEXT_PRIMARY, TEXT_SEC_GRAY } from "../../_shared/theme";

export type BuildMethod = "scratch" | "ai" | "quick";

// The artwork files are the frames' own exports at 4x, so each is drawn at the
// frame's box; the AI one stretches to the badge and keeps its ratio instead.
const CARDS: { id: BuildMethod; image: string; accent: string; card: string; imageClass: string; available: boolean }[] = [
  {
    id: "scratch",
    image: FLOOR_PLAN_ASSETS.fromScratch,
    accent: "#6920d2",
    card: "p-6 bg-[#f5f4fd] [[data-theme=dark]_&]:bg-[rgb(105_32_210_/_0.14)]",
    imageClass: "h-[99px] w-[132px] shrink-0",
    available: true,
  },
  {
    id: "ai",
    image: FLOOR_PLAN_ASSETS.withAi,
    accent: "#009a39",
    card: "px-3 py-6 bg-[#f3f8f5] [[data-theme=dark]_&]:bg-[rgb(0_154_57_/_0.14)]",
    imageClass: "aspect-[2001/597] min-w-0 flex-1",
    available: false,
  },
  {
    id: "quick",
    image: FLOOR_PLAN_ASSETS.quickLayout,
    accent: "#e86607",
    card: "p-6 bg-[#fdf8f4] [[data-theme=dark]_&]:bg-[rgb(232_102_7_/_0.14)]",
    imageClass: "h-[99px] w-[189px] shrink-0",
    available: true,
  },
];

export function MethodCards({ onStart, className }: { onStart: (method: BuildMethod) => void; className?: string }) {
  const { t } = useI18n();
  return (
    <div className={clsx("grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3", className)}>
      {CARDS.map((card) => (
        <article key={card.id} className={clsx("flex min-h-[420px] flex-col justify-center gap-4 overflow-clip rounded-[24px]", card.card)}>
          <div className="flex items-start justify-between">
            <img src={card.image} alt="" className={card.imageClass} />
            <span className="shrink-0 rounded-full px-3 py-1 text-[16px] font-medium leading-[16px] text-white" style={{ backgroundColor: card.accent }}>
              {t(`floorPlan.method.${card.id}.badge`)}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex min-h-[69px] flex-col gap-2">
              <h3 className={clsx("text-[20px] font-semibold leading-[20px]", TEXT_PRIMARY)}>{t(`floorPlan.method.${card.id}.title`)}</h3>
              <p className={clsx("text-[14px] font-medium leading-[1.4]", TEXT_SEC_GRAY)}>{t(`floorPlan.method.${card.id}.body`)}</p>
            </div>
            <ul className="flex flex-col gap-2">
              {[1, 2, 3, 4].map((n) => (
                <li key={n} className={clsx("flex items-center gap-1 text-[14px] font-medium leading-[14px]", TEXT_PRIMARY)}>
                  <span className="flex shrink-0" style={{ color: card.accent }}>
                    <ShellIcon name="fp-hub-check.svg" size={24} />
                  </span>
                  {t(`floorPlan.method.${card.id}.point${n}`)}
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            disabled={!card.available}
            onClick={() => onStart(card.id)}
            className="h-10 w-full shrink-0 rounded-lg px-3 py-2 text-[16px] font-bold leading-[16px] text-white transition-[filter,opacity] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
            style={{ backgroundColor: card.accent }}
          >
            {card.available ? t("floorPlan.method.start") : t("floorPlan.method.comingSoon")}
          </button>
        </article>
      ))}
    </div>
  );
}
