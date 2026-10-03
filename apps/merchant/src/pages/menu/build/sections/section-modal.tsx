// Add New Section and Edit Section — one component, two modes, because the
// frames differ only in their title, their dropzone copy and their button.
//
// Both fields carry the frames' red asterisk, so both are required. The save
// button stays enabled: pressing it with something missing reveals every
// message and saves nothing. A message otherwise appears only once its own
// field has been left, so the dialog never opens red.
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Modal } from "@ui/primitives";
import { useFilePicker } from "@/shared/ui/use-file-picker";
import { SECTION_NAME_MAX, validateSectionForm, type Section } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { Field } from "../../_shared/controls";
import { MenuIcon } from "../../_shared/menu-icon";
import { FIELD_INVALID, FOCUS, LINE, MODAL_SUBMIT, TEXT_GRAY, TEXT_INPUT_CLASS } from "../../_shared/theme";

type FieldName = "name" | "image";

export function SectionModal({
  open,
  mode,
  section,
  otherNames = [],
  onClose,
  onSave,
}: {
  /** Explicit rather than inferred from `mode`. Inferring it meant a null
   *  state defaulted to "add", which read as open and left the dialog on
   *  screen from first paint. */
  open: boolean;
  mode: "add" | "edit";
  section: Section | null;
  /** Names of the menu's other sections, for the duplicate-name check. */
  otherNames?: readonly string[];
  onClose: () => void;
  onSave: (name: string, image: string | null) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<FieldName, boolean>>({ name: false, image: false });
  const [attempted, setAttempted] = useState(false);
  const picker = useFilePicker(setImage);

  // Re-seed whenever the dialog opens, so the last edit never leaks into the
  // next one.
  useEffect(() => {
    if (!open) return;
    setName(mode === "edit" && section ? section.name : "");
    setImage(mode === "edit" && section ? section.image : null);
    setTouched({ name: false, image: false });
    setAttempted(false);
  }, [open, mode, section]);

  if (!open) return null;

  const errors = validateSectionForm({ name, image }, otherNames);
  const shown = (field: FieldName) => (attempted || touched[field] ? errors[field] : undefined);
  const nameError = shown("name");
  // A refused pick (too large, unreadable) is always worth saying; "required"
  // waits for a blur or a save attempt like any other field.
  const pickError = picker.error
    ? t(picker.error === "too-large" ? "menuWiz.sec.error.tooLarge" : "menuWiz.sec.error.unreadable")
    : null;
  const imageError = pickError ?? (shown("image") ? t(shown("image")!) : null);

  function submit() {
    setAttempted(true);
    if (Object.keys(errors).length > 0) return;
    onSave(name.trim(), image);
  }

  return (
    <Modal open onClose={onClose} backdropClassName="bg-black/60" className="!max-w-[738px] !rounded-[12px] !p-6 !shadow-none">
      <form
        noValidate
        className="flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <h2 className="text-[24px] font-semibold leading-6 text-[#0e0e0e] [[data-theme=dark]_&]:text-[var(--octo-text-primary)]">
          {t(mode === "add" ? "menuWiz.sec.modal.addTitle" : "menuWiz.sec.modal.editTitle")}
        </h2>

        <Field label={t("menuWiz.sec.modal.name")} required error={nameError ? t(nameError) : null}>
          <input
            value={name}
            autoFocus
            maxLength={SECTION_NAME_MAX + 20}
            aria-label={t("menuWiz.sec.modal.name")}
            aria-invalid={nameError ? true : undefined}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
            placeholder={t("menuWiz.sec.modal.namePlaceholder")}
            className={clsx(TEXT_INPUT_CLASS, nameError && FIELD_INVALID)}
          />
        </Field>

        <Field label={t("menuWiz.sec.modal.image")} required error={imageError}>
          <button
            type="button"
            onClick={picker.open}
            onBlur={() => setTouched((prev) => ({ ...prev, image: true }))}
            aria-invalid={imageError ? true : undefined}
            className={clsx(
              "flex h-[116px] w-full flex-col items-center justify-center gap-3 rounded-[12px] border border-dashed p-2 text-[14px] leading-[14px] hover:bg-[var(--octo-hover)]",
              LINE,
              FOCUS,
              TEXT_GRAY,
              imageError && FIELD_INVALID
            )}
          >
            {image ? (
              <>
                <img src={image} alt="" className="size-[69px] rounded-[4px] object-cover" />
                {t("menuWiz.sec.modal.change")}
              </>
            ) : (
              <>
                <span className="grid size-6 place-items-center">
                  <MenuIcon name="menu-upload.svg" size={21.5} />
                </span>
                {t("menuWiz.sec.modal.upload")}
              </>
            )}
          </button>
          {picker.input}
        </Field>

        <button type="submit" className={MODAL_SUBMIT}>
          {t(mode === "add" ? "menuWiz.sec.modal.save" : "menuWiz.sec.modal.saveChanges")}
        </button>
      </form>
    </Modal>
  );
}
