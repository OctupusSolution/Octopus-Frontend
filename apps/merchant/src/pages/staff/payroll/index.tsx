import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Search, ClipboardList, Upload, Pencil, Lock, X, FileCheck2, ChevronRight } from "lucide-react";
import { Badge, Button, EmptyState, Input, Modal, Select } from "@ui/primitives";
import {
  TODAY,
  payrollPeriods,
  payrollRowsByPeriod,
  employeeById,
  type PayrollRow,
  type PayrollStatus,
} from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";

const STATUS_KEY: Record<PayrollStatus, string> = {
  Draft: "staff.payroll.status.notExported",
  Approved: "staff.payroll.status.approved",
  Exported: "staff.payroll.status.exported",
  Locked: "staff.payroll.status.locked",
};

const STATUS_TONE: Record<PayrollStatus, "success" | "warning" | "error" | "info" | "neutral"> = {
  Draft: "info",
  Approved: "warning",
  Exported: "success",
  Locked: "neutral",
};

const sar = (n: number) => `SAR ${n.toLocaleString("en-US")}`;

export function StaffPayrollPage() {
  const { t } = useI18n();
  const [periodId, setPeriodId] = useState(payrollPeriods[0].id);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<PayrollRow[]>(() => [...payrollRowsByPeriod[periodId]]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [justExported, setJustExported] = useState(false);

  const period = payrollPeriods.find((p) => p.id === periodId) ?? payrollPeriods[0];
  const effectiveStatus: PayrollStatus = justExported || period.status === "Exported" ? "Exported" : period.status;

  useEffect(() => {
    setRows([...payrollRowsByPeriod[periodId]]);
    setQuery("");
    setJustExported(false);
    setOpenId(null);
  }, [periodId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (employeeById.get(r.employeeId)?.name.toLowerCase().includes(q) ?? false));
  }, [rows, query]);

  const totalAll = rows.reduce((sum, r) => sum + r.netInput, 0);
  const totalFiltered = filtered.reduce((sum, r) => sum + r.netInput, 0);
  const openRow = rows.find((r) => r.id === openId) ?? null;

  const handleSave = (id: string, patch: Partial<PayrollRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const confirmExport = () => {
    setRows((prev) => prev.map((r) => ({ ...r, status: "Exported" as const })));
    setExportOpen(false);
    setJustExported(true);
  };

  const clearFilters = () => setQuery("");

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">{t("staff.payroll.title")}</h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">{t("staff.payroll.subtitle")}</p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label={t("staff.payroll.kpi.period")}
          value={period.label}
          sub={period.hijriLabel}
        />
        <Kpi
          label={t("staff.payroll.kpi.employees")}
          value={String(rows.length)}
        />
        <Kpi
          label={t("staff.payroll.kpi.totalInputs")}
          value={sar(totalAll)}
          sub={t("staff.payroll.kpi.totalInputsNote").replace("{period}", period.label)}
        />
        <Kpi
          label={t("staff.payroll.kpi.exportStatus")}
          value={t(STATUS_KEY[effectiveStatus])}
          sub={effectiveStatus === "Draft" || effectiveStatus === "Approved" ? t("staff.payroll.kpi.exportNote") : undefined}
        />
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="min-w-[200px] flex-1"
            placeholder={t("staff.payroll.searchPlaceholder")}
            icon={<Search size={13} />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Select className="w-[210px]" value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
            {payrollPeriods.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </Select>
        </div>

        {/* Mobile: card list — tap a row to open its details, no horizontal scroll */}
        <div className="mt-3 divide-y divide-[var(--octo-row-border)] sm:hidden">
          {filtered.map((row) => {
            const emp = employeeById.get(row.employeeId);
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => setOpenId(row.id)}
                className="flex w-full items-center justify-between gap-3 py-2.5 text-start"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{emp?.name ?? row.employeeId}</span>
                  <span className="block truncate text-[11px] text-[var(--octo-text-muted)]">{sar(row.netInput)}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <Badge tone={STATUS_TONE[row.status]}>{t(STATUS_KEY[row.status])}</Badge>
                  <ChevronRight size={15} className="text-[var(--octo-text-faint)] rtl:rotate-180" />
                </span>
              </button>
            );
          })}
        </div>

        <div className="octo-scroll mt-3 hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[1080px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--octo-divider)] text-start">
                {["staff.col.employee", "staff.payroll.col.baseSalary", "staff.payroll.col.overtimeHours", "staff.payroll.col.overtimePay", "staff.payroll.col.tips", "staff.payroll.col.deductions", "staff.payroll.col.allowances", "staff.payroll.col.netInput", "staff.col.status"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const emp = employeeById.get(row.employeeId);
                return (
                  <tr key={row.id} className="cursor-pointer border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]" onClick={() => setOpenId(row.id)}>
                    <td className="whitespace-nowrap px-2 py-2.5">
                      <div className="font-semibold text-[var(--octo-text-primary)]">{emp?.name ?? row.employeeId}</div>
                      <div className="text-[11px] text-[var(--octo-text-muted)]">{emp?.role}</div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{sar(row.baseSalary)}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-primary)]">{row.overtimeHours ? `${row.overtimeHours}h` : "—"}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{row.overtimePay ? sar(row.overtimePay) : "—"}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{row.tips ? sar(row.tips) : "—"}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{row.deductions ? sar(row.deductions) : "—"}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{sar(row.allowances)}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 font-semibold text-[var(--octo-text-primary)]">{sar(row.netInput)}</td>
                    <td className="whitespace-nowrap px-2 py-2.5"><Badge tone={STATUS_TONE[row.status]}>{t(STATUS_KEY[row.status])}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <EmptyState
              icon={<ClipboardList size={18} />}
              title={t("staff.payroll.emptyTitle")}
              description={t("staff.payroll.emptyDescription")}
              action={<Button variant="secondary" size="sm" onClick={clearFilters}>{t("customers.clearFilters")}</Button>}
            />
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11.5px] text-[var(--octo-text-muted)]">
            {t("staff.payroll.footer.summary")
              .replace("{n}", String(filtered.length))
              .replace("{total}", sar(totalFiltered))}
          </span>
          <Button
            variant="primary"
            size="sm"
            icon={<Upload size={13} />}
            disabled={effectiveStatus === "Exported" || effectiveStatus === "Locked"}
            onClick={() => setExportOpen(true)}
          >
            {t("staff.payroll.export")}
          </Button>
        </div>

        {justExported && (
          <div className="mt-3 flex items-center gap-1.5 rounded-[9px] bg-[#eafbe9] px-3 py-2 text-[11.5px] font-medium text-[#16a34a]">
            <FileCheck2 size={13} />
            {t("staff.payroll.exportedConfirm").replace("{period}", period.label)}
          </div>
        )}
      </section>

      <PayrollDrawer
        row={openRow}
        employeeName={openRow ? employeeById.get(openRow.employeeId)?.name ?? "" : ""}
        onClose={() => setOpenId(null)}
        onSave={handleSave}
      />

      <Modal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title={t("staff.payroll.modal.title")}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setExportOpen(false)}>{t("common.cancel")}</Button>
            <Button variant="primary" size="sm" onClick={confirmExport}>{t("staff.payroll.modal.confirm")}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-2 text-[12.5px] text-[var(--octo-text-secondary)]">
          <p>
            {t("staff.payroll.modal.summary")
              .replace("{period}", period.label)
              .replace("{employees}", String(rows.length))
              .replace("{total}", sar(totalAll))}
          </p>
          <p className="flex items-center gap-1.5 text-[#F59E0B]">
            <Lock size={13} />
            {t("staff.payroll.modal.warning")}
          </p>
        </div>
      </Modal>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: ReactNode }) {
  return (
    <article className="flex flex-col rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{label}</p>
      <p className="mt-2 whitespace-nowrap text-[28px] font-bold leading-none tracking-[-0.02em] text-[var(--octo-text-primary)]">{value}</p>
      {sub && <p className="mt-1.5 text-[11.5px] text-[var(--octo-text-muted)]">{sub}</p>}
    </article>
  );
}

