// One menu card in the library grid. Counts and channel chips are derived from
// the menu, never stored alongside it.
import { CheckCircle2, ListTree, MoreVertical, Settings, UtensilsCrossed } from "lucide-react";
import clsx from "clsx";
import { Badge } from "@ui/primitives";
import { entryCount, sectionCount, type ChannelState, type Menu, type MenuStatus } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";

export type CardAction =
  | "edit" | "schedule" | "hold" | "resume" | "duplicate" | "archive" | "delete";

export const STATUS_TONE: Record<MenuStatus, "success" | "warning" | "error" | "info" | "neutral"> = {
  active: "success",
  scheduled: "warning",
  "on-hold": "error",
  expired: "neutral",
  pending: "warning",
  archived: "info",
};

const CHANNEL_TONE: Record<ChannelState, "success" | "warning" | "error" | "info" | "neutral"> = {
  live: "success",
  scheduled: "warning",
  "on-hold": "error",
  expired: "neutral",
  pending: "warning",
  archived: "info",
  off: "neutral",
};

/** The placeholder cover every menu shares until it has its own. Decorative,
 *  and drawn rather than imported: an image would be the same bytes nine
 *  times over. */
export function MenuCover({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={clsx(
        "grid shrink-0 place-items-center rounded-[10px] bg-[radial-gradient(circle_at_30%_25%,#1f5a45,#0d2b21_70%)] leading-none",
        className
      )}
    >
      <span className="text-center font-serif tracking-[0.12em] text-white/75">
        ME
        <br />
        NU
      </span>
    </div>
  );
}

export function MenuCard({
  menu,
  onOpenActions,
}: {
  menu: Menu;
  onOpenActions: (menu: Menu, anchor: DOMRect) => void;
}) {
  const { t, locale } = useI18n();
  const at = new Date(menu.updatedAt);
  const tag = locale === "ar" ? "ar-SA" : "en-US";
  // The frame writes "May 12, 2026 - 10:30 AM".
  const updated = `${at.toLocaleDateString(tag, { month: "short", day: "numeric", year: "numeric" })} - ${at.toLocaleTimeString(tag, { hour: "numeric", minute: "2-digit" })}`;

  return (
    <article className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
      <div className="flex gap-3">
        <MenuCover className="h-[92px] w-[92px] text-[19px]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-[17px] font-semibold text-[var(--octo-text-primary)]">{menu.name}</h3>
            <Badge tone={STATUS_TONE[menu.status]} className="shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
              {t(`menuLib.status.${menu.status}`)}
            </Badge>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--octo-text-secondary)]">
            <span className="inline-flex items-center gap-1.5">
              <ListTree size={14} aria-hidden />
              {t("menuLib.sections")} <b className="text-[var(--octo-text-primary)]">{sectionCount(menu)}</b>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <UtensilsCrossed size={14} aria-hidden />
              {t("menuLib.items")} <b className="text-[var(--octo-text-primary)]">{entryCount(menu)}</b>
            </span>
          </div>

          <p className="mt-2 inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--octo-border-card)] px-2 py-1 text-[13px] text-[var(--octo-text-secondary)]">
            <CheckCircle2 size={15} fill="var(--octo-accent)" className="text-white" aria-hidden />
            {t("menuLib.schedule")}{" "}
            <b className="text-[var(--octo-text-primary)]">{t(`menuLib.scheduleType.${menu.schedule.type}`)}</b>
          </p>
        </div>
      </div>

      <hr className="my-3 border-[var(--octo-border-card)]" />

      <p className="text-[13px] text-[var(--octo-text-secondary)]">{t("menuLib.channels")}</p>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px]">
          {(["pos", "publicLink"] as const).map((channel) => (
            <span key={channel} className="inline-flex items-center gap-1.5">
              <span className="text-[var(--octo-text-secondary)]">{t(`menuLib.channel.${channel}`)}</span>
              <Badge tone={CHANNEL_TONE[menu.channels[channel]]}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                {t(`menuLib.status.${menu.channels[channel]}`)}
              </Badge>
            </span>
          ))}
        </div>
        <button
          type="button"
          aria-label={`${menu.name} actions`}
          onClick={(e) => onOpenActions(menu, e.currentTarget.getBoundingClientRect())}
          className="shrink-0 rounded-[8px] p-1.5 text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
        >
          <MoreVertical size={18} aria-hidden />
        </button>
      </div>

      <hr className="my-3 border-[var(--octo-border-card)]" />

      <p className="inline-flex items-center gap-1.5 text-[12px] text-[var(--octo-text-secondary)]">
        <Settings size={13} aria-hidden />
        {t("menuLib.updated")} {updated}
      </p>
    </article>
  );
}
