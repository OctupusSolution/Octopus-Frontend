// Add New Section and Edit Section — one component, two modes, because the
// frames differ only in their title, their dropzone copy and their button.
//
// Saving is refused by disabling the button rather than by erroring after the
// fact: the frame stars both the name and the image, so both are needed.
import { useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { Button, Modal } from "@ui/primitives";
import { useFilePicker } from "@/shared/ui/use-file-picker";
import type { Section } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";

export function SectionModal({
  open,
  mode,
  section,
  onClose,
  onSave,
}: {
  /** Explicit rather than inferred from `mode`. Inferring it meant a null
   *  state defaulted to "add", which read as open and left the dialog on
   *  screen from first paint. */
  open: boolean;
  mode: "add" | "edit";
  section: Section | null;
  onClose: () => void;
  onSave: (name: string, image: string | null) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const picker = useFilePicker(setImage);

  // Re-seed whenever the dialog opens, so the last edit never leaks into the
  // next one.
  useEffect(() => {
    if (!open) return;
    setName(mode === "edit" && section ? section.name : "");
    setImage(mode === "edit" && section ? section.image : null);
  }, [open, mode, section]);

  if (!open) return null;

  const canSave = name.trim() !== "" && image !== null;

  return (
    <Modal
      open
      onClose={onClose}
      title={
        <span className="text-[24px] font-bold text-[var(--octo-text-primary)]">
          {t(mode === "add" ? "menuWiz.sec.modal.addTitle" : "menuWiz.sec.modal.editTitle")}
        </span>
      }
      className="!max-w-[820px]"
    >
      <label className="block">
        <span className="px-2 text-[16px] font-medium text-[var(--octo-text-primary)]">
          {t("menuWiz.sec.modal.name")} <span className="text-error">*</span>
        </span>
        <input
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          placeholder={t("menuWiz.sec.modal.namePlaceholder")}
          className="mt-2 h-11 w-full rounded-[10px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 text-[15px] text-[var(--octo-text-primary)]"
        />
      </label>

      <div className="mt-5">
        <p className="px-2 text-[16px] font-medium text-[var(--octo-text-primary)]">
          {t("menuWiz.sec.modal.image")} <span className="text-error">*</span>
        </p>
        <button
          type="button"
          onClick={picker.open}
          className="mt-2 flex min-h-[130px] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-[10px] border border-dashed border-[var(--octo-border-input)] px-4 py-3 text-[14px] text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
        >
          {image ? (
            <>
              <img src={image} alt="" className="h-[70px] w-[70px] rounded-[8px] object-cover" />
              {t("menuWiz.sec.modal.change")}
            </>
          ) : (
            <>
              <Upload size={22} aria-hidden />
              {t("menuWiz.sec.modal.upload")}
            </>
          )}
        </button>
        {picker.input}
        {picker.error && (
          <p role="alert" className="mt-1.5 text-[13px] text-error">
            {t(picker.error === "too-large" ? "menuWiz.sec.error.tooLarge" : "menuWiz.sec.error.unreadable")}
          </p>
        )}
      </div>

      <Button
        className="mt-6 h-[52px] w-full justify-center rounded-[8px] text-[16px] font-bold"
        disabled={!canSave}
        onClick={() => onSave(name.trim(), image)}
      >
        {t(mode === "add" ? "menuWiz.sec.modal.save" : "menuWiz.sec.modal.saveChanges")}
      </Button>
    </Modal>
  );
}
