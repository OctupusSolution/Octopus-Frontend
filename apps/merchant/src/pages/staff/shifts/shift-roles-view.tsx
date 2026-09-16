import { useEffect, useState } from "react";
import { CalendarDays, CalendarX2, Clock, Plus, Settings, SquarePen, Trash2 } from "lucide-react";
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { buttonClass } from "../_shared/buttons";
import { ConfirmModal } from "../_shared/confirm-modal";
import { Field, SelectInput, TextInput } from "../_shared/form";
import { formatClock, formatDateTime, formatDaysSpan, weekdayName } from "../_shared/format";
import { useStaffLabels } from "../_shared/labels";
import { MultiSelect } from "../_shared/multi-select";
import { CUSTOM_SHIFT, useStaffStore, type ShiftRoleRecord } from "../_shared/staff-store";
import { StatusPill } from "../_shared/status-pill";
import { Switch } from "../_shared/switch";
import { ToastBanner, useToast } from "../_shared/toast";
import { rangeLabel } from "./schedule-utils";

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);
const WEEK = [0, 1, 2, 3, 4, 5, 6];

function nowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function ShiftRoleModal({
  role,
  open,
  onClose,
  onSaved,
}: {
  role: ShiftRoleRecord | null;
  open: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { t, locale } = useI18n();
  const labels = useStaffLabels();
  const store = useStaffStore();
  const [name, setName] = useState("");
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("22:00");
  const [days, setDays] = useState<number[]>(WEEK);
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<{ name?: string; time?: string; days?: string }>({});

  useEffect(() => {
    if (!open) return;
    setName(role ? labels.data("staff.shiftRole", role.name) : "");
    setStart(role?.start ?? "10:00");
    setEnd(role?.end ?? "22:00");
    setDays(role?.days ?? WEEK);
    setActive(role?.active ?? true);
    setErrors({});
    // Seed each time the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = () => {
    const trimmed = name.trim();
    const next: typeof errors = {};
    if (!trimmed) next.name = t("staff.validation.required");
    else if (store.shiftRoles.some((r) => r.id !== role?.id && labels.data("staff.shiftRole", r.name).toLowerCase() === trimmed.toLowerCase())) {
      next.name = t("staff.shiftRoles.nameTaken");
    }
    if (start === end) next.time = t("staff.validation.timeRange");
    if (days.length === 0) next.days = t("staff.validation.required");
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    const sortedDays = [...days].sort((a, b) => a - b);
    if (role) {
      const storedName = trimmed === labels.data("staff.shiftRole", role.name) ? role.name : trimmed;
      store.setShiftRoles((prev) => prev.map((r) => (r.id === role.id ? { ...r, name: storedName, start, end, days: sortedDays, active, updatedAt: nowStamp() } : r)));
      onSaved(t("staff.shiftRoles.toastUpdated").replace("{name}", trimmed));
    } else {
      store.setShiftRoles((prev) => [...prev, { id: `shift-${Date.now().toString(36)}`, name: trimmed, start, end, days: sortedDays, active, updatedAt: nowStamp() }]);
      onSaved(t("staff.shiftRoles.toastAdded").replace("{name}", trimmed));
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t(role ? "staff.shiftRoles.editTitle" : "staff.shiftRoles.addTitle")}
      className="max-w-2xl p-6 [&>h2]:text-[22px] [&>h2]:font-bold"
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="mt-2 flex flex-col gap-5"
      >
        <Field label={t("staff.shiftRoles.name")} htmlFor="sr-name" required error={errors.name}>
          <TextInput
            id="sr-name"
            autoFocus
            value={name}
            invalid={!!errors.name}
            placeholder={t("staff.shiftRoles.namePlaceholder")}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((p) => ({ ...p, name: undefined }));
            }}
          />
        </Field>
        <Field label={t("staff.shiftRoles.startTime")} htmlFor="sr-start" required error={errors.time}>
          <SelectInput id="sr-start" value={start} invalid={!!errors.time} onChange={(e) => { setStart(e.target.value); setErrors((p) => ({ ...p, time: undefined })); }}>
            {TIME_OPTIONS.map((v) => (
              <option key={v} value={v}>{formatClock(v, locale)}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label={t("staff.shiftRoles.endTime")} htmlFor="sr-end" required>
          <SelectInput id="sr-end" value={end} onChange={(e) => { setEnd(e.target.value); setErrors((p) => ({ ...p, time: undefined })); }}>
            {TIME_OPTIONS.map((v) => (
              <option key={v} value={v}>{formatClock(v, locale)}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label={t("staff.shiftRoles.workingDays")} htmlFor="sr-days" error={errors.days}>
          <MultiSelect
            id="sr-days"
            options={WEEK.map((d) => ({ value: String(d), label: weekdayName(d, locale) }))}
            value={days.map(String)}
            invalid={!!errors.days}
            onChange={(next) => {
              setDays(next.map(Number));
              setErrors((p) => ({ ...p, days: undefined }));
            }}
            placeholder={t("staff.shiftRoles.selectDays")}
            selectAllLabel={t("staff.shiftRoles.everyDay")}
            summary={(picked) => formatDaysSpan(picked.map((o) => Number(o.value)), locale, t("staff.shiftRoles.everyDay"))}
          />
        </Field>
        <label className="flex cursor-pointer items-center gap-3">
          <Switch checked={active} onChange={setActive} label={t("staff.status.active")} />
          <span className="text-[15px] font-medium text-[var(--octo-text-primary)]">{t("staff.status.active")}</span>
        </label>
        <button type="submit" className={buttonClass("primary", "lg", "mt-1 h-12 w-full text-[16px]")}>
          {t("staff.shiftRoles.save")}
        </button>
      </form>
    </Modal>
  );
}

export function ShiftRolesView({ addOpen, onAddOpenChange }: { addOpen: boolean; onAddOpenChange: (open: boolean) => void }) {
  const { t, locale } = useI18n();
  const labels = useStaffLabels();
  const store = useStaffStore();
  const { toast, notify } = useToast();
  const [editing, setEditing] = useState<ShiftRoleRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShiftRoleRecord | null>(null);

  const usage = (id: string) => Object.values(store.shifts).filter((s) => s.roleId === id).length;

  return (
    <div>
      {store.shiftRoles.length === 0 ? (
        <div className="mx-auto flex max-w-[700px] flex-col items-center px-4 py-16 text-center">
          <span aria-hidden className="relative grid h-40 w-40 place-items-center">
            <span className="absolute inset-0 rounded-full bg-[var(--octo-hover)]" />
            <CalendarX2 size={88} strokeWidth={1.2} className="relative text-[var(--octo-text-faint)]" />
          </span>
          <h2 className="mt-6 text-[17px] font-bold text-[var(--octo-text-primary)]">{t("staff.shiftRoles.emptyTitle")}</h2>
          <p className="mt-2 text-[15px] text-[var(--octo-text-secondary)]">{t("staff.shiftRoles.emptyDescription")}</p>
          <button type="button" onClick={() => onAddOpenChange(true)} className={buttonClass("primary", "lg", "mt-6 h-12 w-full text-[16px]")}>
            <Plus size={22} aria-hidden />
            {t("staff.shiftRoles.add")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {store.shiftRoles.map((role) => {
            const name = labels.data("staff.shiftRole", role.name);
            return (
              <article key={role.id} className="flex flex-col rounded-[16px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 truncate text-[17px] font-semibold text-[var(--octo-text-primary)]">{name}</h3>
                  <StatusPill tone={role.active ? "success" : "neutral"} label={t(role.active ? "staff.status.active" : "staff.status.inactive")} />
                </div>
                <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[14px] text-[var(--octo-text-primary)]">
                  <Clock size={16} aria-hidden className="shrink-0" />
                  <span>{t("staff.shiftRoles.shiftTime")}:</span>
                  <span className="font-semibold">{rangeLabel(role.start, role.end, locale)}</span>
                </p>
                <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[14px] text-[var(--octo-text-primary)]">
                  <CalendarDays size={16} aria-hidden className="shrink-0" />
                  <span>{t("staff.shiftRoles.shiftDays")}:</span>
                  <span className="font-semibold">{formatDaysSpan(role.days, locale, t("staff.shiftRoles.everyDay"))}</span>
                </p>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--octo-divider)] pt-3">
                  <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-[var(--octo-text-primary)]">
                    <Settings size={15} aria-hidden className="shrink-0" />
                    <span className="truncate">
                      {t("staff.shiftRoles.updated")}: {formatDateTime(role.updatedAt, locale)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(role)}
                      aria-label={t("staff.shiftRoles.deleteAria").replace("{name}", name)}
                      className={buttonClass("dangerSoft", "md", "w-10 px-0")}
                    >
                      <Trash2 size={18} />
                    </button>
                    <button type="button" onClick={() => setEditing(role)} className={buttonClass("neutralSoft", "md", "font-medium")}>
                      <SquarePen size={18} aria-hidden />
                      {t("staff.grid.menu.edit")}
                    </button>
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ShiftRoleModal
        role={editing}
        open={addOpen || Boolean(editing)}
        onClose={() => {
          onAddOpenChange(false);
          setEditing(null);
        }}
        onSaved={notify}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={t("staff.shiftRoles.deleteTitle")}
        body={
          deleteTarget
            ? t(usage(deleteTarget.id) ? "staff.shiftRoles.deleteBodyUsed" : "staff.shiftRoles.deleteBody")
                .replace("{name}", labels.data("staff.shiftRole", deleteTarget.name))
                .replace("{count}", String(usage(deleteTarget.id)))
            : ""
        }
        confirmLabel={t("staff.grid.menu.delete")}
        cancelLabel={t("common.cancel")}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          const id = deleteTarget.id;
          // Shifts already on the schedule keep their hours; they just stop
          // being tied to a role that no longer exists.
          store.updateSchedule((prev) => ({
            ...prev,
            shifts: Object.fromEntries(Object.entries(prev.shifts).map(([k, c]) => [k, c.roleId === id ? { ...c, roleId: CUSTOM_SHIFT } : c])),
          }));
          store.setShiftRoles((prev) => prev.filter((r) => r.id !== id));
          notify(t("staff.shiftRoles.toastDeleted").replace("{name}", labels.data("staff.shiftRole", deleteTarget.name)));
        }}
      />

      <ToastBanner toast={toast} />
    </div>
  );
}
