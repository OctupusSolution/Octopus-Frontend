import { useEffect, useState } from "react";
import { CalendarOff, ListChecks, SquarePen } from "lucide-react";
import clsx from "clsx";
import { createTimeOffType, deleteTimeOffType, updateTimeOffType } from "@octopus/api-client";
import { EmptyState, Modal } from "@ui/primitives";
import { TODAY } from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";
import { Avatar } from "../_shared/avatar";
import { buttonClass } from "../_shared/buttons";
import { Field, SelectInput, TextInput } from "../_shared/form";
import { formatShortDate } from "../_shared/format";
import { useStaffLabels } from "../_shared/labels";
import { useCatalogNames } from "../_shared/catalog-names";
import { useStaffStore, type LeaveRequest, type LeaveStatus } from "../_shared/staff-store";
import { ToastBanner, useToast } from "../_shared/toast";
import { CatalogEditor, type CatalogApi } from "../_shared/catalog-editor";
import { StatusPill } from "../_shared/status-pill";
import { Switch } from "../_shared/switch";
import { useLocalName, useTx } from "../_shared/text";

const TIME_OFF_TYPES_API: CatalogApi = { create: createTimeOffType, update: updateTimeOffType, remove: deleteTimeOffType };

/** Kinds of time off: PUT / DELETE /time-off/types/{id} (and create). */
function TimeOffTypesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const tx = useTx();
  const store = useStaffStore();
  return (
    <Modal open={open} onClose={onClose} title={tx("Leave types", "أنواع الإجازات")} className="max-w-2xl">
      <p className="-mt-1 mb-4 text-[13px] text-[var(--octo-text-secondary)]">
        {tx(
          "Deactivating a type stops new requests of that kind and keeps every absence already recorded against it.",
          "تعطيل النوع يمنع الطلبات الجديدة منه ويحافظ على كل الإجازات المسجلة به."
        )}
      </p>
      <CatalogEditor
        rows={store.timeOffTypes}
        api={TIME_OFF_TYPES_API}
        onChanged={store.reloadTimeOffTypes}
        addLabel={tx("Add type", "إضافة نوع")}
        emptyText={tx("No leave types yet. Add Annual, Sick or whatever your business offers.", "لا توجد أنواع إجازات بعد. أضف سنوية أو مرضية أو ما يقدمه نشاطك.")}
      />
    </Modal>
  );
}

const STATUS_TEXT: Record<LeaveStatus, string> = {
  pending: "text-[var(--octo-text-primary)]",
  approved: "text-[var(--octo-tone-success-text)]",
  rejected: "text-[var(--octo-tone-danger-text)]",
};

type Errors = { employee?: string; type?: string; start?: string; end?: string };

