// apps/merchant/src/pages/customers/_shared/add-tag-modal.tsx
import { useState } from "react";
import { Button, Input, Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";

export function AddTagModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (tag: string) => void }) {
  const { t } = useI18n();
  const [tag, setTag] = useState("");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("customers.addTag.title")}
      footer={
        <Button variant="primary" size="sm" disabled={tag.trim() === ""} onClick={() => { onSave(tag.trim()); setTag(""); onClose(); }}>
          {t("customers.addTag.save")}
        </Button>
      }
    >
      <Input value={tag} onChange={(event) => setTag(event.target.value)} placeholder={t("customers.addTag.placeholder")} />
    </Modal>
  );
}
