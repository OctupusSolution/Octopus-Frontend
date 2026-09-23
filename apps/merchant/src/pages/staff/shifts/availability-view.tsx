import { useEffect, useMemo, useState } from "react";
import { CalendarDays, UserRound } from "lucide-react";
import clsx from "clsx";
import { getStaffAvailability, type AvailabilityRowResponse } from "@octopus/api-client";
import { Modal } from "@ui/primitives";
import { TODAY } from "@/shared/api/mock-staff";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { Avatar } from "../_shared/avatar";
import { buttonClass } from "../_shared/buttons";
import { addDays, formatWeekRange, formatWeekdayDate, fromISO, startOfWeek, toISO } from "../_shared/format";
import { useStaffLabels } from "../_shared/labels";
import { useCatalogNames } from "../_shared/catalog-names";
import { useStaffStore } from "../_shared/staff-store";
import { StatusPill, type PillTone } from "../_shared/status-pill";
import { approvedLeaveOn, rangeLabel, shiftKey } from "./schedule-utils";

type AvailabilityStatus = "available" | "unavailable" | "onLeave";
const STATUS_TONE: Record<AvailabilityStatus, PillTone> = { available: "success", unavailable: "neutral", onLeave: "warning" };

export function AvailabilityView({
  onViewProfile,
  onOpenSchedule,
}: {
  onViewProfile: (employeeId: string) => void;
  onOpenSchedule: () => void;
}) {
  const { t, locale } = useI18n();
  const { activeBusinessId } = useAuth();
  const labels = useStaffLabels();
  const names = useCatalogNames();
  const store = useStaffStore();
  const [shiftFor, setShiftFor] = useState<string | null>(null);

  // The local `store.availability` toggle has no server field behind it
  // (BACKEND_GAPS 6.5: GET /availability is read-only and was never called).
  // This fetches the real thing for today and lets it stand in wherever it
  // has an answer, falling back to the local guess only where it doesn't.
  const [serverAvailability, setServerAvailability] = useState<Map<string, AvailabilityRowResponse> | null>(null);
  useEffect(() => {
    if (!activeBusinessId) return;
    let cancelled = false;
    getStaffAvailability(activeBusinessId, { date: TODAY, pageSize: 200 })
      .then((res) => {
        if (!cancelled) setServerAvailability(new Map(res.data.map((row) => [row.staffMemberId, row])));
      })
      .catch(() => {
        if (!cancelled) setServerAvailability(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeBusinessId]);

  const isTimeOfDay = (s: string) => /^\d{1,2}:\d{2}/.test(s);

  const today = fromISO(TODAY);
  const week = useMemo(() => {
    const monday = startOfWeek(fromISO(TODAY));
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, []);

  const staff = store.employees.filter((e) => e.role !== "Owner" && !store.isInactive(e.id));

  const statusOf = (employeeId: string): AvailabilityStatus => {
    const row = serverAvailability?.get(employeeId);
    if (row) {
      if (row.timeOffTypeNameEn || row.timeOffTypeNameAr) return "onLeave";
      return row.status === "Available" ? "available" : "unavailable";
    }
    if (approvedLeaveOn(store.leaveRequests, employeeId, TODAY)) return "onLeave";
    if (store.availability[employeeId]?.[today.getDay()] === false) return "unavailable";
    return "available";
  };

  const dayLabel = (employeeId: string, date: Date) => {
    // The server row is only ever for TODAY (the fetch above is a single
    // date), so it only stands in on that column — other days in the week
    // dialog keep reading the local schedule.
    const row = toISO(date) === TODAY ? serverAvailability?.get(employeeId) : undefined;
    if (row?.shiftStart && row.shiftEnd && isTimeOfDay(row.shiftStart) && isTimeOfDay(row.shiftEnd)) {
      return rangeLabel(row.shiftStart, row.shiftEnd, locale);
    }
    const key = shiftKey(employeeId, date);
    const cell = store.shifts[key];
    if (cell) return rangeLabel(cell.start, cell.end, locale);
    if (store.offDays[key]) return t("staff.shiftsTab.dayOff");
    return t("staff.availability.notScheduled");
  };

  const viewing = shiftFor ? store.employees.find((e) => e.id === shiftFor) ?? null : null;

  return (
    <div>
      <div className="octo-scroll overflow-x-auto rounded-[16px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
        <table className="w-full min-w-[980px] border-collapse text-[15px]">
          <thead>
            <tr className="bg-[var(--octo-hover)]">
              {(["employee", "shift", "status", "location", "actions"] as const).map((col) => (
                <th
                  key={col}
                  scope="col"
                  className={clsx(
                    "whitespace-nowrap px-3 py-2 text-[13px] font-medium text-[var(--octo-text-primary)] first:rounded-s-[6px] last:rounded-e-[6px]",
                    col === "employee" ? "text-start ps-16" : col === "actions" ? "text-end pe-8" : "text-center"
                  )}
                >
                  {t(`staff.availability.column.${col}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staff.map((e) => {
              const status = statusOf(e.id);
              return (
                <tr key={e.id} className="border-b border-[var(--octo-divider)] last:border-b-0">
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-3">
                      <Avatar name={e.name} size={44} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-[var(--octo-text-primary)]">{e.name}</span>
                        <span className="block truncate text-[13px] text-[#0D6EFD]">
                          {names.jobTitle(store.profileOf(e.id)?.jobTitle ?? "")}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-center text-[var(--octo-text-primary)]">{dayLabel(e.id, today)}</td>
                  <td className="px-3 py-3 text-center">
                    <StatusPill tone={STATUS_TONE[status]} label={t(`staff.availability.status.${status}`)} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-center text-[var(--octo-text-primary)]">{e.branch}</td>
                  <td className="px-3 py-3">
                    <span className="flex items-center justify-end gap-3">
                      <button type="button" onClick={() => onViewProfile(e.id)} className={buttonClass("infoSoft", "md", "font-medium")}>
                        <UserRound size={20} aria-hidden />
                        {t("staff.availability.viewProfile")}
                      </button>
                      <button type="button" onClick={() => setShiftFor(e.id)} className={buttonClass("secondary", "md", "font-medium")}>
                        <CalendarDays size={20} aria-hidden />
                        {t("staff.availability.viewShift")}
                      </button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        open={Boolean(viewing)}
        onClose={() => setShiftFor(null)}
        title={viewing ? t("staff.availability.weekOf").replace("{name}", viewing.name) : ""}
        className="max-w-lg"
        footer={
          <>
            <button type="button" onClick={() => setShiftFor(null)} className={buttonClass("secondary")}>{t("staff.availability.close")}</button>
            <button
              type="button"
              onClick={() => {
                setShiftFor(null);
                onOpenSchedule();
              }}
              className={buttonClass("primary")}
            >
              {t("staff.availability.openSchedule")}
            </button>
          </>
        }
      >
        {viewing && (
          <>
            <p className="-mt-1 text-[13px] text-[var(--octo-text-secondary)]">{formatWeekRange(week[0], locale)}</p>
            <ul className="mt-3 divide-y divide-[var(--octo-divider)] rounded-[12px] border border-[var(--octo-border-card)]">
              {week.map((d) => {
                const key = shiftKey(viewing.id, d);
                const leave = approvedLeaveOn(store.leaveRequests, viewing.id, toISO(d));
                return (
                  <li key={key} className={clsx("flex items-center justify-between gap-3 px-3 py-2.5 text-[14px]", toISO(d) === TODAY && "bg-[var(--octo-selected)]")}>
                    <span className="font-medium text-[var(--octo-text-primary)]">{formatWeekdayDate(d, locale)}</span>
                    <span className={clsx(store.shifts[key] ? "text-[var(--octo-text-primary)]" : "text-[var(--octo-text-secondary)]")}>
                      {leave ? t("staff.availability.status.onLeave") : dayLabel(viewing.id, d)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Modal>
    </div>
  );
}