function AddTimeOffModal({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (name: string) => void }) {
  const { t } = useI18n();
  const tx = useTx();
  const localName = useLocalName();
  const store = useStaffStore();
  const activeTypes = store.timeOffTypes.filter((ty) => ty.isActive);
  const [employeeId, setEmployeeId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [grant, setGrant] = useState(false);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (!open) return;
    setEmployeeId("");
    setTypeId(activeTypes[0]?.id ?? "");
    setStart("");
    setEnd("");
    setGrant(false);
    setNote("");
    setErrors({});
    // Seed each time the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = () => {
    const next: Errors = {};
    if (!employeeId) next.employee = t("staff.validation.required");
    const type = activeTypes.find((ty) => ty.id === typeId);
    if (!type) next.type = activeTypes.length ? t("staff.validation.required") : tx("Add a leave type first.", "أضف نوع إجازة أولًا.");
    if (!start) next.start = t("staff.validation.required");
    if (!end) next.end = t("staff.validation.required");
    else if (start && end < start) next.end = t("staff.validation.dateRange");
    if (Object.keys(next).length || !type) {
      setErrors(next);
      return;
    }
    const employee = store.employees.find((e) => e.id === employeeId)!;
    const request: LeaveRequest = {
      id: `LR-${Date.now().toString(36)}`,
      employeeId,
      employeeName: employee.name,
      typeId: type.id,
      type: type.nameEn,
      typeAr: type.nameAr,
      start,
      end,
      // A grant (POST /time-off/grants) is approved on creation and stays marked as given.
      status: grant ? "approved" : "pending",
      origin: grant ? "DirectGrant" : "RaisedOnBehalf",
      note: grant ? note : undefined,
    };
    store.setLeaveRequests((prev) => [request, ...prev]);
    onAdded(employee.name);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={t("staff.timeOff.addTitle")} className="max-w-2xl p-6 [&>h2]:text-[22px] [&>h2]:font-bold">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-2 flex flex-col gap-5"
      >
        <Field label={t("staff.timeOff.employee")} htmlFor="to-employee" required error={errors.employee}>
          <SelectInput id="to-employee" value={employeeId} invalid={!!errors.employee} onChange={(e) => { setEmployeeId(e.target.value); setErrors((p) => ({ ...p, employee: undefined })); }}>
            <option value="">{t("staff.assignShift.selectEmployee")}</option>
            {store.employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label={t("staff.timeOff.type")} htmlFor="to-type" required error={errors.type}>
          <SelectInput id="to-type" value={typeId} invalid={!!errors.type} onChange={(e) => { setTypeId(e.target.value); setErrors((p) => ({ ...p, type: undefined })); }}>
            {activeTypes.length === 0 && <option value="">{tx("No leave types yet", "لا توجد أنواع إجازات")}</option>}
            {activeTypes.map((ty) => (
              <option key={ty.id} value={ty.id}>{localName(ty)}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label={t("staff.timeOff.startDate")} htmlFor="to-start" required error={errors.start}>
          <TextInput id="to-start" type="date" value={start} min={TODAY} invalid={!!errors.start} onChange={(e) => { setStart(e.target.value); setErrors((p) => ({ ...p, start: undefined, end: undefined })); }} />
        </Field>
        <Field label={t("staff.timeOff.endDate")} htmlFor="to-end" required error={errors.end}>
          <TextInput id="to-end" type="date" value={end} min={start || TODAY} invalid={!!errors.end} onChange={(e) => { setEnd(e.target.value); setErrors((p) => ({ ...p, end: undefined })); }} />
        </Field>
        <div className="flex flex-col gap-2 rounded-[10px] bg-[var(--octo-hover)] px-3 py-3">
          <label className="flex cursor-pointer items-center gap-3">
            <Switch checked={grant} onChange={setGrant} label={tx("Grant directly", "منح مباشر")} />
            <span className="min-w-0">
              <span className="block text-[14px] font-medium text-[var(--octo-text-primary)]">{tx("Grant directly (approved now)", "منح مباشر (معتمد فورًا)")}</span>
              <span className="block text-[12px] text-[var(--octo-text-secondary)]">
                {tx("Recorded as given by you rather than requested. Shifts it covers are not cancelled.", "يُسجَّل كمنحة منك وليس كطلب. لا تُلغى الورديات التي يغطيها.")}
              </span>
            </span>
          </label>
          {grant && (
            <TextInput value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder={tx("Note (optional)", "ملاحظة (اختياري)")} aria-label={tx("Note", "ملاحظة")} />
          )}
        </div>
        <button type="submit" className={buttonClass("primary", "lg", "mt-1 h-12 w-full text-[16px]")}>
          {grant ? tx("Grant time off", "منح الإجازة") : t("staff.timeOff.add")}
        </button>
      </form>
    </Modal>
  );
}

export function TimeOffView({ addOpen, onAddOpenChange }: { addOpen: boolean; onAddOpenChange: (open: boolean) => void }) {
  const { t, locale } = useI18n();
  const labels = useStaffLabels();
  const names = useCatalogNames();
  const store = useStaffStore();
  const { toast, notify } = useToast();
  const tx = useTx();
  const [typesOpen, setTypesOpen] = useState(false);

  const typeLabel = (r: LeaveRequest) => (locale === "ar" ? r.typeAr || r.type : r.type || r.typeAr);

  const decide = (id: string, status: Exclude<LeaveStatus, "pending">) => {
    const request = store.leaveRequests.find((r) => r.id === id);
    if (!request) return;
    store.setLeaveRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    notify(
      t(status === "approved" ? "staff.timeOff.toastApproved" : "staff.timeOff.toastRejected")
        .replace("{employee}", request.employeeName)
        .replace("{type}", typeLabel(request))
    );
  };

  const columns = ["employee", "type", "startDate", "endDate", "status", "actions"] as const;

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button type="button" onClick={() => setTypesOpen(true)} className={buttonClass("outline", "md")}>
          <ListChecks size={18} aria-hidden />
          {tx("Leave types", "أنواع الإجازات")} ({store.timeOffTypes.length})
        </button>
      </div>
      {store.leaveRequests.length === 0 ? (
        <div className="rounded-[16px] border border-[var(--octo-border-card)] bg-[var(--octo-card)]">
          <EmptyState icon={<CalendarOff size={18} />} title={t("staff.timeOff.emptyTitle")} description={t("staff.timeOff.emptyDescription")} />
        </div>
      ) : (
        <div className="octo-scroll overflow-x-auto rounded-[16px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
          <table className="w-full min-w-[980px] border-collapse text-[15px]">
            <thead>
              <tr className="bg-[var(--octo-hover)]">
                {columns.map((col) => (
                  <th
                    key={col}
                    scope="col"
                    className={clsx(
                      "whitespace-nowrap px-3 py-2 text-[13px] font-medium text-[var(--octo-text-primary)] first:rounded-s-[6px] last:rounded-e-[6px]",
                      col === "employee" ? "text-start ps-16" : "text-center"
                    )}
                  >
                    {t(`staff.timeOff.column.${col}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {store.leaveRequests.map((r) => {
                const profile = r.employeeId ? store.profileOf(r.employeeId) : null;
                const decided = r.status !== "pending";
                return (
                  <tr key={r.id} className="border-b border-[var(--octo-divider)] last:border-b-0">
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-3">
                        <Avatar name={r.employeeName} size={44} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-[var(--octo-text-primary)]">{r.employeeName}</span>
                          {profile && <span className="block truncate text-[13px] text-[#0D6EFD]">{names.jobTitle(profile.jobTitle)}</span>}
                        </span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-center text-[var(--octo-text-primary)]">
                      {typeLabel(r)}
                      {r.origin === "DirectGrant" && <StatusPill className="ms-2" tone="info" label={tx("Granted", "ممنوحة")} />}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-center text-[var(--octo-text-primary)]">{formatShortDate(r.start, locale)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-center text-[var(--octo-text-primary)]">{formatShortDate(r.end, locale)}</td>
                    <td className={clsx("whitespace-nowrap px-3 py-3 text-center font-medium", STATUS_TEXT[r.status])}>
                      {t(`staff.timeOff.status.${r.status}`)}
                    </td>
                    <td className="px-3 py-3">
                      <span className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          disabled={decided}
                          onClick={() => decide(r.id, "approved")}
                          title={decided ? t("staff.timeOff.alreadyDecided") : undefined}
                          className={buttonClass("successSoft", "md", "font-medium disabled:opacity-50")}
                        >
                          <SquarePen size={18} aria-hidden />
                          {t("staff.timeOff.approve")}
                        </button>
                        <button
                          type="button"
                          disabled={decided}
                          onClick={() => decide(r.id, "rejected")}
                          title={decided ? t("staff.timeOff.alreadyDecided") : undefined}
                          className={buttonClass("dangerSoft", "md", "font-medium disabled:opacity-50")}
                        >
                          <SquarePen size={18} aria-hidden />
                          {t("staff.timeOff.reject")}
                        </button>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AddTimeOffModal
        open={addOpen}
        onClose={() => onAddOpenChange(false)}
        onAdded={(name) => notify(t("staff.timeOff.toastAdded").replace("{employee}", name))}
      />

      <TimeOffTypesModal open={typesOpen} onClose={() => setTypesOpen(false)} />

      <ToastBanner toast={toast} />
    </div>
  );
}
