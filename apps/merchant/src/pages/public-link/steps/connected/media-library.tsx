// The site's media library (GET /media-assets): every image and video already uploaded for this
// site, newest first. Media fields (logo, favicon, hero background, section images, the social
// image) can reuse a file instead of uploading it again; a picked asset goes through the sync's
// `pickLibraryAsset` (`rememberMedia`) so the next save sends its reference.
//
// Files can also be deleted (DELETE /media-assets/{id}) after a confirmation that lists where the
// file is used (GET /media-assets/{id}). The server refuses while anything — the draft or any
// retained published version — still shows it (409 publiclink.media.asset-in-use); that refusal is
// shown here with the places it names.
//
// The server checks purposes: a logo must be a Logo asset, a favicon a Favicon asset, the social
// image a SocialImage asset, a section field one of the purposes its catalogue field lists. So a
// picker is opened with the purposes its field accepts and only offers those.
import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { Film, Images, Trash2 } from "lucide-react";
import { Button, Modal, Select } from "@ui/primitives";
import type { SiteMediaAssetDetailResponse, SiteMediaInUseDetails, SiteMediaLibraryItemResponse, SiteMediaPurpose } from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import { describePublicLinkError, MediaInUseError, pickText, type PickedSiteMedia, type PublicLinkSync } from "@/entities/site-draft";
import { usePlText } from "../../_shared/texts";
import { SMALL_BUTTON } from "./common";

const PAGE_SIZE = 24;
export const ALL_PURPOSES: SiteMediaPurpose[] = ["Logo", "Favicon", "HeroBackground", "SectionImage", "SocialImage", "SectionVideo"];

