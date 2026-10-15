// Small pieces shared by the Table QR Codes page and its Generate flow.
import { useMemo, type ReactNode } from "react";
import clsx from "clsx";
import { zoneForTable, type FloorPlanDoc, type FloorTable } from "@/entities/floor-plan";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { useI18n } from "@/app/providers/i18n-provider";
import { BORDER_200, SURFACE_WHITE, TEXT_SECONDARY } from "../../_shared/theme";

export function formatDate(ms: number | null, locale: string, withTime = false): string {
  if (!ms) return "—";
  const date = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(ms);
  if (!withTime) return date;
  return `${date} - ${new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(ms)}`;
}

/** The zone picker above the plan (Figma 2012:185347). "" means every zone. */
export function ZoneSelect({ doc, value, onChange }: { doc: FloorPlanDoc; value: string; onChange: (zoneId: string) => void }) {
  const { t } = useI18n();
  return (
    <label className={clsx("relative flex h-10 min-w-0 flex-1 items-center rounded-[12px] border", BORDER_200, SURFACE_WHITE)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={clsx("h-full w-full cursor-pointer appearance-none bg-transparent pe-12 ps-4 text-[14px] font-medium leading-[14px] outline-none", TEXT_SECONDARY)}
      >
        <option value="">{doc.name || t("floorPlan.qr.allZones")}</option>
        {doc.zones.map((z) => (
          <option key={z.id} value={z.id}>
            {z.name}
          </option>
        ))}
      </select>
      <ShellIcon name="fp-qr-arrow-down.svg" size={24} className={clsx("pointer-events-none absolute end-4", TEXT_SECONDARY)} />
    </label>
  );
}

/** Tables outside the chosen zone, drawn faded. */
export function useZoneDimmed(doc: FloorPlanDoc, zoneId: string): ReadonlySet<string> {
  return useMemo(() => {
    if (!zoneId) return new Set<string>();
    return new Set(doc.tables.filter((t) => zoneForTable(doc, t)?.id !== zoneId).map((t) => t.id));
  }, [doc, zoneId]);
}

export function tableMeta(doc: FloorPlanDoc, table: FloorTable, t: (k: string) => string): string {
  const zone = zoneForTable(doc, table)?.name ?? doc.name;
  return `${zone} - ${t("floorPlan.qr.seats").replace("{n}", String(table.seats))}`;
}

export function DetailRow({ label, children, valueClassName }: { label: string; children: ReactNode; valueClassName?: string }) {
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <span className={clsx("text-[12px] leading-[12px]", TEXT_SECONDARY)}>{label}</span>
      <span className={clsx("text-end text-[14px] leading-[14px]", valueClassName ?? "text-[#0f172a] [[data-theme=dark]_&]:text-[var(--octo-text-primary)]")} dir="auto">
        {children}
      </span>
    </div>
  );
}

export function DetailBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex w-full flex-col gap-2 rounded-[8px] border border-[#cbd5e1] px-2 py-3 font-medium [[data-theme=dark]_&]:border-[var(--octo-border-input)]">
      <h3 className="text-[14px] leading-[14px] text-[#0f172a] [[data-theme=dark]_&]:text-[var(--octo-text-primary)]">{title}</h3>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

/** Tables in the order a person reads them: by number, numerically where possible. */
export function byNumber(a: FloorTable, b: FloorTable): number {
  return a.number.localeCompare(b.number, undefined, { numeric: true });
}
