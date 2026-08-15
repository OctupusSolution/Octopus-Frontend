import { useEffect, useMemo, useState } from "react";
import { Search, ClipboardList, X, Smartphone, PlusCircle, ChevronRight } from "lucide-react";
import { StatCard } from "@/widgets/sales-summary-chart";
import { Badge, Button, EmptyState, Input, Modal, Select, Textarea } from "@ui/primitives";
import {
  attendanceStats,
  attendanceRecords,
  employeeById,
  branches,
  correctionReasons,
  type AttendanceRecord,
  type AttendanceStatus,
} from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";

const STATUS_TONE: Record<AttendanceStatus, "success" | "warning" | "error" | "info" | "neutral"> = {
  Present: "success",
  Late: "warning",
  Absent: "error",
  "On Leave": "info",
  Holiday: "neutral",
};
const STATUS_KEY: Record<AttendanceStatus, string> = {
  Present: "staff.attendance.status.present",
  Late: "staff.attendance.status.late",
  Absent: "staff.attendance.status.absent",
  "On Leave": "status.onLeave",
  Holiday: "staff.attendance.status.holiday",
};

const REASON_KEY: Record<(typeof correctionReasons)[number], string> = {
  "System error": "staff.attendance.correction.reason.systemError",
  "Device malfunction": "staff.attendance.correction.reason.deviceMalfunction",
  "Manual override": "staff.attendance.correction.reason.manualOverride",
  "Forgot to clock out": "staff.attendance.correction.reason.forgotClockOut",
  "Network outage": "staff.attendance.correction.reason.networkOutage",
};

const PAGE_SIZE = 10;

