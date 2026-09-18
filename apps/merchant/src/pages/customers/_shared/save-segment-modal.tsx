// apps/merchant/src/pages/customers/_shared/save-segment-modal.tsx
import { useEffect, useState } from "react";
import { Button, Input, Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";

/** Names the current filter set before it is stored as a segment (which
 *  the Send Message wizard lists under "Saved Audiences"). */
export function SaveSegmentModal({
  open,
  defaultName,
  onClose,
  onSave,
}: {
  open: boolean;
  defaultName: string;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    if (open) setName(defaultName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = () => {
    if (name.trim() === "") return;
    onSave(name.trim());
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("customers.segment.title")}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>{t("customers.addNote.cancel")}</Button>
          <Button variant="primary" size="sm" disabled={name.trim() === ""} onClick={submit}>{t("customers.segment.save")}</Button>
        </>
      }
    >
      <p className="mb-3 text-[12.5px] text-[var(--octo-text-muted)]">{t("customers.segment.description")}</p>
      <Input
        autoFocus
        label={t("customers.segment.nameLabel")}
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Enter") submit(); }}
      />
    </Modal>
  );
}
