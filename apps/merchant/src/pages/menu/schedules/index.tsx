import { useMemo, useState } from "react";
import { AlertTriangle, Clock3, Moon } from "lucide-react";
import { Badge, Select, Tabs } from "@ui/primitives";
import {
  dayParts as initialDayParts,
  ramadanProfile as initialRamadanProfile,
  specialDays,
  type DayPart,
  type SpecialDayStatus,
} from "@/shared/api/mock-menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { labelKey } from "@/shared/lib/labels";

const WEEKDAY_SHORT_KEYS = [
  "menu.schedules.dayShort.sun", "menu.schedules.dayShort.mon", "menu.schedules.dayShort.tue", "menu.schedules.dayShort.wed",
  "menu.schedules.dayShort.thu", "menu.schedules.dayShort.fri", "menu.schedules.dayShort.sat",
];
const WEEKDAY_KEYS = [
  "menu.schedules.day.sun", "menu.schedules.day.mon", "menu.schedules.day.tue", "menu.schedules.day.wed",
  "menu.schedules.day.thu", "menu.schedules.day.fri", "menu.schedules.day.sat",
];

const DAY_PART_COLOR: Record<string, string> = {
  "dp-breakfast": "#a78bfa",
  "dp-lunch": "#60a5fa",
  "dp-dinner": "#2ec9c0",
  "dp-late-night": "#8b7cf0",
};

const SPECIAL_STATUS_TONE: Record<SpecialDayStatus, "success" | "warning" | "neutral"> = {
  Active: "success",
  Scheduled: "warning",
  Expired: "neutral",
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

interface Interval {
  id: string;
  start: number;
  end: number;
}

function daypartIntervals(parts: readonly DayPart[]): Interval[] {
  const out: Interval[] = [];
  for (const p of parts) {
    const s = toMinutes(p.startTime);
    const e = toMinutes(p.endTime);
    if (e > s) {
      out.push({ id: p.id, start: s, end: e });
    } else {
      // crosses midnight — split into two segments
      out.push({ id: p.id, start: s, end: 1440 });
      out.push({ id: p.id, start: 0, end: e });
    }
  }
  return out;
}

function findGaps(intervals: Interval[]): { start: number; end: number }[] {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const gaps: { start: number; end: number }[] = [];
  let cursor = 0;
  for (const iv of sorted) {
    if (iv.start > cursor) gaps.push({ start: cursor, end: iv.start });
    cursor = Math.max(cursor, iv.end);
  }
  if (cursor < 1440) gaps.push({ start: cursor, end: 1440 });
  return gaps;
}

function findOverlaps(intervals: Interval[]): { start: number; end: number }[] {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const overlaps: { start: number; end: number }[] = [];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start < sorted[i - 1].end) {
      overlaps.push({ start: sorted[i].start, end: Math.min(sorted[i].end, sorted[i - 1].end) });
    }
  }
  return overlaps;
}

