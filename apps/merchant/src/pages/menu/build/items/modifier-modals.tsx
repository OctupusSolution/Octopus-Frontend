// The two dialogs the Modifiers tab opens: Add Modifier Group and Add / Edit
// Modifier option. Both are the frame's minimal forms — the group's finer
// settings live in the Edit Group panel behind it, not here.
import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";
import { Button, Modal } from "@ui/primitives";
import type { ModifierGroup, ModifierOption } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";

const inputClass =
  "mt-2 w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-3 text-[15px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-muted)]";

const labelClass = "text-[18px] font-medium text-[var(--octo-text-primary)]";

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={clsx(
        "h-[22px] w-[40px] shrink-0 rounded-full p-[2px] transition-colors",
        checked ? "bg-[var(--octo-accent)]" : "bg-[var(--octo-switch-off)]"
      )}
    >
      <span
        className={clsx(
          "block h-[18px] w-[18px] rounded-full bg-[var(--octo-knob)] transition-transform",
          checked && "translate-x-[18px] rtl:-translate-x-[18px]"
        )}
      />
    </button>
  );
}

/** The frame's dialog titles are far larger than the Modal primitive's 15px. */
function DialogTitle({ children }: { children: ReactNode }) {
  return (
    <span className="block text-[28px] font-bold leading-tight text-[var(--octo-text-primary)]">
      {children}
    </span>
  );
}

function Required() {
  return <span className="text-error"> *</span>;
}

