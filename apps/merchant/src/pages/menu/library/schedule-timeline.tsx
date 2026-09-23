// "Next 7 days": when the SAVED schedule actually serves this menu, from
// GET /menus/{id}/availability/timeline — the server resolves windows, date
// ranges and the branch time zone, so this is what customers will get, not a
// re-computation of the form above. One 24-hour bar per day, in that zone.
import { useEffect, useState } from "react";
import type { AvailabilityTimelineResponse } from "@octopus/api-client";
import { describeApiError, servingTimeline } from "@/entities/menu";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { useMenuCopy } from "../copy";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Wall-clock parts of an instant in `timeZone`. */
function zoned(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return { day: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

interface DayRow {
  day: string;
  spans: { from: number; to: number }[];
}

/** Splits the UTC entries into per-day minute spans in the menu's zone. */
function byDay(res: AvailabilityTimelineResponse, days: number): DayRow[] {
  const rows = new Map<string, DayRow>();
  const now = Date.now();
  for (let i = 0; i < days; i++) {
    const d = zoned(now + i * DAY_MS, res.timeZoneId).day;
    rows.set(d, { day: d, spans: [] });
  }
  for (const e of res.entries) {
    let start = Date.parse(e.startsAtUtc);
    const end = Date.parse(e.endsAtUtc);
    // Walk the entry in slices that never cross a local midnight.
    while (start < end) {
      const s = zoned(start, res.timeZoneId);
      const untilMidnight = (24 * 60 - s.minutes) * 60 * 1000;
      const sliceEnd = Math.min(end, start + untilMidnight);
      const endMinutes = sliceEnd === start + untilMidnight ? 24 * 60 : zoned(sliceEnd, res.timeZoneId).minutes;
      rows.get(s.day)?.spans.push({ from: s.minutes, to: endMinutes });
      start = sliceEnd;
    }
  }
  return [...rows.values()];
}

export function ScheduleTimeline({ menuId }: { menuId: string }) {
  const c = useMenuCopy();
  const { locale } = useI18n();
  const { activeBusinessId } = useAuth();
  const [res, setRes] = useState<AvailabilityTimelineResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeBusinessId) return;
    let cancelled = false;
    setRes(null);
    setError(null);
    servingTimeline(activeBusinessId, menuId, 7)
      .then((r) => !cancelled && setRes(r))
      .catch((err) => !cancelled && setError(describeApiError(err)));
    return () => {
      cancelled = true;
    };
  }, [activeBusinessId, menuId]);

  const rows = res ? byDay(res, 7) : [];
  const total = rows.reduce((n, r) => n + r.spans.reduce((m, s) => m + (s.to - s.from), 0), 0);
  const fmtDay = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-GB", { weekday: "short", day: "numeric", month: "short" });
  const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

  return (
    <div className="mt-4 rounded-[10px] border border-[var(--octo-border-card)] p-3">
      <p className="text-[14px] font-medium text-[var(--octo-text-primary)]">{c("schedule.timeline")}</p>
      {error ? (
        <p role="alert" className="mt-2 rounded-[9px] bg-error/10 px-3 py-2 text-[12.5px] text-error">
          {error}
        </p>
      ) : !res ? (
        <p className="mt-2 text-[12.5px] text-[var(--octo-text-muted)]">{c("loading")}</p>
      ) : (
        <>
          <p className="mt-0.5 text-[12px] text-[var(--octo-text-muted)]">
            {c("schedule.timelineHint", { tz: res.timeZoneId })}
          </p>
          {total === 0 ? (
            <p className="mt-2 text-[12.5px] text-[var(--octo-text-secondary)]">{c("schedule.timelineEmpty")}</p>
          ) : total >= 7 * 24 * 60 - 7 ? (
            <p className="mt-2 text-[12.5px] text-[var(--octo-text-secondary)]">{c("schedule.timelineAlways")}</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {rows.map((row) => (
                <li key={row.day} className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-2">
                  <span className="truncate text-[12px] text-[var(--octo-text-secondary)]">{fmtDay(row.day)}</span>
                  <span
                    className="relative block h-[14px] rounded-full bg-[var(--octo-track)]"
                    title={row.spans.map((s) => `${hhmm(s.from)}–${hhmm(s.to)}`).join(", ")}
                  >
                    {row.spans.map((s, i) => (
                      <span
                        key={i}
                        className="absolute inset-y-0 rounded-full bg-[var(--octo-accent)]"
                        style={{ insetInlineStart: `${(s.from / 1440) * 100}%`, width: `${((s.to - s.from) / 1440) * 100}%` }}
                      />
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
