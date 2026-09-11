// The in-app "customer view" of the site. "Open Website" and "Visit as
// customer" used to be plain links to the mock domain, which doesn't resolve
// anywhere in this build — a merchant pressing them landed on a browser error.
// This renders the real storefront from the draft, full screen, at desktop or
// phone width, so both buttons actually show what a customer will see.
import { useEffect, useState } from "react";
import { Monitor, Smartphone, X } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import { StorefrontPreview, type PreviewDevice } from "@/widgets/storefront-preview";
import { previewModelFromSite } from "../_shared/preview-model";
import type { SiteDraft } from "../_shared/site-draft";

const DEVICES = [
  { id: "desktop", Icon: Monitor, labelKey: "publicLink.device.desktop" },
  { id: "mobile", Icon: Smartphone, labelKey: "publicLink.device.mobile" },
] as const;

export function SitePreviewModal({
  open,
  onClose,
  draft,
  initialDevice = "desktop",
}: {
  open: boolean;
  onClose: () => void;
  draft: SiteDraft;
  initialDevice?: PreviewDevice;
}) {
  const { t, locale } = useI18n();
  const [device, setDevice] = useState<PreviewDevice>(initialDevice);

  // Each opening starts on the device the button that opened it asked for.
  useEffect(() => {
    if (open) setDevice(initialDevice);
  }, [open, initialDevice]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  const model = previewModelFromSite(draft, device, t, locale);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("publicLink.sitePreview.title")}
      className="fixed inset-0 z-50 flex flex-col bg-[var(--octo-page-bg)]"
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--octo-divider)] bg-[var(--octo-card)] px-4 py-2.5">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("publicLink.sitePreview.title")}</span>
          <span dir="ltr" className="truncate text-start text-[11px] text-[var(--octo-text-muted)]">
            https://{model.url}
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-[9px] bg-[var(--octo-hover)] p-1">
          {DEVICES.map(({ id, Icon, labelKey }) => (
            <button
              key={id}
              type="button"
              aria-pressed={device === id}
              aria-label={t(labelKey)}
              onClick={() => setDevice(id)}
              className={clsx(
                "grid h-8 w-9 place-items-center rounded-[7px] transition-colors",
                device === id ? "bg-[var(--octo-card)] text-[#0D6EFD] shadow-sm" : "text-[var(--octo-text-muted)]"
              )}
            >
              <Icon size={15} />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("publicLink.sitePreview.close")}
          className="grid h-9 w-9 place-items-center rounded-[9px] text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
        >
          <X size={18} />
        </button>
      </div>
      <p className="bg-[#0D6EFD]/10 px-4 py-1.5 text-center text-[11.5px] text-[#0D6EFD]">
        {t("publicLink.sitePreview.note")}
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div
          className={clsx(
            "mx-auto overflow-hidden rounded-xl border border-[var(--octo-border-card)] bg-white",
            device === "mobile" ? "w-fit max-w-full" : "max-w-[1280px]"
          )}
        >
          <StorefrontPreview model={model} />
        </div>
      </div>
    </div>
  );
}
