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
import clsx from "clsx";
import type { CreatePreviewLinkResponse, PreviewLinkResponse } from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import type { PublicLinkSync } from "@/entities/site-draft";
import { storefrontPreviewUrl } from "../../_shared/preview-url";
import { usePlText } from "../../_shared/texts";
import { rules, useTouched, useValidation } from "../../_shared/validation";
import { PlButton, PlField, PlIcon, PlInput, plPanel, plText } from "../../ui/kit";
import { QrCode } from "../../ui/qr-code";
import { useBusy } from "./common";

const LABEL_MAX = 80;
/** The frames' 12px muted copy under a panel title. */
const NOTE = "text-[12px] font-medium leading-[1.3] text-[var(--pl-text-2)]";
/** The frames' 32px outlined button, also worn by the "Open" link. */
const SMALL_ACTION =
  "inline-flex h-8 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[4px] border border-[var(--pl-g300)] px-3 text-[12px] font-bold leading-[12px] text-[var(--pl-text)] transition-colors hover:bg-[var(--pl-g50)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40";

export function PreviewLinksCard({ sync, expiresInDays }: { sync: PublicLinkSync; expiresInDays: number }) {
  const tx = usePlText();
  const { locale } = useI18n();
  const { act, busy } = useBusy();
  const { check } = useValidation();
  const { touched, touch, reset } = useTouched();
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

  // The label is optional; at most 80 characters of it are kept.
  const labelFailure = check(label.trim(), [rules.maxLength(LABEL_MAX)]);
  const labelError = touched("label") ? labelFailure : undefined;

  function create() {
    if (labelFailure) {
      touch("label");
      return;
    }
    void act("create", async () => {
      const link = await sync.createPreviewLink(label.trim() || null, expiresInDays);
      if (link) {
        setCreated(link);
        setLabel("");
        reset();
        reload();
      }
    });
  }

  return (
    <div className={clsx(plPanel, "flex min-w-0 flex-col gap-4 px-3 py-4")}>
      <div className="flex flex-col gap-2">
        <p className={plText.h6}>{tx("pl.preview.links")}</p>
        <p className={NOTE}>{tx("pl.preview.linksNote")}</p>
      </div>

      {created ? (
        <div className="flex flex-col gap-3">
          <p className="text-[12px] font-medium leading-[1.3] text-[var(--pl-success)]">{tx("pl.preview.newLink")}</p>
          <div className="flex items-center justify-between gap-3 rounded-[12px] border border-[var(--pl-g300)] bg-[var(--pl-primary-soft)] px-3 py-2">
            <a
              href={createdUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 truncate text-start text-[14px] font-semibold leading-[1.4] text-[var(--pl-primary)] underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40"
              dir="ltr"
              title={createdUrl}
            >
              {createdUrl}
            </a>
            <button
              type="button"
              onClick={() => void copy(createdUrl)}
              aria-label={tx("publicLink.preview.copyLink")}
              title={copied ? tx("publicLink.preview.copied") : tx("publicLink.preview.copyLink")}
              className={clsx(
                "grid h-6 w-6 shrink-0 place-items-center rounded-[4px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
                copied ? "text-[var(--pl-success)]" : "text-[var(--pl-primary)]"
              )}
            >
              <PlIcon name={copied ? "completed" : "preview-copy"} />
            </button>
            <span role="status" className="sr-only">
              {copied ? tx("publicLink.preview.copied") : ""}
            </span>
          </div>
          {/* The QR encoder's byte budget is small; a longer address is shown as text only. */}
          {createdUrl.length <= 78 && <QrCode value={createdUrl} size={88} />}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={NOTE}>{tx("pl.preview.expires", { date: fmt(created.expiresAtUtc) })}</span>
            <div className="flex items-center gap-2">
              <a href={createdUrl} target="_blank" rel="noopener noreferrer" className={SMALL_ACTION}>
                {tx("pl.preview.open")}
              </a>
              <PlButton variant="plain" size="xs" onClick={() => setCreated(null)}>
                {tx("pl.preview.hide")}
              </PlButton>
            </div>
          </div>
          <p className={plText.hint}>{tx("pl.preview.onceNote")}</p>
        </div>
      ) : (
        <p className={NOTE}>{tx("pl.preview.createFirst")}</p>
      )}

      <div className="flex flex-col gap-3">
        <PlField label={tx("pl.preview.labelField")} optional={tx("pl.preview.optional")} error={labelError}>
          <PlInput
            aria-label={tx("pl.preview.label")}
            placeholder={tx("pl.preview.labelPlaceholder")}
            value={label}
            invalid={Boolean(labelError)}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => touch("label")}
            onKeyDown={(e) => {
              if (e.key === "Enter" && busy === null) {
                e.preventDefault();
                create();
              }
            }}
          />
        </PlField>
        <PlButton size="md" className="w-full" disabled={busy !== null} onClick={create}>
          {busy === "create" ? tx("pl.preview.creating") : tx("pl.preview.create")}
        </PlButton>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className={plText.h6}>
          {tx("pl.preview.active")}
          {links && links.length > 0 && <span className="ms-1 text-[var(--pl-text-2)]">({links.length})</span>}
        </span>
        {links && links.length > 0 && (
          <PlButton
            variant="dangerSoft"
            size="xs"
            disabled={busy !== null}
            onClick={() =>
              void act("all", () => sync.revokeAllPreviewLinks()).then(() => {
                setCreated(null);
                reload();
              })
            }
          >
            {tx("pl.preview.revokeAll")}
          </PlButton>
        )}
      </div>
      {links && links.length === 0 && <p className={NOTE}>{tx("pl.preview.none")}</p>}
      {links?.map((link) => (
        <div key={link.linkId} className="flex items-center justify-between gap-2 border-b border-[var(--pl-g300)] pb-2 last:border-0 last:pb-0">
          <div className="flex min-w-0 flex-col gap-2">
            <span className="truncate text-[14px] font-medium leading-[14px] text-[var(--pl-text)]">{link.label ?? fmt(link.createdAtUtc)}</span>
            <span className="text-[12px] font-medium leading-[12px] text-[var(--pl-text-2)]">{tx("pl.preview.expires", { date: fmt(link.expiresAtUtc) })}</span>
          </div>
          <PlButton
            variant="plain"
            size="xs"
            disabled={busy !== null}
            onClick={() =>
              void act(link.linkId, () => sync.revokePreviewLink(link.linkId)).then(() => {
                if (created?.linkId === link.linkId) setCreated(null);
                reload();
              })
            }
          >
            {tx("pl.preview.revoke")}
          </PlButton>
        </div>
      ))}
    </div>
  );
}
