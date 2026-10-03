import { useEffect, useState } from "react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import { ConfirmModal } from "../_shared/confirm-modal";
import { Field, SelectInput, TextInput } from "../_shared/form";
import { formatClock, formatDateTime, formatDaysSpan, weekdayName } from "../_shared/format";
import { StaffIcon } from "../_shared/icon";
import { useStaffLabels } from "../_shared/labels";
import { MultiSelect } from "../_shared/multi-select";
import { StaffModal } from "../_shared/staff-modal";
import { CUSTOM_SHIFT, useStaffStore, type ShiftRoleRecord } from "../_shared/staff-store";
import { StatusPill } from "../_shared/status-pill";
import { Switch } from "../_shared/switch";
import { FILL_BLUE, FILL_RED, INK, INK_SOFT, LINE, TEXT_RED } from "../_shared/theme";
import { ToastBanner, useToast } from "../_shared/toast";
import { rangeLabel } from "./schedule-utils";

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);
const WEEK = [0, 1, 2, 3, 4, 5, 6];

// The frame's card actions: 32px tall on a 4px radius, a 24px glyph beside
// 14px medium text.
const CARD_ACTION =
  "inline-flex h-8 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-[4px] text-[14px] font-medium leading-[14px] transition-[filter] hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40";

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
    <StaffModal
      open={open}
      onClose={onClose}
      title={t(role ? "staff.shiftRoles.editTitle" : "staff.shiftRoles.addTitle")}
      submitLabel={t("staff.shiftRoles.save")}
      onSubmit={save}
    >
      {/* This frame spaces its fields by 24px, the same step as its title and action. */}
      <div className="flex flex-col gap-6">
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
        <label className="flex cursor-pointer items-center gap-2 self-start">
          <Switch checked={active} onChange={setActive} label={t("staff.status.active")} />
          <span className={clsx("text-[14px] font-semibold leading-[14px]", INK)}>{t("staff.status.active")}</span>
        </label>
      </div>
    </StaffModal>
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
        <div className="mx-auto flex w-full max-w-[498px] flex-col gap-4 pb-16 pt-[136px]">
          <div className="flex flex-col items-center gap-2 text-center">
            {/* The art is exported as an alpha mask and tinted, as in the frame. */}
            <StaffIcon name="staff-shift-empty.png" size={200} className="text-[#cbd5e1] [[data-theme=dark]_&]:text-[var(--octo-text-faint)]" />
            <h2 className={clsx("text-[16px] font-bold leading-4", INK)}>{t("staff.shiftRoles.emptyTitle")}</h2>
            <p className={clsx("text-[14px] font-medium leading-[1.4]", INK_SOFT)}>{t("staff.shiftRoles.emptyDescription")}</p>
          </div>
          <button
            type="button"
            onClick={() => onAddOpenChange(true)}
            className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-[4px] border border-[#f5f9ff] bg-[#0D6EFD] p-2 text-[14px] font-semibold leading-[14px] text-white transition-colors hover:bg-[#0b5ed7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40 [[data-theme=dark]_&]:border-transparent"
          >
            <StaffIcon name="staff-shift-plus.svg" size={24} />
            {t("staff.shiftRoles.add")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {store.shiftRoles.map((role) => {
            const name = labels.data("staff.shiftRole", role.name);
            return (
              <article
                key={role.id}
                className={clsx("flex flex-col gap-2 rounded-[16px] border bg-[var(--octo-card)] p-3 shadow-[0_0_8px_rgba(0,0,0,0.08)]", LINE)}
              >
                <div className={clsx("flex flex-col gap-2 border-b pb-2", LINE)}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="min-w-0 truncate text-[16px] font-semibold leading-4 text-black [[data-theme=dark]_&]:text-[var(--octo-text-primary)]">{name}</h3>
                    <StatusPill tone={role.active ? "success" : "neutral"} label={t(role.active ? "staff.status.active" : "staff.status.inactive")} />
                  </div>
                  <p className={clsx("flex flex-wrap items-center gap-1 text-[12px] leading-3", INK)}>
                    <StaffIcon name="staff-shift-clock.svg" size={16} />
                    <span>{t("staff.shiftRoles.shiftTime")}:</span>
                    <span className="font-semibold">{rangeLabel(role.start, role.end, locale)}</span>
                  </p>
                  <p className={clsx("flex flex-wrap items-center gap-1 text-[12px] leading-3", INK)}>
                    <StaffIcon name="staff-calendar-16.svg" size={16} />
                    <span>{t("staff.shiftRoles.shiftDays")}:</span>
                    <span className="font-semibold">{formatDaysSpan(role.days, locale, t("staff.shiftRoles.everyDay"))}</span>
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className={clsx("flex min-w-0 items-center gap-1 text-[10px] leading-[10px]", INK)}>
                    <StaffIcon name="staff-system-update.svg" size={16} glyph={[14, 14.33]} />
                    <span className="truncate">
                      {t("staff.shiftRoles.updated")}: {formatDateTime(role.updatedAt, locale)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(role)}
                      aria-label={t("staff.shiftRoles.deleteAria").replace("{name}", name)}
                      className={clsx(CARD_ACTION, "w-8", FILL_RED, TEXT_RED)}
                    >
                      <StaffIcon name="crm-trash.svg" size={24} />
                    </button>
                    <button type="button" onClick={() => setEditing(role)} className={clsx(CARD_ACTION, "px-2", FILL_BLUE, INK)}>
                      <StaffIcon name="crm-detail-edit.svg" size={24} />
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
