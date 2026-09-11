import { useEffect, useMemo, useState } from "react";
import { Calendar, CalendarClock, CircleCheck, Clock, Plus, Users, Wallet } from "lucide-react";
import { Badge, Button, EmptyState, Input, Modal, Segmented } from "@ui/primitives";
import {
  scheduleStaff,
  scheduleShifts,
  getWeekStart,
  TODAY,
  SHIFT_PILL_COLORS,
  SHIFT_TYPE_TIME,
  leaveRequestRows,
  staffRoles,
  type ScheduleShift,
  type ShiftType,
  type StaffRole,
} from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";
import { RowMenu, type RowMenuItem } from "./_shared/row-menu";

const SUBNAV = ["schedule", "templates", "shiftRoles", "timeOff", "availability"] as const;
type SubnavId = (typeof SUBNAV)[number];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SHIFT_TYPES: ShiftType[] = ["Morning", "Evening", "Night"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}
function formatShiftTime(shift: ScheduleShift): string {
  return `${shift.start}–${shift.end}`;
}

function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);
  return { toast, setToast };
}

function ToastBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-5 end-5 z-50 flex items-center gap-2 rounded-[9px] border border-[#22C55E]/20 bg-[#22C55E]/10 px-4 py-2.5 text-[12.5px] font-medium text-[#16a34a] shadow-lg">
      <CircleCheck size={14} className="text-[#22C55E]" />
      {message}
    </div>
  );
}

export function ShiftsTab() {
  const { t } = useI18n();
  const [subnav, setSubnav] = useState<SubnavId>("schedule");

  return (
    <div className="mt-4">
      <div role="tablist" className="flex flex-wrap items-center gap-4 border-b border-[var(--octo-divider)] pb-2 text-[12.5px]">
        {SUBNAV.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={subnav === id}
            onClick={() => setSubnav(id)}
            className={`-mb-[9px] border-b-2 pb-2 font-medium transition-colors ${
              subnav === id ? "border-[#0D6EFD] text-[var(--octo-text-primary)]" : "border-transparent text-[var(--octo-text-muted)] hover:text-[var(--octo-text-primary)]"
            }`}
          >
            {t(`staff.shiftsTab.subnav.${id}`)}
          </button>
        ))}
      </div>

      {subnav === "schedule" && <ScheduleView />}
      {subnav === "templates" && <TemplatesView />}
      {subnav === "shiftRoles" && <ShiftRolesView />}
      {subnav === "timeOff" && <TimeOffView />}
      {subnav === "availability" && <AvailabilityView />}
    </div>
  );
}

/* ------------------------------------------------------------------ Schedule */

