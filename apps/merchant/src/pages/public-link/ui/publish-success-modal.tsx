// What a merchant sees the moment Publish Now succeeds. Before this, pressing
// it only flipped a badge somewhere down the page; publishing is the point of
// the whole builder and deserves an unmistakable confirmation with the link
// ready to copy or open.
import { useEffect, useState } from "react";
import { Check, Copy, PartyPopper } from "lucide-react";
import { Button, Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";

const COPY_RESET_MS = 2000;

export function PublishSuccessModal({
  open,
  onClose,
  url,
  onViewSite,
}: {
  open: boolean;
  onClose: () => void;
  url: string;
  onViewSite: () => void;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), COPY_RESET_MS);
    return () => window.clearTimeout(id);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard can be unavailable (plain http, a blocking browser); the
      // link stays visible and selectable below.
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("publicLink.publishSuccess.title")}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onViewSite}>
            {t("publicLink.publishSuccess.viewSite")}
          </Button>
          <Button onClick={onClose}>{t("publicLink.publishSuccess.done")}</Button>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-[#22C55E]/10 text-[#16a34a]">
          <PartyPopper size={26} />
        </span>
        <p className="text-[13px] text-[var(--octo-text-secondary)]">{t("publicLink.publishSuccess.body")}</p>
        <div className="flex w-full items-center gap-2 rounded-[10px] border border-[var(--octo-border-input)] px-3 py-2">
          <span dir="ltr" className="min-w-0 flex-1 select-all truncate text-start text-[12.5px] text-[var(--octo-text-primary)]">
            {url}
          </span>
          <Button size="sm" variant="secondary" icon={copied ? <Check size={13} /> : <Copy size={13} />} onClick={copy}>
            {copied ? t("publicLink.preview.copied") : t("publicLink.copyLink")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
