// apps/merchant/src/pages/customers/_shared/add-note-modal.tsx
import { useState } from "react";
import { Button, Modal, Textarea } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";

export function AddNoteModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (text: string) => void }) {
  const { t } = useI18n();
  const [text, setText] = useState("");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("customers.addNote.title")}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>{t("customers.addNote.cancel")}</Button>
          <Button
            variant="primary"
            size="sm"
            disabled={text.trim() === ""}
            onClick={() => { onSave(text.trim()); setText(""); onClose(); }}
          >
            {t("customers.addNote.save")}
          </Button>
        </>
      }
    >
      <Textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={t("customers.addNote.placeholder")} rows={4} />
    </Modal>
  );
}
