import { useEffect, useState } from "react";
import clsx from "clsx";
import { createTimeOffType, deleteTimeOffType, updateTimeOffType } from "@octopus/api-client";
import { EmptyState, Modal } from "@ui/primitives";
import { TODAY } from "@/shared/api/mock-staff";
import { useI18n } from "@/app/providers/i18n-provider";
import { Avatar } from "../_shared/avatar";
import { buttonClass } from "../_shared/buttons";
import { DateInput, Field, SelectInput, TextInput } from "../_shared/form";
import { formatShortDate } from "../_shared/format";
import { StaffIcon } from "../_shared/icon";
import { useStaffLabels } from "../_shared/labels";
import { useCatalogNames } from "../_shared/catalog-names";
import { StaffModal } from "../_shared/staff-modal";
import { useStaffStore, type LeaveRequest, type LeaveStatus } from "../_shared/staff-store";
import { FILL_BLUE, FILL_GREEN, FILL_RED, INK, INK_LINK, INK_SOFT, LINE, TEXT_GREEN, TEXT_RED } from "../_shared/theme";
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
  pending: INK,
  approved: TEXT_GREEN,
  rejected: TEXT_RED,
};

// The frame's row actions: 32px tall on a 4px radius, a 24px glyph beside
// 14px medium text; a decided row keeps them at half strength.
const ROW_ACTION =
  "inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] px-2 text-[14px] font-medium leading-[14px] transition-[filter,opacity] hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100";