function ScheduleView() {
  const { t } = useI18n();
  const [range, setRange] = useState<"week" | "month">("week");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [weekDeletedIds, setWeekDeletedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const { toast, setToast } = useToast();
  const weekStart = useMemo(() => getWeekStart(new Date(TODAY)), []);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const shiftsByEmployeeAndDate = useMemo(() => {
    const map = new Map<string, ScheduleShift>();
    for (const s of scheduleShifts) map.set(`${s.employeeId}|${s.date}`, s);
    return map;
  }, []);

  const totalHours = scheduleStaff.reduce((sum, e) => sum + e.hoursThisWeek, 0);

  return (
    <>
      <div className="mt-4 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <p className="text-[13px] font-bold text-[var(--octo-text-primary)]">{t("staff.shiftsTab.weeklySummary")}</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { icon: <Clock size={15} />, label: t("staff.shiftsTab.totalHours"), value: `${totalHours}hr`, bg: "bg-[#eaf2ff] text-[#0D6EFD]" },
            { icon: <Users size={15} />, label: t("staff.shiftsTab.totalEmployees"), value: String(scheduleStaff.length), bg: "bg-[#f3e8ff] text-[#9333ea]" },
            { icon: <CalendarClock size={15} />, label: t("staff.shiftsTab.overtime"), value: "12hr", bg: "bg-[#fce7f3] text-[#db2777]" },
            { icon: <Calendar size={15} />, label: t("staff.shiftsTab.openShift"), value: "5", bg: "bg-[#fef3c7] text-[#b45309]" },
            { icon: <Wallet size={15} />, label: t("staff.shiftsTab.estLaborCost"), value: "SAR12.500", bg: "bg-[#dcfce7] text-[#15803d]" },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-2.5 rounded-[10px] border border-[var(--octo-border-card)] px-3 py-2.5">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-[8px] ${stat.bg}`}>{stat.icon}</span>
              <span>
                <span className="block text-[14px] font-bold leading-tight text-[var(--octo-text-primary)]">{stat.value}</span>
                <span className="block text-[10.5px] text-[var(--octo-text-muted)]">{stat.label}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Segmented
          options={[{ id: "week", label: t("staff.shiftsTab.week") }, { id: "month", label: t("staff.shiftsTab.month") }]}
          value={range}
          onChange={(id) => setRange(id as "week" | "month")}
        />
        <span className="text-[12px] font-medium text-[var(--octo-text-primary)]">{toISO(weekStart)}</span>
        <Button variant="secondary" size="sm" className="ms-auto" onClick={() => setBulkOpen(true)}>
          {t("staff.shiftsTab.bulkActions")}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setWhatsAppOpen(true)}>
          {t("staff.shiftsTab.sendViaWhatsApp")}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          {t("staff.shiftsTab.print")}
        </Button>
        <Button variant="primary" size="sm" onClick={() => setToast(t("staff.shiftsTab.toastExport"))}>
          {t("staff.shiftsTab.exportPdf")}
        </Button>
      </div>

      {range === "month" ? (
        <EmptyState
          className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)]"
          icon={<Calendar size={18} />}
          title={t("staff.shiftsTab.comingSoon")}
          description={t("staff.shiftsTab.comingSoonDescription")}
        />
      ) : (
        <div className="octo-scroll mt-3 overflow-x-auto rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)]">
          <table className="w-full min-w-[960px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--octo-divider)]">
                <th className="px-3 py-2.5 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                  {t("staff.shiftsTab.allEmployees")}
                </th>
                {days.map((d, i) => (
                  <th key={toISO(d)} className="px-3 py-2.5 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                    {DAY_LABELS[i]} {d.getDate()}
                  </th>
                ))}
                <th className="w-8 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {scheduleStaff.map((emp, empIndex) => {
                const color = SHIFT_PILL_COLORS[empIndex % SHIFT_PILL_COLORS.length];
                const deleted = weekDeletedIds.has(emp.id);
                const menuItems: RowMenuItem[] = [
                  {
                    key: "copy-week",
                    label: t("staff.shiftsTab.rowMenu.copyWeek"),
                    onSelect: () => setToast(t("staff.shiftsTab.toastCopyWeek").replace("{name}", emp.name)),
                  },
                  {
                    key: "delete-week",
                    label: t("staff.shiftsTab.rowMenu.deleteWeek"),
                    tone: "danger",
                    onSelect: () => {
                      setWeekDeletedIds((prev) => new Set(prev).add(emp.id));
                      setToast(t("staff.shiftsTab.toastDeleteWeek").replace("{name}", emp.name));
                    },
                  },
                ];
                return (
                  <tr key={emp.id} className="border-b border-[var(--octo-row-border)] last:border-0">
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <div className="font-semibold text-[var(--octo-text-primary)]">{emp.name}</div>
                      <div className="text-[11px] text-[var(--octo-text-muted)]">{emp.role === "Branch Manager" ? "Restaurant Manager" : emp.role}</div>
                      <div className="text-[10.5px] text-[var(--octo-text-faint)]">{deleted ? "0h/ 40h" : `${emp.hoursThisWeek}h/ 40h`}</div>
                    </td>
                    {days.map((d) => {
                      const shift = deleted ? undefined : shiftsByEmployeeAndDate.get(`${emp.id}|${toISO(d)}`);
                      return (
                        <td key={toISO(d)} className="px-3 py-2.5">
                          {shift ? (
                            <span
                              className="inline-flex rounded-[7px] border px-2.5 py-1.5 text-[11px] font-medium"
                              style={{ borderColor: color, color }}
                            >
                              {formatShiftTime(shift)}
                            </span>
                          ) : (
                            <span className="inline-flex rounded-[7px] border border-dashed border-[var(--octo-border-input)] px-2.5 py-1.5 text-[11px] text-[var(--octo-text-faint)]">
                              {t("staff.shiftsTab.off")}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-2.5">
                      <RowMenu
                        items={menuItems}
                        open={openMenuId === emp.id}
                        onOpenChange={(open) => setOpenMenuId(open ? emp.id : null)}
                        ariaLabel={emp.name}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title={t("staff.shiftsTab.bulkActionsTitle")}
      >
        <p className="text-[12.5px] text-[var(--octo-text-secondary)]">{t("staff.shiftsTab.bulkActionsBody")}</p>
        <div className="mt-3 flex flex-col gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="justify-start"
            onClick={() => {
              setBulkOpen(false);
              setToast(t("staff.shiftsTab.toastBulkPublish"));
            }}
          >
            {t("staff.shiftsTab.bulkPublish")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="justify-start"
            onClick={() => {
              setBulkOpen(false);
              setToast(t("staff.shiftsTab.toastBulkClearOff"));
            }}
          >
            {t("staff.shiftsTab.bulkClearOff")}
          </Button>
        </div>
      </Modal>

      <Modal
        open={whatsAppOpen}
        onClose={() => setWhatsAppOpen(false)}
        title={t("staff.shiftsTab.sendWhatsAppTitle")}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setWhatsAppOpen(false)}>{t("common.cancel")}</Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setWhatsAppOpen(false);
                setToast(t("staff.shiftsTab.toastWhatsApp"));
              }}
            >
              {t("staff.shiftsTab.send")}
            </Button>
          </>
        }
      >
        <p className="text-[12.5px] text-[var(--octo-text-secondary)]">{t("staff.shiftsTab.sendWhatsAppBody")}</p>
      </Modal>

      <ToastBanner message={toast} />
    </>
  );
}

/* ------------------------------------------------------------------ Templates */

interface ShiftTemplate {
  id: string;
  name: string;
  start: string;
  end: string;
}

function TemplatesView() {
  const { t } = useI18n();
  const [templates, setTemplates] = useState<ShiftTemplate[]>(
    SHIFT_TYPES.map((type) => ({ id: type, name: type, start: SHIFT_TYPE_TIME[type].start, end: SHIFT_TYPE_TIME[type].end }))
  );
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const { toast, setToast } = useToast();

  const submit = () => {
    if (!name.trim()) return;
    setTemplates((prev) => [...prev, { id: `tpl-${prev.length}`, name: name.trim(), start, end }]);
    setToast(t("staff.shiftsTab.templates.toast").replace("{name}", name.trim()));
    setAddOpen(false);
    setName("");
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] text-[var(--octo-text-muted)]">{t("staff.shiftsTab.templates.subtitle")}</p>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
          {t("staff.shiftsTab.templates.addTemplate")}
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((tpl) => (
          <div key={tpl.id} className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
            <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{tpl.name}</p>
            <p className="mt-1 text-[12px] text-[var(--octo-text-muted)]">{tpl.start} – {tpl.end}</p>
          </div>
        ))}
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={t("staff.shiftsTab.templates.addTemplateTitle")}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setAddOpen(false)}>{t("common.cancel")}</Button>
            <Button variant="primary" size="sm" onClick={submit}>{t("staff.shiftsTab.templates.save")}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input label={t("staff.shiftsTab.templates.name")} value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input type="time" label={t("staff.shiftsTab.templates.startTime")} value={start} onChange={(e) => setStart(e.target.value)} />
            <Input type="time" label={t("staff.shiftsTab.templates.endTime")} value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
      </Modal>

      <ToastBanner message={toast} />
    </div>
  );
}

/* ------------------------------------------------------------------ Shift Roles */

interface ShiftRole {
  id: string;
  name: string;
  color: string;
  memberCount: number;
}

const SHIFT_ROLE_COLORS = ["#0D6EFD", "#9333ea", "#db2777", "#b45309", "#15803d", "#0891b2"];

function ShiftRolesView() {
  const { t } = useI18n();
  const [roles, setRoles] = useState<ShiftRole[]>(() =>
    staffRoles
      .filter((r) => r !== "Owner")
      .map((r, i) => ({
        id: r,
        name: r === "Branch Manager" ? "Restaurant Manager" : r,
        color: SHIFT_ROLE_COLORS[i % SHIFT_ROLE_COLORS.length],
        memberCount: scheduleStaff.filter((e) => e.role === (r as StaffRole)).length,
      }))
  );
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const { toast, setToast } = useToast();

  const submit = () => {
    if (!name.trim()) return;
    setRoles((prev) => [
      ...prev,
      { id: `shift-role-${prev.length}`, name: name.trim(), color: SHIFT_ROLE_COLORS[prev.length % SHIFT_ROLE_COLORS.length], memberCount: 0 },
    ]);
    setToast(t("staff.shiftsTab.shiftRoles.toast").replace("{name}", name.trim()));
    setAddOpen(false);
    setName("");
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] text-[var(--octo-text-muted)]">{t("staff.shiftsTab.shiftRoles.subtitle")}</p>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
          {t("staff.shiftsTab.shiftRoles.addRole")}
        </Button>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {roles.map((role) => (
          <div key={role.id} className="flex items-center gap-3 rounded-[10px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-3 py-2.5">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: role.color }} />
            <span className="flex-1 text-[12.5px] font-medium text-[var(--octo-text-primary)]">{role.name}</span>
            <span className="text-[11px] text-[var(--octo-text-muted)]">{role.memberCount} {t("staff.shiftsTab.shiftRoles.members")}</span>
          </div>
        ))}
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={t("staff.shiftsTab.shiftRoles.addRoleTitle")}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setAddOpen(false)}>{t("common.cancel")}</Button>
            <Button variant="primary" size="sm" onClick={submit}>{t("staff.shiftsTab.shiftRoles.save")}</Button>
          </>
        }
      >
        <Input label={t("staff.shiftsTab.shiftRoles.name")} value={name} onChange={(e) => setName(e.target.value)} />
      </Modal>

      <ToastBanner message={toast} />
    </div>
  );
}

