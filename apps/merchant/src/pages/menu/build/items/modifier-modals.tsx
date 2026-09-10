// The two dialogs the Modifiers tab opens: Add Modifier Group and Add Modifier
// option. Both are the frame's minimal forms — the group's finer settings live
// in the Edit Group panel behind it, not here.
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Button, Modal, Select } from "@ui/primitives";
import type { ModifierGroup, ModifierOption } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";

const inputClass =
  "mt-1.5 w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2.5 text-[14px] text-[var(--octo-text-primary)]";

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
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
  const [required, setRequired] = useState(true);

  useEffect(() => {
    if (!open) return;
    setName("");
    setRequired(true);
  }, [open]);

  if (!open) return null;

  return (
    <Modal open onClose={onClose} title={t("menuWiz.mod.modalGroupTitle")} className="!max-w-[560px]">
      <label className="block">
        <span className="text-[13.5px] font-medium text-[var(--octo-text-primary)]">
          {t("menuWiz.mod.modalName")} <span className="text-error">*</span>
        </span>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("menuWiz.mod.modalNamePlaceholder")}
          className={inputClass}
        />
      </label>

      <div className="mt-4">
        <p className="text-[13.5px] font-medium text-[var(--octo-text-primary)]">
          {t("menuWiz.mod.selectionType")} <span className="text-error">*</span>
        </p>
        <div className="mt-1.5 flex items-center gap-2.5">
          <Switch
            checked={required}
            label={t("menuWiz.mod.requiredGroup")}
            onChange={() => setRequired((r) => !r)}
          />
          <span className="text-[14px] text-[var(--octo-text-primary)]">
            {t("menuWiz.mod.requiredGroup")}
          </span>
        </div>
      </div>

      <Button
        className="mt-5 w-full justify-center py-2.5"
        disabled={name.trim() === ""}
        // A required group must take at least one choice, an optional one need
        // not — so the switch decides `min`, and the caller does not have to.
        onClick={() => onSave({ name: name.trim(), required, type: "single" })}
      >
        {t("menuWiz.mod.saveGroup")}
      </Button>
    </Modal>
  );
}

export function ModifierOptionModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (option: Omit<ModifierOption, "id">) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [priceType, setPriceType] = useState<ModifierOption["priceType"]>("no-change");
  const [price, setPrice] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (!open) return;
    setName("");
    setPriceType("no-change");
    setPrice("");
    setIsDefault(false);
    setAvailable(true);
  }, [open]);

  if (!open) return null;

  return (
    <Modal open onClose={onClose} title={t("menuWiz.mod.modalOptionTitle")} className="!max-w-[560px]">
      <label className="block">
        <span className="text-[13.5px] font-medium text-[var(--octo-text-primary)]">
          {t("menuWiz.mod.optionName")} <span className="text-error">*</span>
        </span>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("menuWiz.mod.optionNamePlaceholder")}
          className={inputClass}
        />
      </label>

      <label className="mt-4 block">
        <span className="text-[13.5px] font-medium text-[var(--octo-text-primary)]">
          {t("menuWiz.mod.priceType")} <span className="text-error">*</span>
        </span>
        <Select
          className="mt-1.5"
          value={priceType}
          onChange={(e) => setPriceType(e.target.value as ModifierOption["priceType"])}
        >
          <option value="no-change">{t("menuWiz.mod.priceType.noChange")}</option>
          <option value="add-amount">{t("menuWiz.mod.priceType.add")}</option>
          <option value="fixed">{t("menuWiz.mod.priceType.fixed")}</option>
        </Select>
      </label>

      <label className="mt-4 block">
        <span className="text-[13.5px] font-medium text-[var(--octo-text-primary)]">
          {t("menuWiz.mod.price")} <span className="text-error">*</span>
        </span>
        <div className="mt-1.5 flex items-center gap-2 rounded-[9px] border border-[var(--octo-border-input)] px-3">
          <span className="text-[14px] text-[var(--octo-text-secondary)]">SAR</span>
          <input
            type="number"
            min={0}
            value={price}
            // A price is meaningless when the option does not change the price,
            // so that arm disables the field rather than storing a number the
            // total will ignore.
            disabled={priceType === "no-change"}
            placeholder={t("menuWiz.mod.pricePlaceholder")}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full bg-transparent py-2.5 text-[14px] text-[var(--octo-text-primary)] outline-none disabled:opacity-60"
          />
        </div>
      </label>

      <label className="mt-4 flex items-center gap-2.5 text-[14px]">
        <input
          type="radio"
          checked={isDefault}
          onChange={() => setIsDefault((d) => !d)}
          className="h-4 w-4 accent-[var(--octo-accent)]"
        />
        <span className="text-[var(--octo-text-primary)]">{t("menuWiz.mod.setDefault")}</span>
      </label>

      <div className="mt-3 flex items-center gap-2.5">
        <Switch
          checked={available}
          label={t("menuWiz.mod.availability")}
          onChange={() => setAvailable((a) => !a)}
        />
        <span className="text-[14px] text-[var(--octo-text-primary)]">
          {t("menuWiz.mod.availability")}
        </span>
      </div>

      <Button
        className="mt-5 w-full justify-center py-2.5"
        disabled={name.trim() === ""}
        onClick={() =>
          onSave({
            name: name.trim(),
            subLabel: "",
            priceType,
            price: priceType === "no-change" ? 0 : Number(price) || 0,
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
