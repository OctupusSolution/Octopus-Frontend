import { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";
import clsx from "clsx";
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { buttonClass } from "../_shared/buttons";
import { Field, TextInput } from "../_shared/form";
import { formatWeekdayDate, fromISO, shiftDurationHours } from "../_shared/format";
import { useStaffLabels } from "../_shared/labels";
import { CUSTOM_SHIFT, useStaffStore } from "../_shared/staff-store";
import { approvedLeaveOn, rangeLabel, shiftKey } from "./schedule-utils";

export interface ShiftTarget {
  employeeId: string;
  date: string;
}

const OFF = "off";

export function EditShiftModal({
  target,
  onClose,
  notify,
}: {
  target: ShiftTarget | null;
  onClose: () => void;
  notify: (text: string, tone?: "success" | "error") => void;
}) {
  const { t, locale } = useI18n();
  const labels = useStaffLabels();
  const store = useStaffStore();
  const [choice, setChoice] = useState(OFF);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [error, setError] = useState("");

  const employee = target ? store.employees.find((e) => e.id === target.employeeId) ?? null : null;

  useEffect(() => {
    if (!target) return;
    const cell = store.shifts[shiftKey(target.employeeId, target.date)];
    const role = cell && store.shiftRoles.find((r) => r.id === cell.roleId && r.start === cell.start && r.end === cell.end);
    setChoice(cell ? (role ? role.id : CUSTOM_SHIFT) : OFF);
    setStart(cell?.start ?? "09:00");
    setEnd(cell?.end ?? "17:00");
    setError("");
    // Seed the form each time a different cell is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  if (!target || !employee) return null;

  const key = shiftKey(employee.id, target.date);
  const day = fromISO(target.date);
  const unavailable = store.availability[employee.id]?.[day.getDay()] === false;
  const onLeave = approvedLeaveOn(store.leaveRequests, employee.id, target.date);

  const pick = (id: string) => {
    setChoice(id);
    setError("");
    const role = store.shiftRoles.find((r) => r.id === id);
    if (role) {
      setStart(role.start);
      setEnd(role.end);
    }
  };

  const write = (next: "shift" | "off" | "clear") =>
    store.updateSchedule((prev) => {
      const shifts = { ...prev.shifts };
      const offDays = { ...prev.offDays };
      delete shifts[key];
      delete offDays[key];
      if (next === "shift") shifts[key] = { start, end, roleId: choice };
      if (next === "off") offDays[key] = true;
      return { shifts, offDays };
    });

  const save = () => {
    if (choice !== OFF && (!start || !end || start === end)) {
      setError(t("staff.validation.timeRange"));
      return;
    }
    write(choice === OFF ? "off" : "shift");
    notify(t("staff.shiftsTab.toastShiftSaved").replace("{name}", employee.name));
    onClose();
  };

  const options = [
    { id: OFF, title: t("staff.shiftsTab.dayOff"), detail: t("staff.shiftsTab.noShift") },
    ...store.shiftRoles
      .filter((r) => r.active || r.id === choice)
      .map((r) => ({ id: r.id, title: labels.data("staff.shiftRole", r.name), detail: rangeLabel(r.start, r.end, locale) })),
    { id: CUSTOM_SHIFT, title: t("staff.shiftsTab.customTime"), detail: t("staff.shiftsTab.customTimeDetail") },
  ];

  return (
    <Modal
      open
      onClose={onClose}
      title={t("staff.shiftsTab.editShift")}
      className="max-w-lg"
      footer={
        <>
          <button
            type="button"
            onClick={() => {
              write("clear");
              notify(t("staff.shiftsTab.toastShiftCleared").replace("{name}", employee.name));
              onClose();
            }}
            className={buttonClass("ghost", "md", "me-auto text-[var(--octo-tone-danger-text)]")}
          >
            {t("staff.shiftsTab.removeShift")}
          </button>
          <button type="button" onClick={onClose} className={buttonClass("secondary")}>{t("common.cancel")}</button>
          <button type="button" onClick={save} className={buttonClass("primary")}>{t("common.save")}</button>
        </>
      }
    >
      <p className="-mt-1 text-[13px] text-[var(--octo-text-secondary)]">
        {employee.name} · {formatWeekdayDate(day, locale)}
      </p>

      {(unavailable || onLeave) && (
        <p className="mt-3 flex items-start gap-2 rounded-[10px] bg-[var(--octo-tone-warning-bg)] px-3 py-2 text-[13px] text-[var(--octo-tone-warning-text)]">
          <TriangleAlert size={16} aria-hidden className="mt-0.5 shrink-0" />
          {onLeave ? t("staff.shiftsTab.warnOnLeave") : t("staff.shiftsTab.warnUnavailable")}
        </p>
      )}

      <div role="radiogroup" aria-label={t("staff.shiftsTab.editShift")} className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const active = choice === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => pick(o.id)}
              className={clsx(
                "rounded-[10px] border px-3 py-2.5 text-start transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
                active ? "border-[#0D6EFD] bg-[var(--octo-selected)]" : "border-[var(--octo-border-card)] hover:bg-[var(--octo-hover)]"
              )}
            >
              <span className={clsx("block text-[14px] font-medium", active ? "text-[#0D6EFD]" : "text-[var(--octo-text-primary)]")}>{o.title}</span>
              <span className="block text-[12px] text-[var(--octo-text-secondary)]">{o.detail}</span>
            </button>
          );
        })}
      </div>

      {choice !== OFF && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label={t("staff.shiftRoles.startTime")} htmlFor="shift-start" error={error}>
            <TextInput
              id="shift-start"
              type="time"
              value={start}
              invalid={!!error}
              onChange={(e) => {
                setStart(e.target.value);
                setChoice(CUSTOM_SHIFT);
                setError("");
              }}
            />
          </Field>
          <Field label={t("staff.shiftRoles.endTime")} htmlFor="shift-end">
            <TextInput
              id="shift-end"
              type="time"
              value={end}
              onChange={(e) => {
                setEnd(e.target.value);
                setChoice(CUSTOM_SHIFT);
                setError("");
              }}
            />
          </Field>
          {start && end && start !== end && (
            <p className="col-span-2 text-[13px] text-[var(--octo-text-secondary)]">
              {t("staff.shiftsTab.duration").replace("{hours}", String(shiftDurationHours(start, end)))}
              {end < start ? ` · ${t("staff.shiftsTab.overnight")}` : ""}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