function PayrollDrawer({
  row,
  employeeName,
  onClose,
  onSave,
}: {
  row: PayrollRow | null;
  employeeName: string;
  onClose: () => void;
  onSave: (id: string, patch: Partial<PayrollRow>) => void;
}) {
  const { t } = useI18n();
  const [editOpen, setEditOpen] = useState(false);
  const [savedNote, setSavedNote] = useState(false);
  const open = Boolean(row);

  useEffect(() => { setEditOpen(false); setSavedNote(false); }, [row?.id]);
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
        aria-label={t("staff.payroll.drawer.title")}
        className={`absolute inset-y-0 end-0 flex w-full flex-col bg-[var(--octo-card)] shadow-xl transition-transform duration-200 sm:w-[430px] ${open ? "translate-x-0" : "translate-x-full rtl:-translate-x-full"}`}
      >
        {row && (
          <>
            <div className="flex items-center justify-between border-b border-[var(--octo-divider)] px-[18px] py-[15px]">
              <h2 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{t("staff.payroll.drawer.title")}</h2>
              <button type="button" aria-label={t("common.cancel")} onClick={onClose} className="grid h-7 w-7 place-items-center rounded-[7px] text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)]">
                <X size={15} />
              </button>
            </div>

            <div className="octo-scroll flex-1 overflow-y-auto px-[18px] py-[15px]">
              {savedNote && (
                <div className="mb-3 rounded-[9px] bg-[#eafbe9] px-3 py-2 text-center text-[11.5px] font-medium text-[#16a34a]">{t("staff.payroll.drawer.savedNote")}</div>
              )}
              <h3 className="text-[15px] font-bold text-[var(--octo-text-primary)]">{employeeName}</h3>
              <div className="mt-1 flex items-center gap-2">
                <Badge tone={STATUS_TONE[row.status]}>{t(STATUS_KEY[row.status])}</Badge>
                {row.status === "Locked" && (
                  <span className="flex items-center gap-1 text-[11.5px] text-[var(--octo-text-muted)]"><Lock size={12} />{t("staff.payroll.drawer.lockedNote")}</span>
                )}
              </div>

              <div className="mt-4">
                <h4 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("staff.payroll.drawer.breakdown")}</h4>
                <div className="mt-2 flex flex-col rounded-[9px] border border-[var(--octo-divider)]">
                  <BreakdownRow label={t("staff.payroll.col.baseSalary")} value={sar(row.baseSalary)} />
                  <BreakdownRow label={t("staff.payroll.col.overtimePay")} value={row.overtimePay ? sar(row.overtimePay) : "—"} note={row.overtimeHours ? `${row.overtimeHours}h` : undefined} />
                  <BreakdownRow label={t("staff.payroll.col.tips")} value={row.tips ? sar(row.tips) : "—"} />
                  <BreakdownRow label={t("staff.payroll.col.allowances")} value={sar(row.allowances)} />
                  <BreakdownRow label={t("staff.payroll.col.deductions")} value={row.deductions ? `-${sar(row.deductions)}` : "—"} />
                  <BreakdownRow
                    label={t("staff.payroll.drawer.gosi")}
                    value={`-${sar(row.gosi)}`}
                    note={t("staff.payroll.drawer.gosiNote")}
                  />
                  <div className="flex items-center justify-between rounded-b-[9px] bg-[var(--octo-row-hover)] px-3 py-2.5">
                    <span className="text-[12px] font-semibold text-[var(--octo-text-primary)]">{t("staff.payroll.col.netInput")}</span>
                    <span className="text-[14px] font-bold text-[var(--octo-text-primary)]">{sar(row.netInput)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("staff.payroll.drawer.auditTrail")}</h4>
                {row.auditTrail.length > 0 ? (
                  <div className="octo-scroll mt-2 overflow-x-auto">
                    <table className="w-full min-w-[360px] border-collapse text-[11.5px]">
                      <thead>
                        <tr className="border-b border-[var(--octo-divider)] text-start">
                          {["staff.payroll.drawer.auditDate", "staff.payroll.drawer.auditField", "staff.payroll.drawer.auditFrom", "staff.payroll.drawer.auditTo", "staff.payroll.drawer.auditEditedBy"].map((h) => (
                            <th key={h} className="whitespace-nowrap px-2 py-1.5 text-start text-[10px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t(h)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {row.auditTrail.map((a, i) => (
                          <tr key={i} className="border-b border-[var(--octo-row-border)] last:border-0">
                            <td className="whitespace-nowrap px-2 py-2 text-[var(--octo-text-secondary)]">{a.date}</td>
                            <td className="whitespace-nowrap px-2 py-2 font-medium text-[var(--octo-text-primary)]">{a.field}</td>
                            <td className="whitespace-nowrap px-2 py-2 text-[var(--octo-text-secondary)]">{a.oldValue}</td>
                            <td className="whitespace-nowrap px-2 py-2 text-[var(--octo-text-secondary)]">{a.newValue}</td>
                            <td className="whitespace-nowrap px-2 py-2 text-[var(--octo-text-secondary)]">{a.editedBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-2 text-[12.5px] text-[var(--octo-text-secondary)]">{t("staff.payroll.drawer.noAudit")}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-[var(--octo-divider)] px-[18px] py-[15px]">
              {row.status === "Draft" ? (
                <Button variant="primary" size="sm" icon={<Pencil size={13} />} onClick={() => setEditOpen(true)}>
                  {t("staff.payroll.drawer.edit")}
                </Button>
              ) : (
                <span className="text-[11.5px] text-[var(--octo-text-muted)]">{t("staff.payroll.drawer.onlyDraftEditable")}</span>
              )}
            </div>
          </>
        )}
      </div>

      {row && (
        <EditPayrollModal
          open={editOpen}
          row={row}
          onClose={() => setEditOpen(false)}
          onSave={(patch) => {
            onSave(row.id, patch);
            setEditOpen(false);
            setSavedNote(true);
          }}
        />
      )}
    </div>
  );
}

function BreakdownRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--octo-divider)] px-3 py-2.5 last:border-0">
      <div>
        <span className="text-[12px] text-[var(--octo-text-secondary)]">{label}</span>
        {note && <p className="text-[10.5px] text-[var(--octo-text-faint)]">{note}</p>}
      </div>
      <span className="text-end text-[12.5px] font-medium text-[var(--octo-text-primary)]">{value}</span>
    </div>
  );
}