export function StaffAttendancePage() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return attendanceRecords
      .map((rec) => ({ rec, emp: employeeById.get(rec.employeeId)! }))
      .filter(({ rec, emp }) => {
        if (!emp) return false;
        if (q && !emp.name.toLowerCase().includes(q) && !emp.phone.includes(q)) return false;
        if (branchFilter !== "all" && emp.branch !== branchFilter) return false;
        if (statusFilter !== "all" && rec.status !== statusFilter) return false;
        if (fromDate && rec.date < fromDate) return false;
        if (toDate && rec.date > toDate) return false;
        return true;
      })
      .sort((a, b) => (a.rec.date < b.rec.date ? 1 : -1));
  }, [query, branchFilter, statusFilter, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const openRecord = attendanceRecords.find((r) => r.id === openId) ?? null;
  const openEmployee = openRecord ? employeeById.get(openRecord.employeeId) ?? null : null;

  const clearFilters = () => {
    setQuery(""); setBranchFilter("all"); setStatusFilter("all"); setFromDate(""); setToDate(""); setPage(1);
  };

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">{t("staff.attendance.title")}</h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">{t("staff.attendance.subtitle")}</p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {attendanceStats.map((card) => <StatCard key={card.id} data={card} />)}
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="min-w-[200px] flex-1"
            placeholder={t("staff.attendance.searchPlaceholder")}
            icon={<Search size={13} />}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          />
          <Select className="w-[170px]" value={branchFilter} onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }}>
            <option value="all">{t("staff.filter.allBranches")}</option>
            {branches.map((b) => <option key={b} value={b}>{b}</option>)}
          </Select>
          <Select className="w-[140px]" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="all">{t("staff.filter.allStatuses")}</option>
            {(["Present", "Late", "Absent", "On Leave", "Holiday"] as AttendanceStatus[]).map((s) => (
              <option key={s} value={s}>{t(STATUS_KEY[s])}</option>
            ))}
          </Select>
          <Input type="date" className="w-[150px]" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} aria-label={t("staff.attendance.fromDate")} />
          <Input type="date" className="w-[150px]" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} aria-label={t("staff.attendance.toDate")} />
        </div>

        {/* Mobile: card list — tap a row to open its details, no horizontal scroll */}
        <div className="mt-3 divide-y divide-[var(--octo-row-border)] sm:hidden">
          {pageRows.map(({ rec, emp }) => (
            <button
              key={rec.id}
              type="button"
              onClick={() => setOpenId(rec.id)}
              className="flex w-full items-center justify-between gap-3 py-2.5 text-start"
            >
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{emp.name}</span>
                <span className="block truncate text-[11px] text-[var(--octo-text-muted)]">{rec.date} · {rec.workedHours}h</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <Badge tone={STATUS_TONE[rec.status]}>{t(STATUS_KEY[rec.status])}</Badge>
                <ChevronRight size={15} className="text-[var(--octo-text-faint)] rtl:rotate-180" />
              </span>
            </button>
          ))}
        </div>

        <div className="octo-scroll mt-3 hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[980px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--octo-divider)] text-start">
                {["staff.col.employee", "staff.attendance.col.date", "staff.attendance.col.scheduled", "staff.attendance.col.clockIn", "staff.attendance.col.clockOut", "staff.attendance.col.break", "staff.attendance.col.workedHours", "staff.attendance.col.variance", "staff.col.status"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map(({ rec, emp }) => (
                <tr key={rec.id} className="cursor-pointer border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]" onClick={() => setOpenId(rec.id)}>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <div className="font-semibold text-[var(--octo-text-primary)]">{emp.name}</div>
                    <div className="text-[11px] text-[var(--octo-text-muted)]">{emp.phone}</div>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{rec.date}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{rec.scheduledStart}–{rec.scheduledEnd}</td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    {rec.clockIn ? (
                      <span className={rec.lateMinutes > 0 ? "font-medium text-[#dc2626]" : "text-[var(--octo-text-primary)]"}>
                        {rec.clockIn}{rec.lateMinutes > 0 ? ` (+${rec.lateMinutes}m)` : ""}
                      </span>
                    ) : (
                      <span className="text-[var(--octo-text-faint)]">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-primary)]">{rec.clockOut ?? <span className="text-[var(--octo-text-faint)]">—</span>}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{rec.breakMinutes ? `${rec.breakMinutes}m` : "—"}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-primary)]">{rec.workedHours}h</td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <span className={rec.variance < 0 ? "font-medium text-[#dc2626]" : "text-[#16a34a]"}>
                      {rec.variance > 0 ? "+" : ""}{rec.variance}h
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5"><Badge tone={STATUS_TONE[rec.status]}>{t(STATUS_KEY[rec.status])}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          {pageRows.length === 0 && (
            <EmptyState
              icon={<ClipboardList size={18} />}
              title={t("staff.attendance.emptyTitle")}
              description={t("staff.attendance.emptyDescription")}
              action={<Button variant="secondary" size="sm" onClick={clearFilters}>{t("customers.clearFilters")}</Button>}
            />
          )}
        </div>

        {rows.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-[11.5px] text-[var(--octo-text-muted)]">
            <span>
              {t("customers.feedback.showing")
                .replace("{from}", String((page - 1) * PAGE_SIZE + 1))
                .replace("{to}", String(Math.min(page * PAGE_SIZE, rows.length)))
                .replace("{total}", String(rows.length))}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-[7px] px-2 py-1 hover:bg-[var(--octo-hover)] disabled:opacity-30">‹</button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button key={i} type="button" onClick={() => setPage(i + 1)} className={`rounded-[7px] px-2 py-1 ${page === i + 1 ? "bg-[#eaf2ff] font-semibold text-[#0D6EFD]" : "hover:bg-[var(--octo-hover)]"}`}>{i + 1}</button>
              ))}
              <button type="button" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="rounded-[7px] px-2 py-1 hover:bg-[var(--octo-hover)] disabled:opacity-30">›</button>
            </div>
          </div>
        )}
      </section>

      <AttendanceDrawer record={openRecord} employeeName={openEmployee?.name ?? ""} onClose={() => setOpenId(null)} />
    </div>
  );
}