export function ModifierGroupModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (group: Pick<ModifierGroup, "name" | "required" | "type">) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [type, setType] = useState<ModifierGroup["type"]>("single");
  const [required, setRequired] = useState(true);

  useEffect(() => {
    if (!open) return;
    setName("");
    setType("single");
    setRequired(true);
  }, [open]);

  if (!open) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title={<DialogTitle>{t("menuWiz.mod.modalGroupTitle")}</DialogTitle>}
      className="!max-w-[640px]"
    >
      <label className="block">
        <span className={labelClass}>
          {t("menuWiz.mod.modalName")}
          <Required />
        </span>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("menuWiz.mod.modalNamePlaceholder")}
          className={inputClass}
        />
      </label>

      {/* The frame forces nothing here, but a group created single and then
          switched in Edit Group loses its defaults — asking up front avoids
          that round trip. */}
      <div className="mt-5">
        <p className={labelClass}>
          {t("menuWiz.mod.groupType")}
          <Required />
        </p>
        <div role="radiogroup" className="mt-2 grid grid-cols-2 gap-2.5">
          {(["single", "multi"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={type === value}
              onClick={() => setType(value)}
              className={clsx(
                "flex items-center gap-2.5 rounded-[9px] border px-3 py-3 text-start text-[15px]",
                type === value
                  ? "border-[var(--octo-accent)] bg-[var(--octo-selected)] text-[var(--octo-accent)]"
                  : "border-[var(--octo-border-input)] text-[var(--octo-text-primary)]"
              )}
            >
              <span
                aria-hidden
                className={clsx(
                  "grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                  type === value ? "border-[var(--octo-accent)]" : "border-[var(--octo-border-input)]"
                )}
              >
                {type === value && <span className="h-2 w-2 rounded-full bg-[var(--octo-accent)]" />}
              </span>
              {t(value === "single" ? "menuWiz.mod.single" : "menuWiz.mod.multi")}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className={labelClass}>
          {t("menuWiz.mod.selectionType")}
          <Required />
        </p>
        <div className="mt-2 flex items-center gap-2.5">
          <Switch
            checked={required}
            label={t("menuWiz.mod.requiredGroup")}
            onChange={() => setRequired((r) => !r)}
          />
          <span className="text-[15px] font-medium text-[var(--octo-text-primary)]">
            {t("menuWiz.mod.requiredGroup")}
          </span>
        </div>
      </div>

      <Button
        className="mt-6 w-full justify-center py-3 text-[16px] font-semibold"
        disabled={name.trim() === ""}
        // The switch decides `min` and the type decides `max` — the caller
        // derives both, so the dialog does not have to know the rules.
        onClick={() => onSave({ name: name.trim(), required, type })}
      >
        {t("menuWiz.mod.saveGroup")}
      </Button>
    </Modal>
  );
}

export function ModifierOptionModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  /** Present when editing an existing row; the dialog then starts filled. */
  initial?: ModifierOption | null;
  onClose: () => void;
  onSave: (option: Omit<ModifierOption, "id">) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [subLabel, setSubLabel] = useState("");
  // Empty until chosen: the frame shows the "Choose price type" placeholder,
  // and silently defaulting to No change would save options that were never
  // priced on purpose.
  const [priceType, setPriceType] = useState<ModifierOption["priceType"] | "">("");
  const [price, setPrice] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setSubLabel(initial?.subLabel ?? "");
    setPriceType(initial?.priceType ?? "");
    setPrice(initial && initial.priceType !== "no-change" ? String(initial.price) : "");
    setIsDefault(initial?.isDefault ?? false);
    setAvailable(initial?.available ?? true);
  }, [open, initial]);

  if (!open) return null;

  const noChange = priceType === "no-change";
  const amount = Number(price) || 0;
  const canSave =
    name.trim() !== "" && priceType !== "" && (noChange || amount > 0);

  return (
    <Modal
      open
      onClose={onClose}
      title={
        <DialogTitle>
          {t(initial ? "menuWiz.mod.modalOptionEditTitle" : "menuWiz.mod.modalOptionTitle")}
        </DialogTitle>
      }
      className="!max-w-[640px]"
    >
      <label className="block">
        <span className={labelClass}>
          {t("menuWiz.mod.optionName")}
          <Required />
        </span>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("menuWiz.mod.optionNamePlaceholder")}
          className={inputClass}
        />
      </label>

      <label className="mt-5 block">
        <span className={labelClass}>{t("menuWiz.mod.subLabel")}</span>
        <input
          value={subLabel}
          onChange={(e) => setSubLabel(e.target.value)}
          placeholder={t("menuWiz.mod.subLabelPlaceholder")}
          className={inputClass}
        />
      </label>

      <label className="mt-5 block">
        <span className={labelClass}>
          {t("menuWiz.mod.priceType")}
          <Required />
        </span>
        <select
          value={priceType}
          onChange={(e) => setPriceType(e.target.value as ModifierOption["priceType"])}
          className={clsx(inputClass, priceType === "" && "text-[var(--octo-text-muted)]")}
        >
          <option value="" disabled>
            {t("menuWiz.mod.priceTypePlaceholder")}
          </option>
          <option value="no-change">{t("menuWiz.mod.priceType.noChange")}</option>
          <option value="add-amount">{t("menuWiz.mod.priceType.add")}</option>
          <option value="fixed">{t("menuWiz.mod.priceType.fixed")}</option>
        </select>
      </label>

      <label className="mt-5 block">
        <span className={labelClass}>
          {t("menuWiz.mod.price")}
          <Required />
        </span>
        <div className="mt-2 flex items-center gap-3 rounded-[9px] border border-[var(--octo-border-input)] px-3">
          <span className="text-[15px] text-[var(--octo-text-primary)]">SAR</span>
          <input
            type="number"
            min={0}
            step="0.01"
            // No change carries no price, so the field reads 0 rather than
            // accepting a number the total would ignore.
            value={noChange ? "0" : price}
            readOnly={noChange}
            placeholder={t("menuWiz.mod.pricePlaceholder")}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full bg-transparent py-3 text-[15px] text-[var(--octo-text-primary)] outline-none placeholder:text-[var(--octo-text-muted)]"
          />
        </div>
      </label>

      {/* Drawn as the frame's radio, but it toggles: a lone radio that cannot
          be unticked would make "no default" impossible to get back to. */}
      <button
        type="button"
        role="checkbox"
        aria-checked={isDefault}
        onClick={() => setIsDefault((d) => !d)}
        className="mt-5 flex items-center gap-2.5 text-[15px] font-medium text-[var(--octo-text-primary)]"
      >
        <span
          aria-hidden
          className={clsx(
            "grid h-5 w-5 place-items-center rounded-full border",
            isDefault ? "border-[var(--octo-accent)]" : "border-[var(--octo-border-input)]"
          )}
        >
          {isDefault && <span className="h-2.5 w-2.5 rounded-full bg-[var(--octo-accent)]" />}
        </span>
        {t("menuWiz.mod.setDefault")}
      </button>

      <div className="mt-4 flex items-center gap-2.5">
        <Switch
          checked={available}
          label={t("menuWiz.mod.availability")}
          onChange={() => setAvailable((a) => !a)}
        />
        <span className="text-[15px] font-medium text-[var(--octo-text-primary)]">
          {t("menuWiz.mod.availability")}
        </span>
      </div>

      <Button
        className="mt-6 w-full justify-center py-3 text-[16px] font-semibold"
        disabled={!canSave}
        onClick={() =>
          priceType !== "" &&
          onSave({
            name: name.trim(),
            subLabel: subLabel.trim(),
            priceType,
            price: noChange ? 0 : amount,
            isDefault,
            available,
          })
        }
      >
        {t("menuWiz.mod.saveOption")}
      </Button>
    </Modal>
  );
}
