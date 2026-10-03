// One menu card in the library grid. Counts and channel chips are derived from
// the menu, never stored alongside it.
import clsx from "clsx";
import { entryCount, sectionCount, type ChannelState, type Menu, type MenuStatus } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { menuAsset } from "@/shared/lib/menu-assets";
import { KebabButton, StatusPill } from "../_shared/controls";
import { MenuIcon } from "../_shared/menu-icon";
import { LINE, TEXT, type PillTone } from "../_shared/theme";

export type CardAction =
  | "edit" | "schedule" | "hold" | "resume" | "duplicate" | "archive" | "delete" | "versions" | "accessCode" | "bulkPrice" | "unpublish";

export const STATUS_TONE: Record<MenuStatus, PillTone> = {
  active: "green",
  scheduled: "amber",
  "on-hold": "red",
  expired: "slate",
  pending: "orange",
  archived: "violet",
};

const CHANNEL_TONE: Record<ChannelState, PillTone> = {
  live: "green",
  scheduled: "amber",
  "on-hold": "red",
  expired: "slate",
  pending: "orange",
  archived: "violet",
  off: "slate",
};

const COVER = menuAsset("menu-cover.jpg");

/** The cover every menu shares until it has its own: the frame's dark-green
 *  "MENU" artwork, cropped the way the frame crops it. Decorative. */
export function MenuCover({ className }: { className?: string }) {
  return (
    <div aria-hidden className={clsx("relative shrink-0 overflow-hidden rounded-[4px]", className)}>
      <img src={COVER} alt="" className="absolute start-0 top-[-23.38%] h-[136.13%] w-full max-w-none object-cover" />
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
    <article
      className={clsx(
        "flex flex-col gap-2 rounded-[16px] border bg-[var(--octo-card)] p-3 shadow-[0px_0px_8px_0px_rgba(0,0,0,0.08)]",
        LINE,
        TEXT
      )}
    >
      <div className={clsx("flex items-center gap-2 border-b pb-2", LINE)}>
        <MenuCover className="h-[86px] w-[81px]" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-[16px] font-semibold leading-4 text-black [[data-theme=dark]_&]:text-[var(--octo-text-primary)]">
              {menu.name}
            </h3>
            <StatusPill tone={STATUS_TONE[menu.status]}>{t(`menuLib.status.${menu.status}`)}</StatusPill>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] leading-3">
            <span className="inline-flex items-center gap-1">
              <MenuIcon name="menu-segment.svg" size={16} />
              {t("menuLib.sections")} <b className="font-semibold">{sectionCount(menu)}</b>
            </span>
            <span className="inline-flex items-center gap-1">
              <MenuIcon name="menu-food.svg" size={16} />
              {t("menuLib.items")} <b className="font-semibold">{entryCount(menu)}</b>
            </span>
          </div>

          <p className={clsx("inline-flex items-center gap-1 self-start rounded-[4px] border p-2 text-[12px] leading-3", LINE)}>
            <MenuIcon name="menu-completed.svg" size={16} className="text-[#0D6EFD]" />
            {t("menuLib.schedule")} <b className="font-semibold">{t(`menuLib.scheduleType.${menu.schedule.type}`)}</b>
          </p>
        </div>
      </div>

      <p className="text-[14px] leading-[14px]">{t("menuLib.channels")}</p>

      <div className={clsx("flex items-center justify-between gap-2 border-b pb-1", LINE)}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] leading-3">
          {(["pos", "publicLink"] as const).map((channel) => (
            <span key={channel} className="inline-flex items-center gap-2">
              {t(`menuLib.channel.${channel}`)}
              <StatusPill tone={CHANNEL_TONE[menu.channels[channel]]}>
                {t(`menuLib.status.${menu.channels[channel]}`)}
              </StatusPill>
            </span>
          ))}
        </div>
        <KebabButton label={`${menu.name} actions`} onOpen={(anchor) => onOpenActions(menu, anchor)} className="size-6" />
      </div>

      <p className="inline-flex items-center gap-1 text-[10px] leading-[10px]">
        <MenuIcon name="menu-updated.svg" size={16} />
        {t("menuLib.updated")} {updated}
      </p>
    </article>
  );
}
