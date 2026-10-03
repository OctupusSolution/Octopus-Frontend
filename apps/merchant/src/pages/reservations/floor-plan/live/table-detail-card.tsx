import type { ReactNode } from "react";
import { CircleDot, ClipboardList, Clock3, MapPin, MousePointerClick, NotebookPen, PenLine, User, UserRound, Users } from "lucide-react";
import { formatDuration, minutesBetween } from "@/entities/floor-plan";
import { TABLE_TONES } from "@/widgets/floor-plan-canvas";
import { useI18n } from "@/app/providers/i18n-provider";
import { seatsLabel } from "../_shared/labels";
import type { LiveEntry } from "../_shared/use-floor-plan";

function Row({ icon, label, value, color }: { icon: ReactNode; label: string; value: ReactNode; color?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-[5px] text-[14px]">
      <span className="flex items-center gap-2 text-[var(--octo-text-secondary)]">
        <span className="text-[var(--octo-text-muted)]">{icon}</span>
        {label}
      </span>
      <span className="truncate text-end font-medium text-[var(--octo-text-primary)]" style={color ? { color } : undefined}>
        {value}
      </span>
    </div>
  );
}

export function TableDetailCard({
  entry,
  zoneName,
  now,
  onEdit,
}: {
  entry: LiveEntry | null;
  zoneName?: string;
  now: number;
  onEdit?: () => void;
}) {
  const { t } = useI18n();

  if (!entry) {
    return (
      <section className="flex flex-col items-center gap-2 rounded-[20px] border border-dashed border-[var(--octo-border-input)] bg-[var(--octo-card)] px-5 py-8 text-center">
        <MousePointerClick size={26} className="text-[var(--octo-text-faint)]" />
        <p className="text-[14px] font-medium text-[var(--octo-text-primary)]">{t("floorPlan.live.detail.emptyTitle")}</p>
        <p className="text-[12.5px] text-[var(--octo-text-muted)]">{t("floorPlan.live.detail.emptyBody")}</p>
      </section>
    );
  }

  const { table, state } = entry;
  const minutes = minutesBetween(state, now);
  const timeLabel =
    state.status === "reserved"
      ? t("floorPlan.live.detail.arrivesIn")
      : state.status === "occupied"
        ? t("floorPlan.live.detail.elapsed")
        : state.status === "cleaning"
          ? t("floorPlan.live.detail.cleaningFor")
          : t("floorPlan.live.detail.freeFor");
  const hasGuest = state.status === "occupied" || state.status === "reserved";

  return (
    <section className="rounded-[20px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[17px] font-semibold text-[var(--octo-text-primary)]">
          {t("floorPlan.live.detail.title").replace("{number}", table.number)}
        </h2>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[14px] text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]"
          >
            <PenLine size={16} />
            {t("floorPlan.live.detail.edit")}
          </button>
        )}
      </div>
      <div className="mt-2 divide-y divide-transparent">
        <Row
          icon={<CircleDot size={16} />}
          label={t("floorPlan.live.detail.status")}
          value={t(`floorPlan.status.${state.status}.summary`)}
          color={TABLE_TONES[state.status].dot}
        />
        {state.status !== "blocked" && <Row icon={<Clock3 size={16} />} label={timeLabel} value={formatDuration(minutes)} />}
        {hasGuest && <Row icon={<Users size={16} />} label={t("floorPlan.live.detail.guests")} value={`${state.guests} / ${table.seats}`} />}
        {hasGuest && state.guestName && <Row icon={<User size={16} />} label={t("floorPlan.live.detail.guestName")} value={state.guestName} />}
        {state.status === "occupied" && state.orderId && (
          <Row icon={<ClipboardList size={16} />} label={t("floorPlan.live.detail.orderId")} value={<span dir="ltr">{state.orderId}</span>} />
        )}
        {state.server && state.status !== "blocked" && (
          <Row icon={<UserRound size={16} />} label={t("floorPlan.live.detail.server")} value={state.server} />
        )}
        {!hasGuest && <Row icon={<Users size={16} />} label={t("floorPlan.live.detail.capacity")} value={seatsLabel(table.seats, t)} />}
        {zoneName && <Row icon={<MapPin size={16} />} label={t("floorPlan.live.detail.zone")} value={zoneName} />}
        {(state.note || table.note) && (
          <Row
            icon={<NotebookPen size={16} />}
            label={state.status === "blocked" ? t("floorPlan.live.detail.reason") : t("floorPlan.live.detail.note")}
            value={state.note || table.note}
          />
        )}
      </div>
    </section>
  );
}
