import { useState } from "react";
import { Check, Clock, Plus } from "lucide-react";
import clsx from "clsx";
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { buttonClass } from "../_shared/buttons";
import { ConfirmModal } from "../_shared/confirm-modal";
import { Field, TextInput } from "../_shared/form";
import { formatTime, shiftDurationHours } from "../_shared/format";
import { useStaffLabels } from "../_shared/labels";
import { RowMenu } from "../_shared/row-menu";
import { useStaffStore, type ShiftTemplate } from "../_shared/staff-store";
import { ToastBanner, useToast } from "../_shared/toast";

export const SWATCHES = ["#0D6EFD", "#7C3AED", "#DB2777", "#D97706", "#16A34A", "#0891B2", "#0F172A"];

export function ColorSwatches({ value, onChange, label }: { value: string; onChange: (color: string) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {SWATCHES.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === color}
          aria-label={color}
          onClick={() => onChange(color)}
          style={{ backgroundColor: color }}
          className={clsx(
            "grid h-8 w-8 place-items-center rounded-full text-white ring-offset-2 ring-offset-[var(--octo-card)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]",
            value === color && "ring-2 ring-[var(--octo-text-primary)]"
          )}
        >
          {value === color && <Check size={16} strokeWidth={3} />}
        </button>
      ))}
    </div>
  );
}

type FormState = { mode: "add" } | { mode: "edit"; template: ShiftTemplate } | null;