function AttendanceDrawer({ record, employeeName, onClose }: { record: AttendanceRecord | null; employeeName: string; onClose: () => void }) {
  const { t } = useI18n();
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [addedNote, setAddedNote] = useState<string | null>(null);
  const open = Boolean(record);

  useEffect(() => { setCorrectionOpen(false); setAddedNote(null); }, [record?.id]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-black/30 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("staff.attendance.drawer.title")}
        className={`absolute inset-y-0 end-0 flex w-full flex-col bg-[var(--octo-card)] shadow-xl transition-transform duration-200 sm:w-[420px] ${open ? "translate-x-0" : "translate-x-full rtl:-translate-x-full"}`}
      >
        {record && (
          <>
            <div className="flex items-center justify-between border-b border-[var(--octo-divider)] px-[18px] py-[15px]">
              <h2 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{t("staff.attendance.drawer.title")}</h2>
              <button type="button" aria-label={t("common.cancel")} onClick={onClose} className="grid h-7 w-7 place-items-center rounded-[7px] text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)]">
                <X size={15} />
              </button>
            </div>

            <div className="octo-scroll flex-1 overflow-y-auto px-[18px] py-[15px]">
              {addedNote && (
                <div className="mb-3 rounded-[9px] bg-[#eafbe9] px-3 py-2 text-center text-[11.5px] font-medium text-[#16a34a]">{addedNote}</div>
              )}
              <h3 className="text-[15px] font-bold text-[var(--octo-text-primary)]">{employeeName}</h3>
              <p className="text-[12px] text-[var(--octo-text-muted)]">{record.date}</p>

              <div className="mt-4 grid grid-cols-3 gap-3 rounded-[9px] bg-[var(--octo-row-hover)] p-3 text-center">
                <div>
                  <dt className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("staff.attendance.col.scheduled")}</dt>
                  <dd className="mt-1 text-[14px] font-bold text-[var(--octo-text-primary)]">{record.scheduledHours}h</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("staff.attendance.col.workedHours")}</dt>
                  <dd className="mt-1 text-[14px] font-bold text-[var(--octo-text-primary)]">{record.workedHours}h</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("staff.attendance.col.variance")}</dt>
                  <dd className={`mt-1 text-[14px] font-bold ${record.variance < 0 ? "text-[#dc2626]" : "text-[#16a34a]"}`}>
                    {record.variance > 0 ? "+" : ""}{record.variance}h
                  </dd>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("staff.attendance.drawer.punchLog")}</h4>
                {record.punches.length > 0 ? (
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {record.punches.map((p, i) => (
                      <li key={i} className="flex items-center justify-between rounded-[9px] border border-[var(--octo-divider)] px-2.5 py-2">
                        <span className="flex items-center gap-2">
                          <Smartphone size={13} className="text-[var(--octo-text-muted)]" />
                          <span className="text-[12px] font-medium text-[var(--octo-text-primary)]">{p.type}</span>
                        </span>
                        <span className="text-end text-[11px] text-[var(--octo-text-muted)]">{p.time} · {p.device}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-[12.5px] text-[var(--octo-text-secondary)]">{t("staff.attendance.drawer.noPunches")}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-[var(--octo-divider)] px-[18px] py-[15px]">
              <Button variant="secondary" size="sm" icon={<PlusCircle size={13} />} onClick={() => setCorrectionOpen(true)}>
                {t("staff.attendance.drawer.addCorrection")}
              </Button>
            </div>
          </>
        )}
      </div>

      <CorrectionModal
        open={correctionOpen}
        onClose={() => setCorrectionOpen(false)}
        date={record?.date ?? ""}
        onAdd={() => { setCorrectionOpen(false); setAddedNote(t("staff.attendance.drawer.correctionAdded")); }}
      />
    </div>
  );
}

function CorrectionModal({ open, onClose, date, onAdd }: { open: boolean; onClose: () => void; date: string; onAdd: () => void }) {
  const { t } = useI18n();
  const [correctionDate, setCorrectionDate] = useState(date);
  const [time, setTime] = useState("09:00");
  const [type, setType] = useState("Clock In");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { if (open) { setCorrectionDate(date); setReason(""); setError(""); } }, [open, date]);

  const submit = () => {
    if (!reason) { setError(t("staff.attendance.correction.reasonRequired")); return; }
    onAdd();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("staff.attendance.correction.title")}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>{t("common.cancel")}</Button>
          <Button variant="primary" size="sm" onClick={submit}>{t("staff.attendance.correction.add")}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Input type="date" label={t("staff.attendance.col.date")} value={correctionDate} onChange={(e) => setCorrectionDate(e.target.value)} />
          <label className="flex flex-col gap-1.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("staff.attendance.correction.time")}</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2 text-[12.5px] text-[var(--octo-text-primary)] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/30 focus:border-[#0D6EFD]" />
          </label>
        </div>
        <Select label={t("staff.attendance.correction.type")} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="Clock In">{t("staff.attendance.correction.type.clockIn")}</option>
          <option value="Clock Out">{t("staff.attendance.correction.type.clockOut")}</option>
          <option value="Break Start">{t("staff.attendance.correction.type.breakStart")}</option>
          <option value="Break End">{t("staff.attendance.correction.type.breakEnd")}</option>
        </Select>
        <Select label={`${t("staff.attendance.correction.reason")} *`} value={reason} onChange={(e) => { setReason(e.target.value); setError(""); }} error={error}>
          <option value="">{t("staff.attendance.correction.reasonPlaceholder")}</option>
          {correctionReasons.map((r) => <option key={r} value={r}>{r}</option>)}
        </Select>
        <Textarea label={t("staff.schedule.modal.notes")} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </Modal>
  );
}