const CELL = "whitespace-nowrap px-3 text-center text-[14px] font-medium leading-[14px]";

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
    <StaffModal
      open={open}
      onClose={onClose}
      title={t("staff.timeOff.addTitle")}
      submitLabel={grant ? tx("Grant time off", "منح الإجازة") : t("staff.timeOff.add")}
      onSubmit={submit}
    >
      {/* This frame spaces its fields by 24px, the same step as its title and action. */}
      <div className="flex flex-col gap-6">
        <Field label={t("staff.timeOff.employee")} htmlFor="to-employee" required error={errors.employee}>
          <SelectInput
            id="to-employee"
            value={employeeId}
            invalid={!!errors.employee}
            // The unpicked prompt reads as a placeholder (#58606c) in the frame.
            className={clsx(!employeeId && "!text-[#58606c] [[data-theme=dark]_&]:!text-[var(--octo-text-secondary)]")}
            onChange={(e) => { setEmployeeId(e.target.value); setErrors((p) => ({ ...p, employee: undefined })); }}
          >
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
          <DateInput
            id="to-start"
            value={start}
            min={TODAY}
            invalid={!!errors.start}
            placeholder={tx("Select start day", "اختر يوم البداية")}
            onChange={(iso) => { setStart(iso); setErrors((p) => ({ ...p, start: undefined, end: undefined })); }}
          />
        </Field>
        <Field label={t("staff.timeOff.endDate")} htmlFor="to-end" required error={errors.end}>
          <DateInput
            id="to-end"
            value={end}
            min={start || TODAY}
            invalid={!!errors.end}
            placeholder={tx("Select end day", "اختر يوم النهاية")}
            onChange={(iso) => { setEnd(iso); setErrors((p) => ({ ...p, end: undefined })); }}
          />
        </Field>
        {/* Not in the frame: the direct-grant option, kept in the frame's own field colours. */}
        <div className={clsx("flex flex-col gap-3 rounded-[12px] p-3", FILL_BLUE)}>
          <label className="flex cursor-pointer items-center gap-2">
            <Switch checked={grant} onChange={setGrant} label={tx("Grant directly", "منح مباشر")} />
            <span className="flex min-w-0 flex-col gap-1">
              <span className={clsx("text-[14px] font-semibold leading-[14px]", INK)}>{tx("Grant directly (approved now)", "منح مباشر (معتمد فورًا)")}</span>
              <span className={clsx("text-[12px] leading-[1.4]", INK_SOFT)}>
                {tx("Recorded as given by you rather than requested. Shifts it covers are not cancelled.", "يُسجَّل كمنحة منك وليس كطلب. لا تُلغى الورديات التي يغطيها.")}
              </span>
            </span>
          </label>
          {grant && (
            <TextInput value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder={tx("Note (optional)", "ملاحظة (اختياري)")} aria-label={tx("Note", "ملاحظة")} />
          )}
        </div>
      </div>
    </StaffModal>
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
        <button type="button" onClick={() => setTypesOpen(true)} className={buttonClass("outline", "sm")}>
          {tx("Leave types", "أنواع الإجازات")} ({store.timeOffTypes.length})
        </button>
      </div>
      {store.leaveRequests.length === 0 ? (
        <div className={clsx("rounded-[12px] border bg-[var(--octo-card)]", LINE)}>
          <EmptyState icon={<StaffIcon name="staff-calendar.svg" size={18} />} title={t("staff.timeOff.emptyTitle")} description={t("staff.timeOff.emptyDescription")} />
        </div>
      ) : (
        <div className={clsx("octo-scroll overflow-x-auto rounded-[12px] border bg-[var(--octo-card)] p-3", LINE)}>
          <table className="w-full min-w-[980px] border-collapse">
            <thead>
              <tr className="bg-[#f1f5f9] [[data-theme=dark]_&]:bg-[var(--octo-hover)]">
                {columns.map((col) => (
                  <th
                    key={col}
                    scope="col"
                    className={clsx(
                      "h-6 whitespace-nowrap px-3 py-0 text-[12px] font-medium leading-3",
                      INK,
                      col === "employee" ? "ps-12 text-start" : "text-center"
                    )}
                  >
                    {t(`staff.timeOff.column.${col}`)}
                  </th>
                ))}
              </tr>
            </thead>
            {/* 16px under the header band, then 24px above and 8px below each 32px row. */}
            <tbody className="[&>tr:first-child>td]:pt-4 [&>tr:last-child>td]:pb-0 [&>tr>td]:pb-2 [&>tr>td]:pt-6">
              {store.leaveRequests.map((r) => {
                const profile = r.employeeId ? store.profileOf(r.employeeId) : null;
                const decided = r.status !== "pending";
                return (
                  <tr key={r.id} className={clsx("border-b last:border-b-0", LINE)}>
                    <td className="pe-3">
                      <span className="flex items-start gap-2">
                        <Avatar name={r.employeeName} size={32} />
                        <span className="flex min-w-0 flex-col gap-1">
                          <span className={clsx("truncate text-[14px] font-semibold leading-[14px]", INK)}>{r.employeeName}</span>
                          {profile && <span className={clsx("truncate text-[12px] font-medium leading-3", INK_LINK)}>{names.jobTitle(profile.jobTitle)}</span>}
                        </span>
                      </span>
                    </td>
                    <td className={clsx(CELL, INK)}>
                      {typeLabel(r)}
                      {r.origin === "DirectGrant" && <StatusPill className="ms-2" tone="info" label={tx("Granted", "ممنوحة")} />}
                    </td>
                    <td className={clsx(CELL, INK)}>{formatShortDate(r.start, locale)}</td>
                    <td className={clsx(CELL, INK)}>{formatShortDate(r.end, locale)}</td>
                    <td className={clsx(CELL, STATUS_TEXT[r.status])}>
                      {t(`staff.timeOff.status.${r.status}`)}
                    </td>
                    <td className="w-px ps-3">
                      <span className="flex items-center justify-end gap-4">
                        <button
                          type="button"
                          disabled={decided}
                          onClick={() => decide(r.id, "approved")}
                          title={decided ? t("staff.timeOff.alreadyDecided") : undefined}
                          className={clsx(ROW_ACTION, FILL_GREEN, TEXT_GREEN)}
                        >
                          <StaffIcon name="crm-detail-edit.svg" size={24} />
                          {t("staff.timeOff.approve")}
                        </button>
                        <button
                          type="button"
                          disabled={decided}
                          onClick={() => decide(r.id, "rejected")}
                          title={decided ? t("staff.timeOff.alreadyDecided") : undefined}
                          className={clsx(ROW_ACTION, FILL_RED, TEXT_RED)}
                        >
                          <StaffIcon name="crm-detail-edit.svg" size={24} />
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
