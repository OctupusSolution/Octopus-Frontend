// Step 3 while connected: the site's real pages (GET /public-link pages). Each
// row can be shown/hidden (PUT /draft/pages/{id}), put in or out of the header
// menu (PUT /draft/navigation), opened in Customize, edited (title, address,
// search settings, old addresses) or deleted (DELETE /draft/pages/{id}); rows
// reorder with PUT /draft/pages/order (Home stays first). "Add page" creates one
// from a catalogue template or from another module's content (POST /draft/pages).
import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { FileText, Link2, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { Badge, Checkbox, Modal } from "@ui/primitives";
import type { PageDraftResponse, PageMediaReference, PageSummaryResponse } from "@octopus/api-client";
import { readLogoFile } from "@/pages/onboarding/_shared/logo-file";
import { MediaLibraryButton } from "./media-library";
import { useI18n } from "@/app/providers/i18n-provider";
import { withText, type PublicLinkSync, type SiteAction } from "@/entities/site-draft";
import { usePlText } from "../../_shared/texts";
import { rules, useTouched, useValidation } from "../../_shared/validation";
import { PlButton, PlField, PlFieldError, PlInfoBanner, PlInput, PlTextarea, plText } from "../../ui/kit";
import { PlPageIcon } from "../../ui/nav-preview";
import { ReorderHint, ReorderList } from "../../ui/reorder-list";
import { Switch } from "../../ui/switch";
import { isInMenu, orderedPages, pageInput, pageTitle, toggleMenuItems, useBusy } from "./common";

// The Pages frame's table, shared with the sample-mode table in pages-step.tsx:
// 12px medium column heads, 41px rows (24px content + 8px padding) split by
// gray-300 hairlines, and the underlined blue "Customize" link.
export const PAGES_TH = "pb-3 text-[12px] font-medium leading-[12px] text-[var(--pl-text)]";
export const PAGES_TD = "border-t border-[var(--pl-g300)] py-2 align-middle";
export const PAGES_BODY = "[&>tr:last-child>td]:border-b";
export const PAGES_NAME = "flex min-w-0 items-center gap-2 text-[14px] font-medium leading-[14px] text-[var(--pl-text)]";
export const PAGES_LINK =
  "rounded-[2px] text-[14px] font-semibold leading-[14px] text-[var(--pl-primary)] underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40";
export const PAGES_DASH = "text-[14px] font-semibold leading-[14px] text-[var(--pl-text-2)]";

const ICON_BUTTON =
  "grid h-6 w-6 place-items-center rounded text-[var(--pl-text-3)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40";
const GROUP_LABEL = "text-[12px] font-medium leading-[12px] text-[var(--pl-text-2)]";

/** The frame's icon for a server page, where it draws one. */
function pageIconId(page: PageSummaryResponse): string | undefined {
  if (page.isHome) return "home";
  const source = page.source?.sourceKey;
  if (source === "menu") return "menu";
  if (source === "reservation") return "reservations";
  return undefined;
}

// Limits for the page-settings fields. Title and address keep the caps the
// inputs already enforced; the search fields are capped where a result
// snippet stops being shown in full anyway.
const TITLE_MAX = 120;
const PATH_MAX = 60;
const SEO_TITLE_MAX = 120;
const SEO_DESCRIPTION_MAX = 320;
const SOCIAL_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const SOCIAL_IMAGE_MAX_MB = 10;

export function ServerPagesPanel({ sync, dispatch }: { sync: PublicLinkSync; dispatch: (action: SiteAction) => void }) {
  const tx = usePlText();
  const { locale } = useI18n();
  const { act, busy } = useBusy();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<PageDraftResponse | null>(null);
  const [deleting, setDeleting] = useState<PageSummaryResponse | null>(null);
  const server = sync.server!;
  const lang = sync.editLanguage;
  const pages = orderedPages(server);
  const home = pages.filter((p) => p.isHome);
  const others = pages.filter((p) => !p.isHome);
  const { limits } = server.overview;
  const titleOf = (p: PageSummaryResponse) => pageTitle(p, locale, lang);

  async function draftOf(pageId: string) {
    return server.pages[pageId] ?? (await sync.loadPage(pageId));
  }

  function toggleVisible(page: PageSummaryResponse) {
    void act(`vis:${page.pageId}`, async () => {
      const draft = await draftOf(page.pageId);
      if (!draft) return;
      await sync.updatePage(page.pageId, { ...pageInput(draft), visibility: draft.visibility === "hidden" ? "visible" : "hidden" });
    });
  }

  function toggleMenu(page: PageSummaryResponse) {
    const options = server.navigation?.options ?? null;
    void act(`nav:${page.pageId}`, () => sync.saveNavigation({ items: toggleMenuItems(server, page), options }));
  }

  function customize(page: PageSummaryResponse) {
    dispatch({ type: "selectPage", pageId: page.pageId });
    dispatch({ type: "goTo", step: 5 });
  }

  function row(page: PageSummaryResponse, grip: ReactNode) {
    const hidden = page.visibility === "hidden";
    return (
      <>
        <td className={clsx(PAGES_TD, "ps-2")}>{grip}</td>
        <td className={PAGES_TD}>
          <span className={PAGES_NAME}>
            <PlPageIcon id={pageIconId(page)} />
            <span className="truncate py-0.5">{titleOf(page)}</span>
            {hidden && <Badge tone="neutral">{tx("pl.pages.hidden")}</Badge>}
          </span>
          <span className="mt-1 block truncate ps-6 text-start text-[12px] leading-[12px] text-[var(--pl-text-2)] rtl:text-end" dir="ltr">
            {page.path}
          </span>
        </td>
        <td className={clsx(PAGES_TD, "text-center")}>
          {page.isHome ? (
            <span aria-hidden className={PAGES_DASH}>-</span>
          ) : (
            <Switch checked={!hidden} onChange={() => busy === null && toggleVisible(page)} label={`${titleOf(page)} — ${tx("pl.pages.visible")}`} />
          )}
        </td>
        <td className={clsx(PAGES_TD, "text-center")}>
          <Switch checked={isInMenu(server, page)} onChange={() => busy === null && toggleMenu(page)} label={`${titleOf(page)} — ${tx("pl.pages.inNav")}`} />
        </td>
        <td className={clsx(PAGES_TD, "pe-2 text-end")}>
          <span className="inline-flex items-center gap-1 align-middle">
            <button type="button" onClick={() => customize(page)} className={clsx(PAGES_LINK, "me-1")}>
              {tx("publicLink.pages.customize")}
            </button>
            <button
              type="button"
              aria-label={`${titleOf(page)} — ${tx("pl.pages.settings")}`}
              onClick={() => void draftOf(page.pageId).then((d) => d && setEditing(d), () => undefined)}
              className={clsx(ICON_BUTTON, "hover:text-[var(--pl-text)]")}
            >
              <Pencil size={14} />
            </button>
            {!page.isHome && (
              <button
                type="button"
                aria-label={`${titleOf(page)} — ${tx("pl.common.delete")}`}
                onClick={() => setDeleting(page)}
                className={clsx(ICON_BUTTON, "hover:text-[var(--pl-error)]")}
              >
                <Trash2 size={14} />
              </button>
            )}
          </span>
        </td>
      </>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-3 xl:col-span-2 min-[1400px]:col-span-1">
      <div className="flex items-center justify-between gap-2">
        <span className={plText.sub}>{tx("pl.pages.limit", { used: pages.length, max: limits.maxPages })}</span>
        <PlButton variant="outline" size="xs" disabled={pages.length >= limits.maxPages} onClick={() => setAdding(true)}>
          <Plus size={14} />
          {tx("pl.pages.add")}
        </PlButton>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px] table-fixed border-collapse text-start">
          <colgroup>
            <col className="w-10" />
            <col />
            <col className="w-[72px]" />
            <col className="w-[72px]" />
            <col className="w-[150px]" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className={PAGES_TH}>
                <span className="sr-only">{tx("publicLink.reorder.hint")}</span>
              </th>
              <th scope="col" className={clsx(PAGES_TH, "ps-6 text-start")}>{tx("pl.pages.title")}</th>
              <th scope="col" className={clsx(PAGES_TH, "text-center")}>{tx("pl.pages.visible")}</th>
              <th scope="col" className={clsx(PAGES_TH, "text-center")}>{tx("pl.pages.inNav")}</th>
              <th scope="col" className={clsx(PAGES_TH, "pe-2 text-end")}>{tx("pl.pages.actions")}</th>
            </tr>
          </thead>
          <tbody className={others.length === 0 ? PAGES_BODY : undefined}>
            {home.map((page) => (
              <tr key={page.pageId}>{row(page, <span className="block h-6 w-6" />)}</tr>
            ))}
          </tbody>
          <ReorderList
            as="table"
            className={PAGES_BODY}
            items={others}
            getId={(page) => page.pageId}
            getLabel={titleOf}
            onReorder={(next) => void act("order", () => sync.reorderPages(next.map((p) => p.pageId)))}
            renderRow={(page, _index, grip) => row(page, grip)}
          />
        </table>
      </div>
      <ReorderHint>{tx("pl.pages.reorderHint")}</ReorderHint>
      <PlInfoBanner className="min-h-10">{tx("publicLink.pages.tip")}</PlInfoBanner>

      <AddPageModal open={adding} onClose={() => setAdding(false)} sync={sync} />
      {editing && <PageSettingsModal page={editing} onClose={() => setEditing(null)} sync={sync} />}
      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={tx("pl.common.delete")}
        footer={
          <div className="flex justify-end gap-2">
            <PlButton variant="plain" size="md" onClick={() => setDeleting(null)}>
              {tx("pl.common.cancel")}
            </PlButton>
            <PlButton
              variant="dangerSoft"
              size="md"
              disabled={busy !== null}
              onClick={() => {
                const target = deleting;
                setDeleting(null);
                if (target) void act(`del:${target.pageId}`, () => sync.deletePage(target.pageId));
              }}
            >
              {tx("pl.common.delete")}
            </PlButton>
          </div>
        }
      >
        <p className="text-[14px] font-medium leading-[1.4] text-[var(--pl-text)]">{tx("pl.pages.deleteConfirm", { name: deleting ? titleOf(deleting) : "" })}</p>
      </Modal>
    </div>
  );
}

function AddPageModal({ open, onClose, sync }: { open: boolean; onClose: () => void; sync: PublicLinkSync }) {
  const tx = usePlText();
  const { locale } = useI18n();
  const { act, busy } = useBusy();
  const server = sync.server!;
  const templates = (server.catalogues?.pageTemplates ?? []).filter((t) => t.key !== "home");
  const sources = server.sources.filter((s) => s.descriptor.placements.some((p) => p.toLowerCase() === "page"));
  const pageFor = (pageId: string | null) => server.overview.pages.find((p) => p.pageId === pageId);

  function create(id: string, input: Parameters<PublicLinkSync["createPage"]>[0]) {
    void act(id, async () => {
      await sync.createPage({ ...input, addToNavigation: { header: true, drawer: true } });
      onClose();
    });
  }

  const option = "flex min-h-10 w-full items-center gap-2 rounded-[12px] border border-[var(--pl-g300)] px-3 py-2 text-start text-[14px] font-medium leading-[1.3] text-[var(--pl-text)] transition-colors hover:border-[var(--pl-primary)] hover:text-[var(--pl-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <Modal open={open} onClose={onClose} title={tx("pl.pages.addTitle")}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className={GROUP_LABEL}>{tx("pl.pages.templates")}</p>
          {templates.map((template) => (
            <button key={template.key} type="button" disabled={busy !== null} className={option} onClick={() => create(template.key, { templateKey: template.key })}>
              <FileText size={16} strokeWidth={1.5} className="shrink-0" />
              <span className="flex-1">{tx(`pl.template.${template.key}`) === `pl.template.${template.key}` ? template.defaultTitle[locale] ?? template.key : tx(`pl.template.${template.key}`)}</span>
              {busy === template.key && <span className="text-[12px] font-normal">{tx("pl.common.saving")}</span>}
            </button>
          ))}
        </div>
        {sources.some((s) => s.items.length > 0) && (
          <div className="flex flex-col gap-2">
            <p className={GROUP_LABEL}>{tx("pl.pages.modules")}</p>
            {sources.flatMap((source) =>
              source.items.map((item) => {
                const existing = item.usage?.pageId ? pageFor(item.usage.pageId) : undefined;
                const id = `${source.sourceKey}:${item.contentKey}`;
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={busy !== null || Boolean(existing)}
                    className={option}
                    onClick={() => create(id, { source: { sourceKey: source.sourceKey, contentKey: item.contentKey } })}
                  >
                    {source.sourceKey === "menu" ? <PlPageIcon id="menu" /> : source.sourceKey === "reservation" ? <PlPageIcon id="reservations" /> : <Link2 size={16} strokeWidth={1.5} className="shrink-0" />}
                    <span className="flex-1">
                      {item.displayNames?.[locale] ?? item.displayName}
                      <span className="ms-1.5 text-[12px] font-normal text-[var(--pl-text-2)]">
                        {tx(`pl.source.${source.sourceKey}`) === `pl.source.${source.sourceKey}` ? source.sourceKey : tx(`pl.source.${source.sourceKey}`)}
                      </span>
                    </span>
                    {existing && <span className="text-[12px] font-normal text-[var(--pl-text-2)]">{tx("pl.pages.used")}</span>}
                    {busy === id && <span className="text-[12px] font-normal">{tx("pl.common.saving")}</span>}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

/** The page's own social image (overrides the site default when shared). */
function PageSocialImage({
  sync,
  value,
  onChange,
}: {
  sync: PublicLinkSync;
  value: PageMediaReference | null;
  onChange: (value: PageMediaReference | null) => void;
}) {
  const tx = usePlText();
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [fileError, setFileError] = useState<string | undefined>(undefined);

  /** Accepts a PNG / JPG / WebP up to the size cap; anything else is refused
   *  with a message and the current image stays. */
  function pick(file: File | undefined) {
    if (!file) return;
    if (!SOCIAL_IMAGE_TYPES.includes(file.type)) {
      setFileError(tx("pl.v.fileType", { types: tx("pl.pages.socialImageType") }));
      return;
    }
    if (file.size > SOCIAL_IMAGE_MAX_MB * 1024 * 1024) {
      setFileError(tx("pl.v.fileSize", { max: SOCIAL_IMAGE_MAX_MB }));
      return;
    }
    setFileError(undefined);
    readLogoFile(file, upload);
  }

  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setUrl(null);
      return;
    }
    sync.siteMediaUrl(value.assetId).then((u) => !cancelled && setUrl(u), () => undefined);
    return () => {
      cancelled = true;
    };
  }, [value, sync]);

  function upload(dataUrl: string) {
    setUploading(true);
    setFailed(false);
    sync
      .uploadSiteImage(dataUrl, "SocialImage")
      .then((up) => {
        setUrl(up.url);
        onChange({ assetId: up.assetId, kind: up.kind === "video" ? "Video" : "Image" });
      })
      .catch(() => setFailed(true)) // the previous image stays
      .finally(() => setUploading(false));
  }

  return (
    <div className="flex flex-col gap-3">
      <span className={plText.h6}>{tx("pl.pages.socialImage")}</span>
      <div className="flex flex-wrap items-center gap-3">
        {url ? (
          <img src={url} alt="" className="h-14 w-24 rounded-[8px] border border-[var(--pl-g300)] object-cover" />
        ) : (
          <span className="flex h-14 w-24 items-center justify-center rounded-[8px] border border-dashed border-[var(--pl-g300)] bg-[var(--pl-g50)] text-[var(--pl-text-3)]">
            <Upload size={16} />
          </span>
        )}
        <input
          ref={fileRef}
          type="file"
          accept={SOCIAL_IMAGE_TYPES.join(",")}
          aria-label={tx("pl.pages.socialImage")}
          className="sr-only"
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = ""; // the same file can be picked again after an error
          }}
        />
        <PlButton variant="plain" size="xs" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? tx("pl.common.saving") : tx("pl.field.upload")}
        </PlButton>
        <MediaLibraryButton
          sync={sync}
          purposes={["SocialImage"]}
          kind="image"
          onPick={(picked) => {
            setFailed(false);
            setFileError(undefined);
            setUrl(picked.url);
            onChange({ assetId: picked.assetId, kind: picked.kind === "video" ? "Video" : "Image" });
          }}
        />
        {value && (
          <button type="button" aria-label={tx("pl.common.remove")} className={clsx(ICON_BUTTON, "hover:text-[var(--pl-error)]")} onClick={() => onChange(null)}>
            <X size={14} />
          </button>
        )}
      </div>
      <p className={plText.hint}>{tx("pl.pages.socialImageHint")}</p>
      <PlFieldError>{fileError ?? (failed ? tx("pl.field.uploadFailed") : undefined)}</PlFieldError>
    </div>
  );
}

function PageSettingsModal({ page, onClose, sync }: { page: PageDraftResponse; onClose: () => void; sync: PublicLinkSync }) {
  const tx = usePlText();
  const { act, busy } = useBusy();
  const lang = sync.editLanguage;
  const [title, setTitle] = useState(page.title[lang] ?? Object.values(page.title)[0] ?? "");
  const [path, setPath] = useState(page.path.replace(/^\//, ""));
  const [seoTitle, setSeoTitle] = useState(page.seo?.title?.[lang] ?? "");
  const [seoDescription, setSeoDescription] = useState(page.seo?.description?.[lang] ?? "");
  const [noIndex, setNoIndex] = useState(page.seo?.hideFromSearchEngines ?? false);
  const [hideFooter, setHideFooter] = useState(page.layout?.hideFooter ?? false);
  const [dropPaths, setDropPaths] = useState<string[]>([]);
  const [socialImage, setSocialImage] = useState<PageMediaReference | null>(page.seo?.socialImage ?? null);
  const { check } = useValidation();
  const { touched, touch, touchAll } = useTouched();

  const errors = {
    title: check(title, [rules.required(), rules.maxLength(TITLE_MAX)]),
    path: page.isHome ? undefined : check(path, [rules.required(), rules.slug(), rules.maxLength(PATH_MAX)]),
    seoTitle: check(seoTitle, [rules.maxLength(SEO_TITLE_MAX)]),
    seoDescription: check(seoDescription, [rules.maxLength(SEO_DESCRIPTION_MAX)]),
  };
  const invalid = Object.values(errors).some(Boolean);
  const shown = (name: keyof typeof errors) => (touched(name) ? errors[name] : undefined);

  function save() {
    if (invalid) {
      touchAll();
      return;
    }
    const base = pageInput(page);
    void act("save", async () => {
      await sync.updatePage(page.pageId, {
        ...base,
        title: withText(page.title, lang, title),
        path: page.isHome ? "/" : `/${path.replace(/^\/+/, "")}`,
        seo: {
          ...base.seo!,
          title: withText(page.seo?.title, lang, seoTitle),
          description: withText(page.seo?.description, lang, seoDescription),
          socialImage,
          hideFromSearchEngines: noIndex,
        },
        layout: { header: base.layout?.header ?? null, hideFooter },
        removePreviousPaths: dropPaths.length ? dropPaths : null,
      });
      onClose();
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={tx("pl.pages.settings")}
      footer={
        <div className="flex justify-end gap-2">
          <PlButton variant="plain" size="md" onClick={onClose}>
            {tx("pl.common.cancel")}
          </PlButton>
          <PlButton size="md" onClick={save} disabled={busy !== null}>
            {busy ? tx("pl.common.saving") : tx("pl.common.save")}
          </PlButton>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <PlField label={tx("pl.pages.title")} required error={shown("title")}>
          <PlInput
            aria-label={tx("pl.pages.title")}
            aria-required
            value={title}
            maxLength={TITLE_MAX}
            invalid={Boolean(shown("title"))}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => touch("title")}
          />
        </PlField>
        {!page.isHome && (
          <PlField label={tx("pl.pages.address")} required hint={tx("pl.pages.pathHint")} error={shown("path")}>
            <PlInput
              aria-label={tx("pl.pages.address")}
              aria-required
              dir="ltr"
              value={path}
              maxLength={PATH_MAX}
              invalid={Boolean(shown("path"))}
              onChange={(e) => setPath(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"))}
              onBlur={() => touch("path")}
            />
          </PlField>
        )}
        {page.previousPaths.length > 0 && (
          <div className="flex flex-col gap-3">
            <span className={plText.h6}>{tx("pl.pages.previousPaths")}</span>
            {page.previousPaths.map((prev) => {
              const dropped = dropPaths.includes(prev.path);
              return (
                <span key={prev.path} className="flex items-center justify-between gap-2 text-[14px] leading-[14px] text-[var(--pl-text)]" dir="ltr">
                  <span className={clsx("min-w-0 truncate", dropped && "text-[var(--pl-text-2)] line-through")}>{prev.path}</span>
                  <PlButton
                    variant={dropped ? "plain" : "dangerSoft"}
                    size="xs"
                    onClick={() => setDropPaths((d) => (dropped ? d.filter((p) => p !== prev.path) : [...d, prev.path]))}
                  >
                    {dropped ? tx("pl.common.cancel") : tx("pl.common.remove")}
                  </PlButton>
                </span>
              );
            })}
          </div>
        )}
        <PlField label={tx("pl.pages.seoTitle")} error={shown("seoTitle")}>
          <PlInput
            aria-label={tx("pl.pages.seoTitle")}
            value={seoTitle}
            invalid={Boolean(shown("seoTitle"))}
            onChange={(e) => setSeoTitle(e.target.value)}
            onBlur={() => touch("seoTitle")}
          />
        </PlField>
        <PlField label={tx("pl.pages.seoDescription")} error={shown("seoDescription")}>
          <PlTextarea
            aria-label={tx("pl.pages.seoDescription")}
            rows={3}
            value={seoDescription}
            invalid={Boolean(shown("seoDescription"))}
            onChange={(e) => setSeoDescription(e.target.value)}
            onBlur={() => touch("seoDescription")}
          />
        </PlField>
        <PageSocialImage sync={sync} value={socialImage} onChange={setSocialImage} />
        <Checkbox checked={noIndex} onChange={(e) => setNoIndex(e.target.checked)} label={tx("pl.pages.noIndex")} />
        <Checkbox checked={hideFooter} onChange={(e) => setHideFooter(e.target.checked)} label={tx("pl.pages.hideFooter")} />
      </div>
    </Modal>
  );
}
