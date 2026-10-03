import { useEffect, useState } from "react";
import { type LucideIcon, ArrowUp, Armchair, CircleX, History, Pencil, Phone, Send, UserPlus, X } from "lucide-react";
import type { WaitingActivityResponse } from "@octopus/api-client";
import { Modal } from "@ui/primitives";
import { fullName, waitedMinutes, type HistoryType, type WaitlistEntry } from "@/entities/waitlist-entry";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { ChannelGlyph } from "./_shared/glyphs";
import { CHANNEL_KEY, HISTORY_KEY, SOURCE_KEY, fill } from "./_shared/labels";
import { loadActivity } from "./_shared/waitlist-api";
import { StatusPill } from "./waitlist-table";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The API's own action vocabulary isn't documented, so it's shown as-is
 *  (spaced out) rather than forced into the five local HistoryType icons,
 *  which were named for the seed fixture's events, not the server's. */
function humanizeAction(action: string): string {
  return action.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
}

const ICON: Record<HistoryType, { icon: LucideIcon; color: string }> = {
  joined: { icon: UserPlus, color: "#0D6EFD" },
  edited: { icon: Pencil, color: "#64748B" },
  notified: { icon: Send, color: "#D97706" },
  called: { icon: Phone, color: "#0D6EFD" },
  movedUp: { icon: ArrowUp, color: "#7C3AED" },
  seated: { icon: Armchair, color: "#009A39" },
  left: { icon: CircleX, color: "#DC2626" },
};

export function HistoryModal({ entry, now, onClose }: { entry: WaitlistEntry | null; now: number; onClose: () => void }) {
  const { t, locale } = useI18n();
  const { activeBusinessId } = useAuth();
  const [serverActivity, setServerActivity] = useState<WaitingActivityResponse[] | null>(null);

  useEffect(() => {
    setServerActivity(null);
    if (!entry || !activeBusinessId || !UUID.test(entry.id)) return;
    let cancelled = false;
    loadActivity(activeBusinessId, entry.id)
      .then((rows) => {
        if (!cancelled) setServerActivity(rows);
      })
      .catch(() => {
        if (!cancelled) setServerActivity([]);
      });
    return () => {
      cancelled = true;
    };
  }, [entry, activeBusinessId]);

  if (!entry) return null;

  const time = (at: number) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short", hour12: false, numberingSystem: "latn" }).format(at);

  const detail = (type: HistoryType, value?: string) => {
    if (type === "notified" && value) return t(CHANNEL_KEY[value as keyof typeof CHANNEL_KEY] ?? "");
    if (type === "seated" && value) return fill(t("waitlist.history.atTable"), { table: value });
    if (type === "movedUp" && value) return fill(t("waitlist.history.toPosition"), { n: value });
    return "";
  };

  return (
    <Modal open onClose={onClose} className="!max-w-[480px] !rounded-2xl !p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--octo-tone-info-bg)] text-[var(--octo-tone-info-text)]">
            <History size={20} />
          </span>
          <div>
            <h2 className="text-[17px] font-semibold text-[var(--octo-text-primary)]">{t("waitlist.history.title")}</h2>
            <p className="text-[13px] text-[var(--octo-text-muted)]">{fullName(entry)}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label={t("waitlist.form.cancel")} className="grid h-8 w-8 place-items-center rounded-lg text-[var(--octo-text-muted)] hover:bg-[var(--octo-hover)]">
          <X size={16} />
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-[var(--octo-track)] p-3 text-[13px]">
        <div>
          <dt className="text-[var(--octo-text-muted)]">{t("waitlist.table.status")}</dt>
          <dd className="mt-1"><StatusPill entry={entry} /></dd>
        </div>
        <div>
          <dt className="text-[var(--octo-text-muted)]">{t("waitlist.seat.waitingTime")}</dt>
          <dd className="mt-1 font-medium text-[var(--octo-text-primary)]">{waitedMinutes(entry, now)} {t("waitlist.min")}</dd>
        </div>
        <div>
          <dt className="text-[var(--octo-text-muted)]">{t("waitlist.form.phone")}</dt>
          <dd className="mt-1 inline-flex items-center gap-1.5 font-medium text-[var(--octo-text-primary)]">
            <ChannelGlyph channel={entry.channel} size={14} />
            <span dir="ltr">{entry.phone}</span>
          </dd>
        </div>
        <div>
          <dt className="text-[var(--octo-text-muted)]">{t("waitlist.form.source")}</dt>
          <dd className="mt-1 font-medium text-[var(--octo-text-primary)]">{t(SOURCE_KEY[entry.source])} · {entry.partySize} {t("waitlist.seat.guests")}</dd>
        </div>
        {entry.note && (
          <div className="col-span-2">
            <dt className="text-[var(--octo-text-muted)]">{t("waitlist.form.note")}</dt>
            <dd className="mt-1 text-[var(--octo-text-primary)]">{entry.note}</dd>
          </div>
        )}
      </dl>

      {serverActivity && serverActivity.length > 0 ? (
        <ol className="octo-scroll mt-5 max-h-[320px] overflow-y-auto">
          {serverActivity.map((event, index, list) => (
            <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
              {index < list.length - 1 && <span className="absolute start-[15px] top-8 h-[calc(100%-32px)] w-px bg-[var(--octo-border-card)]" />}
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ color: "#64748B", backgroundColor: "color-mix(in srgb, #64748B 12%, var(--octo-card))" }}>
                <History size={15} />
              </span>
              <div className="min-w-0 pt-1">
                <p className="text-[13.5px] font-medium capitalize text-[var(--octo-text-primary)]">
                  {humanizeAction(event.action)}
                  {event.actorDisplay && <span className="font-normal text-[var(--octo-text-secondary)]"> · {event.actorDisplay}</span>}
                </p>
                <p className="text-[12px] text-[var(--octo-text-muted)]">{time(Date.parse(event.occurredAtUtc))}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <ol className="octo-scroll mt-5 max-h-[320px] overflow-y-auto">
          {[...entry.history].reverse().map((event, index, list) => {
            const { icon: Icon, color } = ICON[event.type];
            const extra = detail(event.type, event.detail);
            return (
              <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
                {index < list.length - 1 && <span className="absolute start-[15px] top-8 h-[calc(100%-32px)] w-px bg-[var(--octo-border-card)]" />}
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, var(--octo-card))` }}>
                  <Icon size={15} />
                </span>
                <div className="min-w-0 pt-1">
                  <p className="text-[13.5px] font-medium text-[var(--octo-text-primary)]">
                    {t(HISTORY_KEY[event.type])}
                    {extra && <span className="font-normal text-[var(--octo-text-secondary)]"> · {extra}</span>}
                  </p>
                  <p className="text-[12px] text-[var(--octo-text-muted)]">{time(event.at)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Modal>
  );
}