function fmtClock(min: number, am: string, pm: string): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const period = h >= 12 ? pm : am;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-[20px] w-9 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-[#0D6EFD]" : "bg-[var(--octo-switch-off)]"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-[var(--octo-card)] shadow transition-transform ${
          checked ? "translate-x-[17px] rtl:-translate-x-[17px]" : "translate-x-[2px] rtl:-translate-x-[2px]"
        }`}
      />
    </button>
  );
}

export function MenuSchedulesPage() {
  const { t } = useI18n();
  const fmt = (min: number) => fmtClock(min, t("time.am"), t("time.pm"));
  const [tab, setTab] = useState<"day-parts" | "ramadan" | "special-days">("day-parts");
  const [parts, setParts] = useState<DayPart[]>(initialDayParts as unknown as DayPart[]);
  const [ramadan, setRamadan] = useState(initialRamadanProfile);

  const intervals = useMemo(() => daypartIntervals(parts), [parts]);
  const gaps = useMemo(() => findGaps(intervals).filter((g) => g.end - g.start > 0), [intervals]);
  const overlaps = useMemo(() => findOverlaps(intervals), [intervals]);

  function toggleDay(partId: string, dayIndex: number) {
    setParts((prev) =>
      prev.map((p) =>
        p.id === partId ? { ...p, activeDays: p.activeDays.map((v, i) => (i === dayIndex ? !v : v)) } : p
      )
    );
  }

  function updateTime(partId: string, field: "startTime" | "endTime", value: string) {
    setParts((prev) => prev.map((p) => (p.id === partId ? { ...p, [field]: value } : p)));
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("menu.schedules.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">{t("menu.schedules.subtitle")}</p>
        </div>
      </header>

      <div className="mt-4">
        <Tabs
          value={tab}
          onChange={(id) => setTab(id as typeof tab)}
          items={[
            { id: "day-parts", label: t("menu.schedules.tab.dayParts") },
            { id: "ramadan", label: t("menu.schedules.tab.ramadan") },
            { id: "special-days", label: t("menu.schedules.tab.specialDays") },
          ]}
        />
      </div>

      {tab === "day-parts" && (
        <div className="mt-4 flex flex-col gap-3">
          <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
            <div className="flex items-center gap-2">
              <Clock3 size={15} className="text-[var(--octo-text-muted)]" />
              <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("menu.schedules.coverage")}</h2>
            </div>

            <div className="relative mt-3 h-8 overflow-hidden rounded-[8px] bg-[var(--octo-track)]">
              {intervals.map((iv, i) => (
                <div
                  key={`${iv.id}-${i}`}
                  className="absolute top-0 h-full"
                  style={{
                    left: `${(iv.start / 1440) * 100}%`,
                    width: `${((iv.end - iv.start) / 1440) * 100}%`,
                    backgroundColor: DAY_PART_COLOR[iv.id] ?? "#a9a9b2",
                    opacity: 0.85,
                  }}
                />
              ))}
              {overlaps.map((ov, i) => (
                <div
                  key={`ov-${i}`}
                  className="absolute top-0 h-full bg-[repeating-linear-gradient(45deg,rgba(239,68,68,0.5)_0,rgba(239,68,68,0.5)_3px,transparent_3px,transparent_6px)]"
                  style={{ left: `${(ov.start / 1440) * 100}%`, width: `${((ov.end - ov.start) / 1440) * 100}%` }}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-[var(--octo-text-faint)]">
              <span>{fmt(0)}</span>
              <span>{fmt(360)}</span>
              <span>{fmt(720)}</span>
              <span>{fmt(1080)}</span>
              <span>{fmt(1440)}</span>
            </div>

            <div className="mt-3 flex flex-wrap gap-3">
              {parts.map((p) => (
                <span key={p.id} className="flex items-center gap-1.5 text-[11px] text-[var(--octo-text-secondary)]">
                  <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: DAY_PART_COLOR[p.id] }} />
                  {t(labelKey(p.nameEn))}
                </span>
              ))}
            </div>

            {(gaps.length > 0 || overlaps.length > 0) && (
              <div className="mt-3 flex flex-col gap-1.5">
                {gaps.map((g, i) => (
                  <div key={`g-${i}`} className="flex items-center gap-1.5 text-[11.5px] text-[#c2660a]">
                    <AlertTriangle size={12} />
                    {t("menu.schedules.gap")
                      .replace("{start}", fmt(g.start))
                      .replace("{end}", fmt(g.end))}
                  </div>
                ))}
                {overlaps.map((o, i) => (
                  <div key={`o-${i}`} className="flex items-center gap-1.5 text-[11.5px] text-[#dc2626]">
                    <AlertTriangle size={12} />
                    {t("menu.schedules.overlap")
                      .replace("{start}", fmt(o.start))
                      .replace("{end}", fmt(o.end))}
                  </div>
                ))}
              </div>
            )}
          </section>

          {parts.map((part) => (
            <section key={part.id} className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t(labelKey(part.nameEn))}</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1.5 text-[11px] text-[var(--octo-text-muted)]">
                    {t("menu.schedules.start")}
                    <input
                      type="time"
                      value={part.startTime}
                      onChange={(e) => updateTime(part.id, "startTime", e.target.value)}
                      className="rounded-[7px] border border-[var(--octo-border-input)] px-2 py-1 text-[12px]"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-[var(--octo-text-muted)]">
                    {t("menu.schedules.end")}
                    <input
                      type="time"
                      value={part.endTime}
                      onChange={(e) => updateTime(part.id, "endTime", e.target.value)}
                      className="rounded-[7px] border border-[var(--octo-border-input)] px-2 py-1 text-[12px]"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="flex gap-1">
                  {part.activeDays.map((active, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(part.id, i)}
                      aria-pressed={active}
                      aria-label={t(WEEKDAY_KEYS[i])}
                      className={`grid h-6 w-6 place-items-center rounded-full text-[10.5px] font-semibold transition-colors ${
                        active ? "bg-[#0D6EFD] text-white" : "bg-[var(--octo-track)] text-[var(--octo-text-faint)]"
                      }`}
                    >
                      {t(WEEKDAY_SHORT_KEYS[i])}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {part.attachedMenus.map((menu) => (
                    <span key={menu} className="rounded-full bg-[var(--octo-track)] px-2 py-0.5 text-[11px] text-[var(--octo-text-secondary)]">
                      {t(labelKey(menu))}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      {tab === "ramadan" && (
        <div className="mt-4 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[#6C4DFF]/10 text-[#6C4DFF]">
                <Moon size={16} />
              </div>
              <div>
                <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("menu.schedules.ramadan.title")}</h2>
                <p className="text-[11.5px] text-[var(--octo-text-muted)]">{ramadan.hijriRangeLabel}</p>
              </div>
            </div>
            <Switch
              checked={ramadan.ramadanModeEnabled}
              onChange={() => setRamadan((r) => ({ ...r, ramadanModeEnabled: !r.ramadanModeEnabled }))}
              label={t("menu.schedules.ramadan.modeToggle")}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-[9px] border border-[var(--octo-divider)] px-3 py-2.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                {t("menu.schedules.ramadan.iftarTime")}
              </p>
              <p className="mt-0.5 text-[14px] font-semibold text-[var(--octo-text-primary)]">{ramadan.iftarTime}</p>
              <p className="text-[10.5px] text-[var(--octo-text-faint)]">{t("menu.schedules.ramadan.autoMaghrib")}</p>
            </div>
            <div className="rounded-[9px] border border-[var(--octo-divider)] px-3 py-2.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                {t("menu.schedules.ramadan.suhoorWindow")}
              </p>
              <p className="mt-0.5 text-[14px] font-semibold text-[var(--octo-text-primary)]">{ramadan.suhoorWindow}</p>
            </div>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                {t("menu.schedules.ramadan.menu")}
              </span>
              <Select value={ramadan.ramadanMenu} onChange={(e) => setRamadan((r) => ({ ...r, ramadanMenu: e.target.value }))}>
                <option value="Ramadan Buffet Menu">{t("menu.schedules.ramadan.menuOption")}</option>
                <option value="Standard Menu">{t("menu.schedules.ramadan.standardMenuOption")}</option>
              </Select>
            </label>
          </div>

          <p className="mt-4 rounded-[9px] bg-[#6C4DFF]/10 px-3 py-2.5 text-[11.5px] text-[#6C4DFF]">
            {t("menu.schedules.ramadan.overrideNote")}
          </p>
        </div>
      )}

      {tab === "special-days" && (
        <div className="mt-4 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
          <div className="octo-scroll overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-[var(--octo-divider)] text-start">
                  <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                    {t("menu.schedules.col.date")}
                  </th>
                  <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                    {t("menu.schedules.col.occasion")}
                  </th>
                  <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                    {t("menu.schedules.col.override")}
                  </th>
                  <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                    {t("menu.schedules.col.status")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {specialDays.map((d) => (
                  <tr key={d.id} className="border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]">
                    <td className="whitespace-nowrap px-2 py-2.5">
                      <div className="font-medium text-[var(--octo-text-primary)]">{d.dateGregorian}</div>
                      <div className="text-[11px] text-[var(--octo-text-faint)]">{d.dateHijri}</div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-primary)]">{t(labelKey(d.occasionEn))}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{t(labelKey(d.overrideApplied))}</td>
                    <td className="whitespace-nowrap px-2 py-2.5">
                      <Badge tone={SPECIAL_STATUS_TONE[d.status]}>{t(labelKey(d.status))}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
