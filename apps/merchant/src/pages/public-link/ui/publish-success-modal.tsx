// What a merchant sees the moment Publish Now succeeds. Before this, pressing
// it only flipped a badge somewhere down the page; publishing is the point of
// the whole builder and deserves an unmistakable confirmation with the link
// ready to copy or open.
import { useEffect, useState } from "react";
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { PlButton, PlIcon } from "./kit";

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
          <PlButton variant="outline" size="md" onClick={onViewSite}>
            {t("publicLink.publishSuccess.viewSite")}
          </PlButton>
          <PlButton size="md" onClick={onClose}>
            {t("publicLink.publishSuccess.done")}
          </PlButton>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-[#dcffef] text-[#009a39]">
          <PlIcon name="publish-completed-solid" size={28} />
        </span>
        <p className="text-[14px] font-medium leading-[1.3] text-[var(--pl-text-2)]">{t("publicLink.publishSuccess.body")}</p>
        {/* The Publish step's "Your live URL" field, with its Copy Link button. */}
        <div className="flex w-full items-center justify-between gap-2 rounded-[12px] border border-[var(--pl-g300)] bg-[var(--pl-primary-soft)] px-3 py-2">
          <span dir="ltr" className="min-w-0 flex-1 select-all truncate text-start text-[14px] font-semibold leading-[20px] text-[var(--pl-primary)]">
            {url}
          </span>
          <button
            type="button"
            onClick={copy}
            className="inline-flex h-8 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[4px] bg-[var(--pl-surface)] p-2 text-[14px] font-medium leading-[14px] text-[var(--pl-primary)] transition-colors hover:brightness-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40"
          >
            <PlIcon name="publish-copy" size={16} />
            <span aria-live="polite">{copied ? t("publicLink.preview.copied") : t("publicLink.copyLink")}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
