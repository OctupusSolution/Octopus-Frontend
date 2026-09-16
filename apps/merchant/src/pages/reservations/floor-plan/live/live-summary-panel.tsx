import type { ElementType } from "react";
import { Ban, Clock3, Hourglass, SprayCan, UserCheck, Users } from "lucide-react";
import type { LiveStatus } from "@/entities/floor-plan";
import { useI18n } from "@/app/providers/i18n-provider";
import { formatNumber, formatTime } from "../_shared/format";
import { TableIcon } from "../_shared/icons";

// Occupied is red and Blocked grey here, matching the legend and the tables
// on the floor. The frame's summary tiles swapped those two colours, which
// would have told a host the opposite of what the floor shows.
const TILES: { id: LiveStatus | "total"; Icon: ElementType; color: string }[] = [
  { id: "available", Icon: UserCheck, color: "#16A34A" },
  { id: "cleaning", Icon: SprayCan, color: "#2563EB" },
  { id: "reserved", Icon: Hourglass, color: "#B7791F" },
  { id: "occupied", Icon: Users, color: "#DC2626" },
  { id: "blocked", Icon: Ban, color: "#6B7280" },
  { id: "total", Icon: TableIcon, color: "#C026D3" },
];

export function LiveSummaryPanel({
  counts,
  total,
  walkIn,
  now,
}: {
  counts: Record<LiveStatus, number>;
  total: number;
  walkIn: number;
  now: number;
}) {
  const { t, locale } = useI18n();
  return (
    <section className="rounded-[20px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
      <h2 className="text-[17px] font-semibold text-[var(--octo-text-primary)]">{t("floorPlan.live.summary.title")}</h2>
      <p className="mt-1 flex items-center gap-1.5 text-[13px] text-[var(--octo-text-secondary)]">
        <Clock3 size={15} />
        {t("floorPlan.live.summary.updated").replace("{time}", formatTime(now, locale))}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {TILES.map(({ id, Icon, color }) => (
          <div
            key={id}
            className="flex flex-col gap-1.5 rounded-xl border p-3"
            style={{ borderColor: `${color}66`, backgroundColor: `${color}0d` }}
          >
            <span className="grid h-10 w-10 place-items-center rounded-lg text-white" style={{ backgroundColor: color }}>
              <Icon size={20} strokeWidth={1.8} />
            </span>
            <span className="text-[13px] text-[var(--octo-text-secondary)]">
              {id === "total" ? t("floorPlan.live.summary.totalTables") : t(`floorPlan.status.${id}.summary`)}
            </span>
            <span className="text-[18px] font-bold leading-none text-[var(--octo-text-primary)]">
              {formatNumber(id === "total" ? total : counts[id], locale)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between text-[14px]">
          <span className="font-medium text-[var(--octo-text-primary)]">{t("floorPlan.live.summary.walkIn")}</span>
          <span className="font-semibold text-[var(--octo-text-primary)]">{walkIn}%</span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--octo-track)]"
          role="progressbar"
          aria-valuenow={walkIn}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("floorPlan.live.summary.walkIn")}
        >
          <div className="h-full rounded-full bg-[#0D6EFD] transition-[width] duration-500" style={{ width: `${walkIn}%` }} />
        </div>
        <p className="mt-1.5 text-[12px] text-[var(--octo-text-muted)]">{t("floorPlan.live.summary.walkInHint")}</p>
      </div>
    </section>
  );
}