function EditPayrollModal({
  open,
  row,
  onClose,
  onSave,
}: {
  open: boolean;
  row: PayrollRow;
  onClose: () => void;
  onSave: (patch: Partial<PayrollRow>) => void;
}) {
  const { t } = useI18n();
  const [otHours, setOtHours] = useState(String(row.overtimeHours));
  const [deductions, setDeductions] = useState(String(row.deductions));
  const [allowances, setAllowances] = useState(String(row.allowances));

  useEffect(() => {
    if (open) {
      setOtHours(String(row.overtimeHours));
      setDeductions(String(row.deductions));
      setAllowances(String(row.allowances));
    }
  }, [open, row]);

  const otH = Math.max(0, Number(otHours) || 0);
  const ded = Math.max(0, Number(deductions) || 0);
  const allow = Math.max(0, Number(allowances) || 0);
  const overtimePay = Math.round(otH * (row.baseSalary / 240) * 1.5);
  const netInput = row.baseSalary + overtimePay + row.tips - ded - allow - row.gosi;

  const submit = () => {
    const newTrail = [...row.auditTrail];
    const push = (field: string, from: string, to: string) => {
      if (from !== to) newTrail.push({ date: TODAY, field, oldValue: from, newValue: to, editedBy: "Al Bahri Group" });
    };
    push("Overtime Hours", String(row.overtimeHours), String(otH));
    push("Deductions", String(row.deductions), String(ded));
    push("Allowances", String(row.allowances), String(allow));
    onSave({ overtimeHours: otH, overtimePay, deductions: ded, allowances: allow, netInput, auditTrail: newTrail });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("staff.payroll.editModal.title")}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>{t("common.cancel")}</Button>
          <Button variant="primary" size="sm" onClick={submit}>{t("staff.payroll.editModal.confirm")}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label={t("staff.payroll.editModal.overtimeHours")} type="number" min={0} value={otHours} onChange={(e) => setOtHours(e.target.value)} />
          <Input label={t("staff.payroll.editModal.deductions")} type="number" min={0} value={deductions} onChange={(e) => setDeductions(e.target.value)} />
        </div>
        <Input label={t("staff.payroll.editModal.allowances")} type="number" min={0} value={allowances} onChange={(e) => setAllowances(e.target.value)} />
        <p className="text-[11.5px] text-[var(--octo-text-muted)]">{t("staff.payroll.editModal.otRateNote")}</p>
        <div className="flex items-center justify-between rounded-[9px] bg-[var(--octo-row-hover)] px-3 py-2.5">
          <span className="text-[12px] font-semibold text-[var(--octo-text-primary)]">{t("staff.payroll.editModal.netPreview")}</span>
          <span className="text-[14px] font-bold text-[var(--octo-text-primary)]">{sar(netInput)}</span>
        </div>
      </div>
    </Modal>
  );
}
