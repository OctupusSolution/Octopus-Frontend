// Step 7 of the builder — the last one. A go-live checklist, the live link,
// an (optional, simulated) custom domain, a five-tile share row and SEO/social
// settings, plus the full-width `StorefrontPreview` the frame shows underneath
// all of it. The footer's "Publish Now" button lives in `builder-shell.tsx`,
// but this step owns its behaviour: `index.tsx` reads `goLiveReady(draft)` and
// this file's own dispatch of `patchPublish` to decide what the button does
// and whether it may be pressed at all — see the report on task 21 for the
// exact shape of that hook.
import { useRef, useState } from "react";
import {
  Check,
  Circle,
  CheckCircle2,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Globe,
  Mail,
  MessageCircle,
  Share2,
  Upload,
} from "lucide-react";
import { Badge, Button, Input, Modal, Textarea } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { StorefrontPreview } from "@/widgets/storefront-preview";
import { readLogoFile } from "@/pages/onboarding/_shared/logo-file";
import { GO_LIVE_ITEMS } from "../_shared/checklist";
import { previewModelFromSite } from "../_shared/preview-model";
import { QrCode } from "../ui/qr-code";
import type { StepProps } from "../_shared/steps";

const COPY_RESET_MS = 2000;

const CARD = "flex flex-col gap-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]";
const LINK_BUTTON =
  "inline-flex flex-1 items-center justify-center gap-1.5 rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-[7px] text-[12px] font-medium text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]";

/** Module scope, not nested inside `PublishStep`: a component redefined on
 *  every render would remount every row, which is exactly the kind of churn
 *  that drops focus mid-interaction elsewhere on a long page like this one. */
