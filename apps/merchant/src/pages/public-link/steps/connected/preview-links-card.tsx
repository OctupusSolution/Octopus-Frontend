// Step 6 while connected: real private preview links (POST/GET /preview-links,
// POST …/{id}/revoke, POST …/revoke-all). The secret is returned only once, at
// creation, so the address carrying it is shown once — kept in this component
// only until the merchant dismisses it or leaves the step — and the list
// afterwards shows labels and expiry only.
//
// The address opens the customer storefront's preview entry point on the
// site's own host (`https://<host>/_preview?token=…`, or
// `http://<slug>.localhost:3000/_preview?token=…` in local development); see
// _shared/preview-url.ts.
import { useCallback, useEffect, useState } from "react";
import { Copy, ExternalLink, QrCode as QrCodeIcon } from "lucide-react";
import { Button, Input } from "@ui/primitives";
import type { CreatePreviewLinkResponse, PreviewLinkResponse } from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import type { PublicLinkSync } from "@/entities/site-draft";
import { storefrontPreviewUrl } from "../../_shared/preview-url";
import { usePlText } from "../../_shared/texts";
import { QrCode } from "../../ui/qr-code";
import { CARD_NOTE, SMALL_BUTTON, useBusy } from "./common";

export function PreviewLinksCard({ sync, expiresInDays }: { sync: PublicLinkSync; expiresInDays: number }) {
  const tx = usePlText();
  const { locale } = useI18n();
  const { act, busy } = useBusy();
  const [label, setLabel] = useState("");
  const [created, setCreated] = useState<CreatePreviewLinkResponse | null>(null);
  const [links, setLinks] = useState<PreviewLinkResponse[] | null>(null);
  const [copied, setCopied] = useState(false);

  const reload = useCallback(() => {
    sync.listPreviewLinks().then(setLinks, () => setLinks([]));
  }, [sync]);
  useEffect(reload, [reload]);

  const address = sync.server?.overview.address;
  const createdUrl = created
    ? storefrontPreviewUrl(created.token, {
        host: address?.hostname,
        slug: address?.slug,
        currentHostname: typeof window !== "undefined" ? window.location.hostname : "",
        expiresAtUtc: created.expiresAtUtc,
        fallback: created.previewUrl,
      })
    : "";

  const fmt = (iso: string) => new Date(iso).toLocaleString(locale === "ar" ? "ar-SA" : "en-GB", { dateStyle: "medium", timeStyle: "short" });

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be unavailable (plain http, blocked); the link stays on screen.
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{tx("pl.preview.links")}</p>
      <p className={CARD_NOTE + " mt-0"}>{tx("pl.preview.linksNote")}</p>

      {created ? (
        <div className="flex flex-col gap-2 rounded-[10px] border border-[#22C55E]/40 bg-[#22C55E]/5 px-3 py-2.5">
          <span className="text-[11px] font-medium text-[#16a34a]">{tx("pl.preview.newLink")}</span>
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--octo-text-primary)]" dir="ltr" title={createdUrl}>
              {createdUrl}
            </span>
            <Button size="sm" variant="secondary" icon={<Copy size={13} />} onClick={() => void copy(createdUrl)}>
              {copied ? tx("publicLink.preview.copied") : tx("publicLink.preview.copyLink")}
            </Button>
            <a
              href={createdUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={SMALL_BUTTON}
            >
              <ExternalLink size={13} />
              {tx("pl.preview.open")}
            </a>
          </div>
          {/* The QR encoder's byte budget is small; a longer address is shown as text only. */}
          {createdUrl.length <= 78 && (
            <div className="flex items-center gap-2">
              <QrCodeIcon size={13} className="shrink-0 text-[var(--octo-text-faint)]" />
              <QrCode value={createdUrl} size={88} />
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-[var(--octo-text-muted)]">{tx("pl.preview.expires", { date: fmt(created.expiresAtUtc) })}</span>
            <button type="button" className={SMALL_BUTTON} onClick={() => setCreated(null)}>
              {tx("pl.preview.hide")}
            </button>
          </div>
          <span className="text-[10.5px] text-[var(--octo-text-muted)]">{tx("pl.preview.onceNote")}</span>
        </div>
      ) : (
        <p className="text-[11.5px] text-[var(--octo-text-muted)]">{tx("pl.preview.createFirst")}</p>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input aria-label={tx("pl.preview.label")} placeholder={tx("pl.preview.label")} value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <Button
          size="sm"
          disabled={busy !== null}
          onClick={() =>
            void act("create", async () => {
              const link = await sync.createPreviewLink(label.trim() || null, expiresInDays);
              if (link) {
                setCreated(link);
                setLabel("");
                reload();
              }
            })
          }
        >
          {busy === "create" ? tx("pl.preview.creating") : tx("pl.preview.create")}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{tx("pl.preview.active")}</span>
        {links && links.length > 0 && (
          <button type="button" className={SMALL_BUTTON} disabled={busy !== null} onClick={() => void act("all", () => sync.revokeAllPreviewLinks()).then(() => { setCreated(null); reload(); })}>
            {tx("pl.preview.revokeAll")}
          </button>
        )}
      </div>
      {links && links.length === 0 && <p className="text-[11.5px] text-[var(--octo-text-muted)]">{tx("pl.preview.none")}</p>}
      {links?.map((link) => (
        <div key={link.linkId} className="flex items-center justify-between gap-2 rounded-[9px] border border-[var(--octo-border-input)] px-3 py-2">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[12px] font-medium text-[var(--octo-text-primary)]">{link.label ?? fmt(link.createdAtUtc)}</span>
            <span className="text-[11px] text-[var(--octo-text-muted)]">{tx("pl.preview.expires", { date: fmt(link.expiresAtUtc) })}</span>
          </div>
          <button
            type="button"
            className={SMALL_BUTTON}
            disabled={busy !== null}
            onClick={() =>
              void act(link.linkId, () => sync.revokePreviewLink(link.linkId)).then(() => {
                if (created?.linkId === link.linkId) setCreated(null);
                reload();
              })
            }
          >
            {tx("pl.preview.revoke")}
          </button>
        </div>
      ))}
    </div>
  );
}
