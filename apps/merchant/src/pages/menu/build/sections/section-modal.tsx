// Add New Section and Edit Section — one component, two modes, because the
// frames differ only in their title, their dropzone copy and their button.
//
// Saving with an empty name is refused by disabling the button rather than by
// erroring after the fact: the name is the only thing the dialog really needs,
// and the frame marks it required.
import { useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { Button, Modal } from "@ui/primitives";
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

  // Re-seed whenever the dialog opens, so the last edit never leaks into the
  // next one.
  useEffect(() => {
    if (!open) return;
    setName(mode === "edit" && section ? section.name : "");
    setImage(mode === "edit" && section ? section.image : null);
  }, [open, mode, section]);

  if (!open) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title={t(mode === "add" ? "menuWiz.sec.modal.addTitle" : "menuWiz.sec.modal.editTitle")}
      className="!max-w-[560px]"
    >
      <label className="block">
        <span className="text-[13.5px] font-medium text-[var(--octo-text-primary)]">
          {t("menuWiz.sec.modal.name")} <span className="text-error">*</span>
        </span>
        <input
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          placeholder={t("menuWiz.sec.modal.namePlaceholder")}
          className="mt-1.5 w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2.5 text-[14px] text-[var(--octo-text-primary)]"
        />
      </label>

      <div className="mt-4">
        <p className="text-[13.5px] font-medium text-[var(--octo-text-primary)]">
          {t("menuWiz.sec.modal.image")} <span className="text-error">*</span>
        </p>
        {/* No real upload yet — there is no store to put a file in. The
            dropzone is honest about being a picker that does nothing rather
            than pretending to accept a file and dropping it. */}
        <button
          type="button"
          onClick={() => setImage(image ? null : null)}
          className="mt-1.5 flex w-full flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-[var(--octo-border-input)] px-4 py-8 text-[13.5px] text-[var(--octo-text-secondary)]"
        >
          {image ? (
            <>
              <img src={image} alt="" className="h-16 w-16 rounded-[8px] object-cover" />
              {t("menuWiz.sec.modal.change")}
            </>
          ) : (
            <>
              <Upload size={20} aria-hidden />
              {t("menuWiz.sec.modal.upload")}
            </>
          )}
        </button>
      </div>

      <Button
        className="mt-5 w-full justify-center py-2.5"
        disabled={name.trim() === ""}
        onClick={() => onSave(name.trim(), image)}
      >
        {t(mode === "add" ? "menuWiz.sec.modal.save" : "menuWiz.sec.modal.saveChanges")}
      </Button>
    </Modal>
  );
}
