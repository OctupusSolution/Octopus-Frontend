// apps/merchant/src/pages/customers/_shared/edit-info-modal.tsx
import { useEffect, useState } from "react";
import { Button, Input, Modal } from "@ui/primitives";

export interface EditField {
  key: string;
  label: string;
  value: string;
}

export function EditInfoModal({
  open,
  title,
  fields,
  saveLabel,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  fields: EditField[];
  saveLabel: string;
  onClose: () => void;
  onSave: (values: Record<string, string>) => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});

  // Re-sync the draft from the current field values every time the modal
  // opens, so a second edit doesn't show stale text left over from the
  // first (this modal instance stays mounted the whole time the detail
  // page is open — it only toggles visibility).
  useEffect(() => {
    if (open) setDraft(Object.fromEntries(fields.map((f) => [f.key, f.value])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <Button variant="primary" size="sm" onClick={() => { onSave(draft); onClose(); }}>
          {saveLabel}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        {fields.map((field) => (
          <Input
            key={field.key}
            label={field.label}
            value={draft[field.key] ?? ""}
            onChange={(event) => setDraft((prev) => ({ ...prev, [field.key]: event.target.value }))}
          />
        ))}
      </div>
    </Modal>
  );
}