function ChecklistItemRow({ label, note, done }: { label: string; note: string; done: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      {done ? (
        <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[#0D6EFD]" fill="#0D6EFD" stroke="white" />
      ) : (
        <Circle size={17} className="mt-0.5 shrink-0 text-[var(--octo-text-faint)]" />
      )}
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[12.5px] font-medium text-[var(--octo-text-primary)]">{label}</span>
        <span className="truncate text-[11px] text-[var(--octo-text-muted)]">{note}</span>
      </div>
    </div>
  );
}

/** One of the five share tiles: an icon, a label, an optional note, and
 *  either a click handler or a real anchor — module scope for the same
 *  remount-avoidance reason as `ChecklistItemRow`. */
function ShareTile({
  icon,
  label,
  note,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  note: string;
  action: React.ReactNode;
}) {
  return (
    // `h-full` so every tile fills its grid cell, a fixed-height icon slot so
    // the labels line up across tiles whose icons differ wildly in size (the QR
    // is 80px, the rest are 22px glyphs), and `mt-auto` on the action so the
    // five buttons sit on one line instead of floating up under short copy.
    <div className="flex h-full flex-col items-center gap-2 rounded-[10px] border border-[var(--octo-border-input)] px-3 py-3 text-center">
      <span className="flex h-[84px] shrink-0 items-center justify-center">{icon}</span>
      <span className="text-[12px] font-medium text-[var(--octo-text-primary)]">{label}</span>
      <span className="text-[10.5px] text-[var(--octo-text-muted)]">{note}</span>
      <span className="mt-auto w-full pt-2">{action}</span>
    </div>
  );
}

export function PublishStep({ draft, dispatch }: StepProps) {
  const { t, locale } = useI18n();
  const model = previewModelFromSite(draft, "desktop", t, locale);
  const liveUrl = `https://${model.url}`;

  const [copiedLive, setCopiedLive] = useState(false);
  const [copiedSocial, setCopiedSocial] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const socialImageRef = useRef<HTMLInputElement>(null);

  const { seo, customDomain } = draft.publish;
  const hostSet = customDomain.host.trim() !== "";
  const embedSnippet = `<iframe src="${liveUrl}" width="100%" height="640" style="border:0" title="${model.businessName}"></iframe>`;

  async function copyText(value: string, onDone: (ok: boolean) => void) {
    try {
      await navigator.clipboard.writeText(value);
      onDone(true);
      setTimeout(() => onDone(false), COPY_RESET_MS);
    } catch {
      // Clipboard access can be unavailable (plain http, a browser that
      // blocks it, or a sandboxed preview) — the copy simply doesn't happen.
    }
  }

  function handleDownloadQr() {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serialized], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "qr-code.svg";
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleHostChange(host: string) {
    const trimmed = host.trim() !== "";
    dispatch({ type: "patchPublish", patch: { customDomain: { host, connected: trimmed, ssl: trimmed } } });
  }

  return (
    <div className="flex flex-col gap-4">
      {draft.publish.published && (
        <div>
          <Badge tone="success">{t("publicLink.published")}</Badge>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Go-live checklist */}
        <div className={CARD}>
          <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("publicLink.goLiveChecklist")}</p>
          <p className="-mt-1.5 text-[11px] text-[var(--octo-text-muted)]">{t("publicLink.checklistNote")}</p>
          <div className="flex flex-col gap-3">
            {GO_LIVE_ITEMS.map((item) => (
              <ChecklistItemRow key={item.id} label={t(item.labelKey)} note={t(item.noteKey)} done={item.done(draft)} />
            ))}
          </div>
        </div>

        {/* Public link + custom domain */}
        <div className="flex flex-col gap-4">
          <div className={CARD}>
            <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("publicLink.yourPublicLink")}</p>
            <p className="-mt-1.5 text-[11px] text-[var(--octo-text-muted)]">{t("publicLink.publicLinkNote")}</p>
            <div className="flex items-center gap-2 rounded-[10px] border border-[var(--octo-border-input)] px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--octo-text-primary)]">{liveUrl}</span>
              {draft.publish.published && (
                <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-[#16a34a]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
                  {t("publicLink.live")}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                size="sm"
                variant="secondary"
                icon={<Copy size={13} />}
                onClick={() => copyText(liveUrl, setCopiedLive)}
                className="flex-1 justify-center"
              >
                {copiedLive ? t("publicLink.preview.copied") : t("publicLink.copyLink")}
              </Button>
              <a href={liveUrl} target="_blank" rel="noreferrer" className={LINK_BUTTON}>
                <ExternalLink size={13} />
                {t("publicLink.openWebsite")}
              </a>
              <a href={`${liveUrl}?view=customer`} target="_blank" rel="noreferrer" className={LINK_BUTTON}>
                <Globe size={13} />
                {t("publicLink.visitAsCustomer")}
              </a>
            </div>
          </div>

          <div className={CARD}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("publicLink.customDomain")}</p>
              <span className="text-[10.5px] text-[var(--octo-text-faint)]">{t("publicLink.optional")}</span>
            </div>
            <p className="-mt-1.5 text-[11px] text-[var(--octo-text-muted)]">{t("publicLink.customDomainNote")}</p>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  value={customDomain.host}
                  onChange={(e) => handleHostChange(e.target.value)}
                  placeholder="www.your-restaurant.com"
                />
              </div>
              {hostSet && <Badge tone="info">{t("publicLink.primary")}</Badge>}
            </div>
            <div className="flex items-center justify-between gap-2 rounded-[10px] border border-[var(--octo-border-input)] px-3 py-2">
              <span className="text-[12px] text-[var(--octo-text-primary)]">{t("publicLink.sslCertificate")}</span>
              {hostSet ? <Badge tone="success">{t("publicLink.sslActive")}</Badge> : <span className="text-[11px] text-[var(--octo-text-faint)]">—</span>}
            </div>
            <p className="text-[11px] text-[var(--octo-text-muted)]">{t("publicLink.mockNote")}</p>
          </div>
        </div>

        {/* SEO & social */}
        <div className={CARD}>
          <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("publicLink.seoSocial")}</p>
          <p className="-mt-1.5 text-[11px] text-[var(--octo-text-muted)]">{t("publicLink.seoNote")}</p>
          <Input
            label={t("publicLink.siteTitle")}
            value={seo.title}
            onChange={(e) => dispatch({ type: "patchPublish", patch: { seo: { ...seo, title: e.target.value } } })}
          />
          <Textarea
            label={t("publicLink.metaDescription")}
            placeholder={t("publicLink.metaPlaceholder")}
            rows={3}
            value={seo.description}
            onChange={(e) => dispatch({ type: "patchPublish", patch: { seo: { ...seo, description: e.target.value } } })}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              {t("publicLink.socialImage")}
            </span>
            <div className="flex items-center gap-3">
              {seo.socialImageDataUrl ? (
                <img src={seo.socialImageDataUrl} alt="" className="h-14 w-24 rounded-[8px] border border-[var(--octo-border-input)] object-cover" />
              ) : (
                <span className="flex h-14 w-24 items-center justify-center rounded-[8px] border border-dashed border-[var(--octo-border-input)] text-[var(--octo-text-faint)]">
                  <Upload size={14} />
                </span>
              )}
              <div className="flex flex-col gap-1">
                <input
                  ref={socialImageRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) =>
                    readLogoFile(e.target.files?.[0], (dataUrl) =>
                      dispatch({ type: "patchPublish", patch: { seo: { ...seo, socialImageDataUrl: dataUrl } } })
                    )
                  }
                />
                <Button size="sm" variant="secondary" onClick={() => socialImageRef.current?.click()} className="w-fit">
                  {t("publicLink.changeImage")}
                </Button>
                <span className="text-[10.5px] text-[var(--octo-text-muted)]">{t("publicLink.socialImageHint")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share row */}
      <div className={CARD}>
        <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("publicLink.shareYourLink")}</p>
        <p className="-mt-1.5 text-[11px] text-[var(--octo-text-muted)]">{t("publicLink.shareNote")}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <ShareTile
            icon={<div ref={qrRef}><QrCode value={liveUrl} size={80} /></div>}
            label={t("publicLink.qrCode")}
            note={t("publicLink.scanToOpen")}
            action={
              <Button size="sm" variant="secondary" icon={<Download size={12} />} onClick={handleDownloadQr} className="w-full justify-center">
                {t("publicLink.download")}
              </Button>
            }
          />
          <ShareTile
            icon={<MessageCircle size={22} className="text-[#22C55E]" />}
            label={t("publicLink.whatsapp")}
            note={t("publicLink.shareLink")}
            action={
              <a
                href={`https://wa.me/?text=${encodeURIComponent(liveUrl)}`}
                target="_blank"
                rel="noreferrer"
                className={`${LINK_BUTTON} w-full !py-[5px] text-[11.5px]`}
              >
                {t("publicLink.share")}
              </a>
            }
          />
          <ShareTile
            icon={<Share2 size={22} className="text-[#0D6EFD]" />}
            label={t("publicLink.socialMedia")}
            note={t("publicLink.shareWith")}
            action={
              <Button
                size="sm"
                variant="secondary"
                icon={copiedSocial ? <Check size={12} /> : <Copy size={12} />}
                onClick={() => copyText(liveUrl, setCopiedSocial)}
                className="w-full justify-center"
              >
                {copiedSocial ? t("publicLink.preview.copied") : t("publicLink.shareLink")}
              </Button>
            }
          />
          <ShareTile
            icon={<Mail size={22} className="text-[var(--octo-text-secondary)]" />}
            label={t("publicLink.emailShare")}
            note={t("publicLink.sendByEmail")}
            action={
              <a
                href={`mailto:?subject=${encodeURIComponent(model.businessName)}&body=${encodeURIComponent(liveUrl)}`}
                className={`${LINK_BUTTON} w-full !py-[5px] text-[11.5px]`}
              >
                {t("publicLink.send")}
              </a>
            }
          />
          <ShareTile
            icon={<Code2 size={22} className="text-[var(--octo-text-secondary)]" />}
            label={t("publicLink.embed")}
            note={t("publicLink.addToYourSite")}
            action={
              <Button size="sm" variant="secondary" onClick={() => setEmbedOpen(true)} className="w-full justify-center">
                {t("publicLink.getCode")}
              </Button>
            }
          />
        </div>
      </div>

      <StorefrontPreview model={model} />

      <Modal
        open={embedOpen}
        onClose={() => setEmbedOpen(false)}
        title={t("publicLink.embed")}
        footer={
          <Button
            size="sm"
            icon={copiedEmbed ? <Check size={13} /> : <Copy size={13} />}
            onClick={() => copyText(embedSnippet, setCopiedEmbed)}
          >
            {copiedEmbed ? t("publicLink.preview.copied") : t("publicLink.copyLink")}
          </Button>
        }
      >
        <Textarea readOnly rows={4} value={embedSnippet} className="font-mono text-[11px]" />
      </Modal>
    </div>
  );
}
