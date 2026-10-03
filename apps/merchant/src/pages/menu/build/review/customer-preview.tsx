// "Customer view": the real storefront menu page, framed and drawn from the draft held in memory — the page customers
// would get if the merchant published now, in order mode (add buttons and sticky cart), before anything is saved.
import { useState } from "react";
import { Eye } from "lucide-react";
import { Modal } from "@ui/primitives";
import { useMenuCopy } from "../../copy";
import { useDraft } from "../use-draft";
import { MenuPreviewFrame } from "../preview/menu-preview-frame";

export function CustomerPreview() {
  const c = useMenuCopy();
  const { draft } = useDraft();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[15px] font-medium text-[var(--octo-accent)] hover:underline"
      >
        <Eye size={18} aria-hidden />
        {c("preview.open")}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} className="max-h-[96vh] max-w-[1100px] overflow-y-auto" title={c("preview.title")}>
        {open && <MenuPreviewFrame menu={draft} mode="order" height="calc(100vh - 180px)" />}
      </Modal>
    </>
  );
}
