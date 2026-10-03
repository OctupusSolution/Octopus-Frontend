// The two dialogs the Modifiers tab opens: Add Modifier Group and Add / Edit
// Modifier option. Both are the frame's minimal forms — the group's finer
// settings live in the Edit Group panel behind it, not here.
//
// Every field with the frames' red asterisk is required. The save button stays
// enabled: pressing it with something wrong reveals every message and saves
// nothing. A message otherwise appears only once its own field has been left,
// so neither dialog opens red.
import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";
import { Modal } from "@ui/primitives";
import {
  MODIFIER_NAME_MAX,
  parseAmount,
  validateModifierGroupForm,
  validateModifierOptionForm,
  type ModifierGroup,
  type ModifierOption,
  type ModifierOptionField,
} from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { Field, SelectBox, Switch } from "../../_shared/controls";
import { FIELD_BORDER, FIELD_INVALID, FOCUS_WITHIN, MODAL_SUBMIT, TEXT, TEXT_INPUT_CLASS } from "../../_shared/theme";
import { BARE_INPUT, RadioGlyph } from "./ui";

/** Single / multiple choice is asked for in the Edit Group panel; the frame's
 *  dialog has only the name and the Required switch. Flip this to ask up front. */
const SHOW_GROUP_TYPE: boolean = false;
/** The option's sub-label ("120g beef") is typed in the options table; the
 *  frame's dialog has no field for it. Flip this to ask for it here too. */
const SHOW_SUB_LABEL: boolean = false;

const TOGGLE_LABEL = `text-[14px] font-semibold leading-[14px] ${TEXT}`;

function Dialog({ title, onClose, onSubmit, children }: { title: string; onClose: () => void; onSubmit: () => void; children: ReactNode }) {
  return (
    <Modal open onClose={onClose} backdropClassName="bg-black/60" className="!max-w-[738px] !rounded-[12px] !p-6 !shadow-none">
      <form
        noValidate
        className="flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <h2 className="text-[24px] font-semibold leading-6 text-[#0e0e0e] [[data-theme=dark]_&]:text-[var(--octo-text-primary)]">
          {title}
        </h2>
        {children}
      </form>
    </Modal>
  );
}

export function ModifierGroupModal({
  open,
  otherNames = [],
  onClose,
  onSave,
}: {
  open: boolean;
  /** The item's existing group names, for the duplicate-name check. */
  otherNames?: readonly string[];
  onClose: () => void;
  onSave: (group: Pick<ModifierGroup, "name" | "required" | "type">) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [type, setType] = useState<ModifierGroup["type"]>("single");
  const [required, setRequired] = useState(true);
  const [touched, setTouched] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setType("single");
    setRequired(true);
    setTouched(false);
    setAttempted(false);
  }, [open]);

  if (!open) return null;

  const errors = validateModifierGroupForm({ name }, otherNames);
  const nameError = attempted || touched ? errors.name : undefined;

  function submit() {
    setAttempted(true);
    if (Object.keys(errors).length > 0) return;
    // The switch decides `min` and the type decides `max` — the caller
    // derives both, so the dialog does not have to know the rules.
    onSave({ name: name.trim(), required, type });
  }

  return (
    <Dialog title={t("menuWiz.mod.modalGroupTitle")} onClose={onClose} onSubmit={submit}>
      <Field label={t("menuWiz.mod.modalName")} required error={nameError ? t(nameError) : null}>
        <input
          autoFocus
          value={name}
          maxLength={MODIFIER_NAME_MAX + 20}
          aria-label={t("menuWiz.mod.modalName")}
          aria-invalid={nameError ? true : undefined}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder={t("menuWiz.mod.modalNamePlaceholder")}
          className={clsx(TEXT_INPUT_CLASS, nameError && FIELD_INVALID)}
        />
      </Field>

      {SHOW_GROUP_TYPE && (
        <Field label={t("menuWiz.mod.groupType")} required>
          <SelectBox value={type} onChange={(value) => setType(value as ModifierGroup["type"])} ariaLabel={t("menuWiz.mod.groupType")}>
            <option value="single">{t("menuWiz.mod.single")}</option>
            <option value="multi">{t("menuWiz.mod.multi")}</option>
          </SelectBox>
        </Field>
      )}

      {/* Required by the frame's asterisk, and always answered: the switch is
          either on or off, so there is no empty state to refuse. */}
      <Field label={t("menuWiz.mod.selectionType")} required>
        <div className="flex items-center gap-2">
          <Switch checked={required} label={t("menuWiz.mod.requiredGroup")} onChange={setRequired} />
          <span className={TOGGLE_LABEL}>{t("menuWiz.mod.requiredGroup")}</span>
        </div>
      </Field>

      <button type="submit" className={MODAL_SUBMIT}>
        {t("menuWiz.mod.saveGroup")}
      </button>
    </Dialog>
  );
}