const formatBytes = (bytes: number) => (bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

function Thumb({ asset }: { asset: SiteMediaLibraryItemResponse }) {
  if (String(asset.kind).toLowerCase() === "video") {
    return (
      <span className="grid h-full w-full place-items-center bg-[var(--octo-hover)] text-[var(--octo-text-faint)]">
        <Film size={18} />
      </span>
    );
  }
  return <img src={asset.deliveryUrl} alt="" loading="lazy" className="h-full w-full object-cover" />;
}

/** Where an asset is used, in words: pages by title, site-level fields, published versions. */
function UsageList({ sync, usage }: { sync: PublicLinkSync; usage: SiteMediaInUseDetails }) {
  const tx = usePlText();
  const { locale } = useI18n();
  const pages = sync.server?.overview.pages ?? [];
  const fallback = sync.editLanguage;
  const names = Array.from(
    new Set(
      usage.draft.map((use) => {
        if (!use.pageId) return tx("pl.media.usedSite", { field: use.field });
        const page = pages.find((p) => p.pageId === use.pageId);
        return tx("pl.media.usedPage", { page: page ? pickText(page.title, locale, fallback) || page.path : use.pageId });
      })
    )
  );
  return (
    <ul className="flex list-disc flex-col gap-0.5 ps-5 text-[11.5px] text-[var(--octo-text-secondary)]">
      {names.map((n) => (
        <li key={n}>{n}</li>
      ))}
      {usage.publishedVersions.length > 0 && <li>{tx("pl.media.usedVersions", { versions: usage.publishedVersions.map((v) => `v${v}`).join(", ") })}</li>}
    </ul>
  );
}

export function MediaLibraryModal({
  sync,
  open,
  onClose,
  onPick,
  purposes,
  kind,
}: {
  sync: PublicLinkSync;
  open: boolean;
  onClose: () => void;
  /** Absent: a manage-only library (browse and delete). */
  onPick?: (media: PickedSiteMedia) => void;
  /** The purposes the field accepts; absent = every purpose. */
  purposes?: readonly SiteMediaPurpose[];
  kind?: "image" | "video";
}) {
  const tx = usePlText();
  const { locale } = useI18n();
  const offered = purposes && purposes.length ? purposes : null;
  const [purpose, setPurpose] = useState<SiteMediaPurpose | "">(offered ? offered[0] : "");
  const [items, setItems] = useState<SiteMediaLibraryItemResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ asset: SiteMediaLibraryItemResponse; detail: SiteMediaAssetDetailResponse | null } | null>(null);
  const [refusal, setRefusal] = useState<{ assetId: string; usage: SiteMediaInUseDetails } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // The sync object is new on every render; its actions are stable.
  const list = sync.listMediaLibrary;
  const load = useCallback(
    (nextPage: number, replace: boolean) => {
      setLoading(true);
      setError(null);
      list({ kind, purpose: purpose || undefined, sort: "-createdAt", page: nextPage, pageSize: PAGE_SIZE })
        .then(
          (res) => {
            setItems((prev) => (replace ? res.items : [...prev, ...res.items.filter((i) => !prev.some((p) => p.assetId === i.assetId))]));
            setTotal(res.total);
            setPage(nextPage);
          },
          (err) => setError(describePublicLinkError(err, locale))
        )
        .finally(() => setLoading(false));
    },
    [list, kind, purpose, locale]
  );

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setConfirm(null);
    setRefusal(null);
    load(1, true);
  }, [open, load]);

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-GB", { dateStyle: "medium" });
  const chosen = items.find((i) => i.assetId === selected) ?? null;

  function askDelete(asset: SiteMediaLibraryItemResponse) {
    setRefusal(null);
    setConfirm({ asset, detail: null });
    sync.getMediaAsset(asset.assetId).then(
      (detail) => setConfirm((c) => (c && c.asset.assetId === asset.assetId ? { ...c, detail } : c)),
      () => undefined // the delete itself still reports a refusal
    );
  }

  function doDelete() {
    if (!confirm) return;
    const { asset } = confirm;
    setDeleting(true);
    sync
      .deleteMediaAsset(asset.assetId)
      .then(
        () => {
          setItems((prev) => prev.filter((i) => i.assetId !== asset.assetId));
          setTotal((t) => Math.max(0, t - 1));
          if (selected === asset.assetId) setSelected(null);
          setConfirm(null);
        },
        (err) => {
          setConfirm(null);
          if (err instanceof MediaInUseError) setRefusal({ assetId: asset.assetId, usage: err.usage });
          else setError(describePublicLinkError(err, locale));
        }
      )
      .finally(() => setDeleting(false));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tx("pl.media.title")}
      className="max-w-3xl"
      footer={
        onPick ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              {tx("pl.common.cancel")}
            </Button>
            <Button
              disabled={!chosen}
              onClick={() => {
                if (!chosen) return;
                onPick(sync.pickLibraryAsset(chosen));
                onClose();
              }}
            >
              {tx("pl.media.use")}
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            {tx("pl.media.close")}
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11.5px] text-[var(--octo-text-muted)]">{tx("pl.media.note")}</p>
          {(offered === null || offered.length > 1) && (
            <div className="w-[190px]">
              <Select aria-label={tx("pl.media.purpose")} value={purpose} onChange={(e) => setPurpose(e.target.value as SiteMediaPurpose | "")}>
                {offered === null && <option value="">{tx("pl.media.purpose.all")}</option>}
                {(offered ?? ALL_PURPOSES).map((p) => (
                  <option key={p} value={p}>
                    {tx(`pl.media.purpose.${p}`)}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        {refusal && (
          <div role="alert" className="flex flex-col gap-1.5 rounded-[10px] border border-[#F59E0B]/40 bg-[#F59E0B]/5 px-3 py-2.5">
            <span className="text-[12px] font-medium text-[#B45309]">{tx("pl.media.inUse")}</span>
            <UsageList sync={sync} usage={refusal.usage} />
          </div>
        )}
        {error && (
          <p role="alert" className="text-[11.5px] text-[#DC2626]">
            {error}
          </p>
        )}

        {confirm && (
          <div className="flex flex-col gap-2 rounded-[10px] border border-[#EF4444]/30 bg-[#EF4444]/5 px-3 py-2.5">
            <span className="text-[12px] font-medium text-[var(--octo-text-primary)]">{tx("pl.media.deleteConfirm")}</span>
            {confirm.detail && !confirm.detail.isDeletable && (
              <>
                <span className="text-[11.5px] text-[#B45309]">{tx("pl.media.inUse")}</span>
                <UsageList sync={sync} usage={confirm.detail.usage} />
              </>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="danger" disabled={deleting} onClick={doDelete}>
                {deleting ? tx("pl.common.saving") : tx("pl.common.delete")}
              </Button>
              <Button size="sm" variant="secondary" disabled={deleting} onClick={() => setConfirm(null)}>
                {tx("pl.common.cancel")}
              </Button>
            </div>
          </div>
        )}

        {!loading && items.length === 0 && !error && (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-[var(--octo-text-muted)]">
            <Images size={22} />
            <span className="text-[12px]">{tx("pl.media.empty")}</span>
          </div>
        )}

        <ul className="grid max-h-[52vh] grid-cols-2 gap-2.5 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
          {items.map((asset) => {
            const isSelected = selected === asset.assetId;
            return (
              <li key={asset.assetId} className="relative">
                <button
                  type="button"
                  aria-pressed={onPick ? isSelected : undefined}
                  onClick={() => onPick && setSelected(asset.assetId)}
                  className={clsx(
                    "flex w-full flex-col overflow-hidden rounded-[10px] border text-start transition-colors",
                    isSelected ? "border-[#0D6EFD] ring-2 ring-[#0D6EFD]/30" : "border-[var(--octo-border-input)] hover:border-[#0D6EFD]/60",
                    !onPick && "cursor-default"
                  )}
                >
                  <span className="block aspect-[4/3] w-full overflow-hidden bg-[var(--octo-hover)]">
                    <Thumb asset={asset} />
                  </span>
                  <span className="flex flex-col gap-0.5 px-2 py-1.5">
                    <span className="truncate text-[11px] font-medium text-[var(--octo-text-primary)]">
                      {asset.purpose ? tx(`pl.media.purpose.${asset.purpose}`) : asset.format.toUpperCase()}
                    </span>
                    <span className="truncate text-[10.5px] text-[var(--octo-text-muted)]" dir="ltr">
                      {asset.width && asset.height ? `${asset.width}×${asset.height} · ` : ""}
                      {formatBytes(asset.bytes)} · {fmtDate(asset.createdAtUtc)}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`${tx("pl.common.delete")} — ${asset.format}`}
                  onClick={() => askDelete(asset)}
                  className="absolute end-1.5 top-1.5 rounded-[7px] bg-[var(--octo-card)]/90 p-1 text-[var(--octo-text-faint)] shadow-sm hover:text-[#EF4444]"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[var(--octo-text-muted)]">{tx("pl.media.count", { shown: items.length, total })}</span>
          {items.length < total && (
            <button type="button" className={SMALL_BUTTON} disabled={loading} onClick={() => load(page + 1, false)}>
              {loading ? tx("pl.sync.loading") : tx("pl.media.more")}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

/** A "Library" button that opens the picker for one media field. */
export function MediaLibraryButton({
  sync,
  purposes,
  kind,
  onPick,
  className,
}: {
  sync: PublicLinkSync;
  purposes?: readonly SiteMediaPurpose[];
  kind?: "image" | "video";
  onPick: (media: PickedSiteMedia) => void;
  className?: string;
}) {
  const tx = usePlText();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size="sm" icon={<Images size={13} />} onClick={() => setOpen(true)} className={className}>
        {tx("pl.media.library")}
      </Button>
      <MediaLibraryModal sync={sync} open={open} onClose={() => setOpen(false)} onPick={onPick} purposes={purposes} kind={kind} />
    </>
  );
}

/** Opens the whole library to browse and delete files (no field to fill). */
export function MediaLibraryManageButton({ sync }: { sync: PublicLinkSync }) {
  const tx = usePlText();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={SMALL_BUTTON + " w-fit"} onClick={() => setOpen(true)}>
        <Images size={13} />
        {tx("pl.media.manage")}
      </button>
      <MediaLibraryModal sync={sync} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