/* ------------------------------------------------------------------ Time Off */

type LeaveStatus = "pending" | "approved" | "declined";

function TimeOffView() {
  const { t } = useI18n();
  const [statusById, setStatusById] = useState<Record<string, LeaveStatus>>(() =>
    Object.fromEntries(leaveRequestRows.map((r) => [r.id, "pending"]))
  );
  const { toast, setToast } = useToast();

  const STATUS_TONE: Record<LeaveStatus, "warning" | "success" | "error"> = {
    pending: "warning",
    approved: "success",
    declined: "error",
  };

  return (
    <div className="mt-4">
      <p className="text-[12.5px] text-[var(--octo-text-muted)]">{t("staff.shiftsTab.timeOff.subtitle")}</p>

      <div className="octo-scroll mt-3 overflow-x-auto rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)]">
        <table className="w-full min-w-[640px] border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-[var(--octo-divider)]">
              {[
                t("staff.shiftsTab.timeOff.column.employee"),
                t("staff.shiftsTab.timeOff.column.type"),
                t("staff.shiftsTab.timeOff.column.dates"),
                t("staff.shiftsTab.timeOff.column.days"),
                t("staff.shiftsTab.timeOff.column.actions"),
              ].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2.5 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leaveRequestRows.map((row) => {
              const status = statusById[row.id];
              return (
                <tr key={row.id} className="border-b border-[var(--octo-row-border)] last:border-0">
                  <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-[var(--octo-text-primary)]">{row.employee}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[var(--octo-text-secondary)]">{row.type}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[var(--octo-text-secondary)]">{row.startDate} – {row.endDate}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[var(--octo-text-secondary)]">{row.days}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {status === "pending" ? (
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setStatusById((prev) => ({ ...prev, [row.id]: "approved" }));
                            setToast(t("staff.shiftsTab.timeOff.toastApprove").replace("{employee}", row.employee).replace("{type}", row.type));
                          }}
                        >
                          {t("staff.shiftsTab.timeOff.approve")}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setStatusById((prev) => ({ ...prev, [row.id]: "declined" }));
                            setToast(t("staff.shiftsTab.timeOff.toastDecline").replace("{employee}", row.employee).replace("{type}", row.type));
                          }}
                        >
                          {t("staff.shiftsTab.timeOff.decline")}
                        </Button>
                      </div>
                    ) : (
                      <Badge tone={STATUS_TONE[status]}>{t(`staff.shiftsTab.timeOff.${status === "approved" ? "approve" : "decline"}`)}</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ToastBanner message={toast} />
    </div>
  );
}

/* ------------------------------------------------------------------ Availability */

function AvailabilityView() {
  const { t } = useI18n();
  const [availability, setAvailability] = useState<Record<string, boolean[]>>(() =>
    Object.fromEntries(scheduleStaff.map((e) => [e.id, Array(7).fill(true)]))
  );

  const toggleDay = (empId: string, dayIndex: number) => {
    setAvailability((prev) => {
      const next = [...prev[empId]];
      next[dayIndex] = !next[dayIndex];
      return { ...prev, [empId]: next };
    });
  };

  return (
    <div className="mt-4">
      <p className="text-[12.5px] text-[var(--octo-text-muted)]">{t("staff.shiftsTab.availability.subtitle")}</p>

      <div className="octo-scroll mt-3 overflow-x-auto rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)]">
        <table className="w-full min-w-[760px] border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-[var(--octo-divider)]">
              <th className="px-3 py-2.5 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                {t("staff.shiftsTab.allEmployees")}
              </th>
              {DAY_LABELS.map((d) => (
                <th key={d} className="px-3 py-2.5 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scheduleStaff.map((emp) => (
              <tr key={emp.id} className="border-b border-[var(--octo-row-border)] last:border-0">
                <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-[var(--octo-text-primary)]">{emp.name}</td>
                {availability[emp.id].map((isAvailable, dayIndex) => (
                  <td key={dayIndex} className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => toggleDay(emp.id, dayIndex)}
                      className={`rounded-[7px] border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                        isAvailable
                          ? "border-[#22C55E]/30 bg-[#22C55E]/10 text-[#16a34a]"
                          : "border-[var(--octo-border-input)] text-[var(--octo-text-faint)]"
                      }`}
                    >
                      {isAvailable ? t("staff.shiftsTab.availability.available") : t("staff.shiftsTab.availability.unavailable")}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