export function TemplatesView() {
  const { t, locale } = useI18n();
  const labels = useStaffLabels();
  const store = useStaffStore();
  const { toast, notify } = useToast();
  const [menuId, setMenuId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShiftTemplate | null>(null);
  const [name, setName] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [color, setColor] = useState(SWATCHES[0]);
  const [errors, setErrors] = useState<{ name?: string; time?: string }>({});

  const usage = (id: string) => Object.values(store.shifts).filter((s) => s.templateId === id).length;

  const openForm = (state: Exclude<FormState, null>) => {
    const tpl = state.mode === "edit" ? state.template : null;
    setName(tpl ? labels.data("staff.template", tpl.name) : "");
    setStart(tpl?.start ?? "09:00");
    setEnd(tpl?.end ?? "17:00");
    setColor(tpl?.color ?? SWATCHES[store.templates.length % SWATCHES.length]);
    setErrors({});
    setForm(state);
  };

  const save = () => {
    const trimmed = name.trim();
    const next: typeof errors = {};
    if (!trimmed) next.name = t("staff.validation.required");
    if (!start || !end || start === end) next.time = t("staff.validation.timeRange");
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    if (form?.mode === "edit") {
      const tpl = form.template;
      const storedName = trimmed === labels.data("staff.template", tpl.name) ? tpl.name : trimmed;
      store.setTemplates((prev) => prev.map((p) => (p.id === tpl.id ? { ...p, name: storedName, start, end, color } : p)));
      notify(t("staff.shiftsTab.templates.toastUpdated").replace("{name}", trimmed));
    } else {
      store.setTemplates((prev) => [...prev, { id: `tpl-${Date.now().toString(36)}`, name: trimmed, start, end, color }]);
      notify(t("staff.shiftsTab.templates.toast").replace("{name}", trimmed));
    }
    setForm(null);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] text-[var(--octo-text-secondary)]">{t("staff.shiftsTab.templates.subtitle")}</p>
        <button type="button" onClick={() => openForm({ mode: "add" })} className={buttonClass("primary", "lg")}>
          <Plus size={20} aria-hidden />
          {t("staff.shiftsTab.templates.addTemplate")}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {store.templates.map((tpl) => {
          const count = usage(tpl.id);
          return (
            <article key={tpl.id} className="relative overflow-hidden rounded-[12px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4 ps-5">
              <span aria-hidden className="absolute inset-y-0 start-0 w-1.5" style={{ backgroundColor: tpl.color }} />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-[16px] font-semibold text-[var(--octo-text-primary)]">{labels.data("staff.template", tpl.name)}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-[14px] text-[var(--octo-text-secondary)]">
                    <Clock size={15} aria-hidden />
                    {formatTime(tpl.start, locale)} – {formatTime(tpl.end, locale)}
                  </p>
                </div>
                <RowMenu
                  open={menuId === tpl.id}
                  onOpenChange={(open) => setMenuId(open ? tpl.id : null)}
                  ariaLabel={t("staff.grid.moreActions").replace("{name}", labels.data("staff.template", tpl.name))}
                  items={[
                    { key: "edit", label: t("staff.grid.menu.edit"), onSelect: () => openForm({ mode: "edit", template: tpl }) },
                    {
                      key: "delete",
                      label: t("staff.grid.menu.delete"),
                      tone: "danger",
                      onSelect: () => {
                        if (count > 0) {
                          notify(t("staff.shiftsTab.templates.inUse").replace("{count}", String(count)), "error");
                          return;
                        }
                        setDeleteTarget(tpl);
                      },
                    },
                  ]}
                />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[var(--octo-divider)] pt-3 text-[13px]">
                <span className="text-[var(--octo-text-primary)]">
                  {t("staff.shiftsTab.duration").replace("{hours}", String(shiftDurationHours(tpl.start, tpl.end)))}
                </span>
                <span className="text-[var(--octo-text-secondary)]">{t("staff.shiftsTab.templates.usage").replace("{count}", String(count))}</span>
              </div>
            </article>
          );
        })}
      </div>

      <Modal
        open={Boolean(form)}
        onClose={() => setForm(null)}
        title={t(form?.mode === "edit" ? "staff.shiftsTab.templates.editTemplateTitle" : "staff.shiftsTab.templates.addTemplateTitle")}
        className="max-w-md"
        footer={
          <>
            <button type="button" onClick={() => setForm(null)} className={buttonClass("secondary")}>{t("common.cancel")}</button>
            <button type="button" onClick={save} className={buttonClass("primary")}>{t("staff.shiftsTab.templates.save")}</button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label={t("staff.shiftsTab.templates.name")} htmlFor="tpl-name" error={errors.name}>
            <TextInput
              id="tpl-name"
              autoFocus
              value={name}
              invalid={!!errors.name}
              placeholder={t("staff.shiftsTab.templates.namePlaceholder")}
              onChange={(e) => {
                setName(e.target.value);
                setErrors((p) => ({ ...p, name: undefined }));
              }}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("staff.shiftsTab.templates.startTime")} htmlFor="tpl-start" error={errors.time}>
              <TextInput id="tpl-start" type="time" value={start} invalid={!!errors.time} onChange={(e) => { setStart(e.target.value); setErrors((p) => ({ ...p, time: undefined })); }} />
            </Field>
            <Field label={t("staff.shiftsTab.templates.endTime")} htmlFor="tpl-end">
              <TextInput id="tpl-end" type="time" value={end} onChange={(e) => { setEnd(e.target.value); setErrors((p) => ({ ...p, time: undefined })); }} />
            </Field>
          </div>
          <Field label={t("staff.shiftsTab.shiftRoles.color")}>
            <ColorSwatches value={color} onChange={setColor} label={t("staff.shiftsTab.shiftRoles.color")} />
          </Field>
          {form?.mode === "edit" && <p className="text-[12px] text-[var(--octo-text-secondary)]">{t("staff.shiftsTab.templates.editHint")}</p>}
        </div>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={t("staff.shiftsTab.templates.deleteTitle")}
        body={t("staff.shiftsTab.templates.deleteBody").replace("{name}", deleteTarget ? labels.data("staff.template", deleteTarget.name) : "")}
        confirmLabel={t("staff.grid.menu.delete")}
        cancelLabel={t("common.cancel")}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          store.setTemplates((prev) => prev.filter((p) => p.id !== deleteTarget.id));
          notify(t("staff.shiftsTab.templates.toastDeleted").replace("{name}", labels.data("staff.template", deleteTarget.name)));
        }}
      />

      <ToastBanner toast={toast} />
    </div>
  );
}