export function ModifierOptionModal({
  open,
  initial,
  otherNames = [],
  onClose,
  onSave,
}: {
  open: boolean;
  /** Present when editing an existing row; the dialog then starts filled. */
  initial?: ModifierOption | null;
  /** The group's other option names, for the duplicate-name check. */
  otherNames?: readonly string[];
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
  const [touched, setTouched] = useState<Partial<Record<ModifierOptionField, boolean>>>({});
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setSubLabel(initial?.subLabel ?? "");
    setPriceType(initial?.priceType ?? "");
    setPrice(initial && initial.priceType !== "no-change" ? String(initial.price) : "");
    setIsDefault(initial?.isDefault ?? false);
    setAvailable(initial?.available ?? true);
    setTouched({});
    setAttempted(false);
  }, [open, initial]);

  if (!open) return null;

  const noChange = priceType === "no-change";
  const errors = validateModifierOptionForm({ name, priceType, price }, otherNames);
  const shown = (field: ModifierOptionField) => {
    const key = attempted || touched[field] ? errors[field] : undefined;
    return key ? t(key) : null;
  };
  const touch = (field: ModifierOptionField) => setTouched((prev) => ({ ...prev, [field]: true }));
  const nameError = shown("name");
  const priceTypeError = shown("priceType");
  const priceError = shown("price");

  function submit() {
    setAttempted(true);
    if (Object.keys(errors).length > 0 || priceType === "") return;
    onSave({
      name: name.trim(),
      subLabel: subLabel.trim(),
      priceType,
      price: noChange ? 0 : (parseAmount(price) ?? 0),
      isDefault,
      available,
    });
  }

  return (
    <Dialog
      title={t(initial ? "menuWiz.mod.modalOptionEditTitle" : "menuWiz.mod.modalOptionTitle")}
      onClose={onClose}
      onSubmit={submit}
    >
      <Field label={t("menuWiz.mod.optionName")} required error={nameError}>
        <input
          autoFocus
          value={name}
          maxLength={MODIFIER_NAME_MAX + 20}
          aria-label={t("menuWiz.mod.optionName")}
          aria-invalid={nameError ? true : undefined}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => touch("name")}
          placeholder={t("menuWiz.mod.optionNamePlaceholder")}
          className={clsx(TEXT_INPUT_CLASS, nameError && FIELD_INVALID)}
        />
      </Field>

      {SHOW_SUB_LABEL && (
        <Field label={t("menuWiz.mod.subLabel")}>
          <input
            value={subLabel}
            aria-label={t("menuWiz.mod.subLabel")}
            onChange={(e) => setSubLabel(e.target.value)}
            placeholder={t("menuWiz.mod.subLabelPlaceholder")}
            className={TEXT_INPUT_CLASS}
          />
        </Field>
      )}

      <Field label={t("menuWiz.mod.priceType")} required error={priceTypeError}>
        <SelectBox
          value={priceType}
          onChange={(value) => setPriceType(value as ModifierOption["priceType"])}
          onBlur={() => touch("priceType")}
          ariaLabel={t("menuWiz.mod.priceType")}
          placeholderShown={priceType === ""}
          invalid={Boolean(priceTypeError)}
        >
          <option value="" disabled>
            {t("menuWiz.mod.priceTypePlaceholder")}
          </option>
          <option value="no-change">{t("menuWiz.mod.priceType.noChange")}</option>
          <option value="add-amount">{t("menuWiz.mod.priceType.add")}</option>
          <option value="fixed">{t("menuWiz.mod.priceType.fixed")}</option>
        </SelectBox>
      </Field>

      <Field label={t("menuWiz.mod.price")} required error={priceError}>
        <label
          className={clsx(
            `flex h-10 w-full items-center gap-3 rounded-[12px] ${FIELD_BORDER} bg-[var(--octo-card)] px-2 text-[14px] ${TEXT} ${FOCUS_WITHIN}`,
            priceError && FIELD_INVALID
          )}
        >
          <span className="shrink-0 leading-[14px]">SAR</span>
          <input
            dir="ltr"
            inputMode="decimal"
            // No change carries no price, so the field reads 0 rather than
            // accepting a number the total would ignore.
            value={noChange ? "0" : price}
            readOnly={noChange}
            aria-label={t("menuWiz.mod.price")}
            aria-invalid={priceError ? true : undefined}
            placeholder={t("menuWiz.mod.pricePlaceholder")}
            onChange={(e) => setPrice(e.target.value)}
            onBlur={() => touch("price")}
            className={clsx(BARE_INPUT, "text-start placeholder:!text-[#687280]")}
          />
        </label>
      </Field>

      {/* Drawn as the frame's radio, but it toggles: a lone radio that cannot
          be unticked would make "no default" impossible to get back to. */}
      <button
        type="button"
        role="checkbox"
        aria-checked={isDefault}
        onClick={() => setIsDefault((d) => !d)}
        className="flex items-center gap-2 self-start rounded-[4px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0D6EFD]"
      >
        <RadioGlyph checked={isDefault} />
        <span className={TOGGLE_LABEL}>{t("menuWiz.mod.setDefault")}</span>
      </button>

      <div className="flex items-center gap-2">
        <Switch checked={available} label={t("menuWiz.mod.availability")} onChange={setAvailable} />
        <span className={TOGGLE_LABEL}>{t("menuWiz.mod.availability")}</span>
      </div>

      <button type="submit" className={MODAL_SUBMIT}>
        {t("menuWiz.mod.saveOption")}
      </button>
    </Dialog>
  );
}
