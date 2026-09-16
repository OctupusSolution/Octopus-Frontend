import { useEffect, useMemo, useState } from "react";
import { Modal } from "@ui/primitives";
import type { Employee } from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";
import { buttonClass } from "../_shared/buttons";
import { Field, SelectInput } from "../_shared/form";
import { formatWeekdayDate, fromISO, toISO } from "../_shared/format";
import { useStaffLabels } from "../_shared/labels";
import { MultiSelect } from "../_shared/multi-select";
import { useStaffStore } from "../_shared/staff-store";
import { approvedLeaveOn, rangeLabel, shiftKey } from "./schedule-utils";

export interface AssignPreset {
  employeeIds?: string[];
  dates?: string[];
}

type Errors = { employee?: string; role?: string; day?: string };

/**
 * Assign Shift puts one shift role on one employee for one day; Bulk Assign
 * Shift does the same for any number of employees across any days of the week
 * on screen. Days an employee has approved time off are left alone.
 */
export function AssignShiftModal({
  mode,
  open,
  preset,
  staff,
  days,
  onClose,
  notify,
}: {
  mode: "single" | "bulk";
  open: boolean;
  preset: AssignPreset;
  staff: Employee[];
  days: Date[];
  onClose: () => void;
  notify: (text: string, tone?: "success" | "error") => void;
}) {
  const { t, locale } = useI18n();
  const labels = useStaffLabels();
  const store = useStaffStore();
  const activeRoles = store.shiftRoles.filter((r) => r.active);
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);
  const [roleId, setRoleId] = useState("");
  const [dates, setDates] = useState<string[]>([]);
  const [errors, setErrors] = useState<Errors>({});

  const dayOptions = useMemo(() => days.map((d) => ({ value: toISO(d), label: formatWeekdayDate(d, locale) })), [days, locale]);

  useEffect(() => {
    if (!open) return;
    const firstRole = store.shiftRoles.find((r) => r.active);
    setEmployeeIds(preset.employeeIds ?? []);
    setRoleId(firstRole?.id ?? "");
    // A bulk assignment with no days picked yet starts from the role's own
    // working days, which is what a merchant almost always wants.
    setDates(
      preset.dates ??
        (mode === "bulk" && firstRole ? days.filter((d) => firstRole.days.includes(d.getDay())).map(toISO) : [])
    );
    setErrors({});
    // Seed each time the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = () => {
    const next: Errors = {};
    if (employeeIds.length === 0) next.employee = t("staff.validation.required");
    if (!roleId) next.role = activeRoles.length === 0 ? t("staff.assignShift.noRoles") : t("staff.validation.required");
    if (dates.length === 0) next.day = t("staff.validation.required");
    if (mode === "single" && employeeIds[0] && dates[0] && approvedLeaveOn(store.leaveRequests, employeeIds[0], dates[0])) {
      next.day = t("staff.assignShift.onLeave");
    }
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    const role = store.shiftRoles.find((r) => r.id === roleId)!;
    let assigned = 0;
    let skipped = 0;
    store.updateSchedule((prev) => {
      const shifts = { ...prev.shifts };
      const offDays = { ...prev.offDays };
      for (const employeeId of employeeIds) {
        for (const date of dates) {
          if (approvedLeaveOn(store.leaveRequests, employeeId, date)) {
            skipped += 1;
            continue;
          }
          const key = shiftKey(employeeId, date);
          shifts[key] = { start: role.start, end: role.end, roleId: role.id };
          delete offDays[key];
          assigned += 1;
        }
      }
      return { shifts, offDays };
    });

    if (mode === "single") {
      const employee = staff.find((e) => e.id === employeeIds[0]);
      notify(t("staff.assignShift.toastOne").replace("{name}", employee?.name ?? "").replace("{role}", role.name));
    } else {
      notify(
        t(skipped ? "staff.assignShift.toastManySkipped" : "staff.assignShift.toastMany")
          .replace("{count}", String(assigned))
          .replace("{skipped}", String(skipped))
      );
    }
    onClose();
  };

  const employeeOptions = staff.map((e) => ({
    value: e.id,
    label: e.name,
    detail: labels.data("staff.jobTitle", store.profileOf(e.id)?.jobTitle ?? ""),
  }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t(mode === "single" ? "staff.assignShift.title" : "staff.assignShift.bulkTitle")}
      className="max-w-2xl p-6 [&>h2]:text-[22px] [&>h2]:font-bold"
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-2 flex flex-col gap-5"
      >
        <Field label={t(mode === "single" ? "staff.assignShift.employee" : "staff.assignShift.employees")} htmlFor="as-employee" required error={errors.employee}>
          {mode === "single" ? (
            <SelectInput
              id="as-employee"
              value={employeeIds[0] ?? ""}
              invalid={!!errors.employee}
              onChange={(e) => {
                setEmployeeIds(e.target.value ? [e.target.value] : []);
                setErrors((p) => ({ ...p, employee: undefined, day: undefined }));
              }}
            >
              <option value="">{t("staff.assignShift.selectEmployee")}</option>
              {employeeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </SelectInput>
          ) : (
            <MultiSelect
              id="as-employee"
              options={employeeOptions}
              value={employeeIds}
              invalid={!!errors.employee}
              onChange={(next) => {
                setEmployeeIds(next);
                setErrors((p) => ({ ...p, employee: undefined }));
              }}
              placeholder={t("staff.assignShift.selectEmployees")}
              selectAllLabel={t("staff.member.modules.selectAll")}
              visible={3}
            />
          )}
        </Field>

        <Field label={t("staff.assignShift.shiftRole")} htmlFor="as-role" required error={errors.role}>
          <SelectInput
            id="as-role"
            value={roleId}
            invalid={!!errors.role}
            disabled={activeRoles.length === 0}
            onChange={(e) => {
              setRoleId(e.target.value);
              setErrors((p) => ({ ...p, role: undefined }));
            }}
          >
            {activeRoles.length === 0 && <option value="">{t("staff.assignShift.noRoles")}</option>}
            {activeRoles.map((r) => (
              <option key={r.id} value={r.id}>
                {labels.data("staff.shiftRole", r.name)} ({rangeLabel(r.start, r.end, locale)})
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label={t(mode === "single" ? "staff.assignShift.day" : "staff.assignShift.days")} htmlFor="as-day" required error={errors.day}>
          {mode === "single" ? (
            <SelectInput
              id="as-day"
              value={dates[0] ?? ""}
              invalid={!!errors.day}
              onChange={(e) => {
                setDates(e.target.value ? [e.target.value] : []);
                setErrors((p) => ({ ...p, day: undefined }));
              }}
            >
              <option value="">{t("staff.assignShift.selectDay")}</option>
              {dayOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </SelectInput>
          ) : (
            <MultiSelect
              id="as-day"
              options={dayOptions}
              value={dates}
              invalid={!!errors.day}
              onChange={(next) => {
                setDates(next);
                setErrors((p) => ({ ...p, day: undefined }));
              }}
              placeholder={t("staff.assignShift.selectDays")}
              selectAllLabel={t("staff.member.modules.selectAll")}
              summary={(picked) => picked.map((o) => new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-US", { weekday: "short" }).format(fromISO(o.value))).join(", ")}
            />
          )}
        </Field>

        <button type="submit" className={buttonClass("primary", "lg", "mt-1 h-12 w-full text-[16px]")}>
          {t("staff.assignShift.submit")}
        </button>
      </form>
    </Modal>
  );
}
