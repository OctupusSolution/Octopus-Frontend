// Step 3 while connected: the site's real pages (GET /public-link pages). Each
// row can be shown/hidden (PUT /draft/pages/{id}), put in or out of the header
// menu (PUT /draft/navigation), opened in Customize, edited (title, address,
// search settings, old addresses) or deleted (DELETE /draft/pages/{id}); rows
// reorder with PUT /draft/pages/order (Home stays first). "Add page" creates one
// from a catalogue template or from another module's content (POST /draft/pages).
import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { BookOpen, CalendarClock, FileText, Home, Info, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Checkbox, Input, Modal, Textarea } from "@ui/primitives";
import type { PageDraftResponse, PageSummaryResponse } from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import { withText, type PublicLinkSync, type SiteAction } from "@/entities/site-draft";
import { usePlText } from "../../_shared/texts";
import { ReorderList } from "../../ui/reorder-list";
import { Switch } from "../../ui/switch";
import { CARD, isInMenu, orderedPages, pageInput, pageTitle, SMALL_BUTTON, toggleMenuItems, useBusy } from "./common";

const HEADER_CELL = "py-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]";

function pageIcon(page: PageSummaryResponse) {
  if (page.isHome) return Home;
  const source = page.source?.sourceKey;
  if (source === "menu") return BookOpen;
  if (source === "reservation") return CalendarClock;
  return FileText;
}

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
    const Icon = pageIcon(page);
    const hidden = page.visibility === "hidden";
    return (
      <>
        <td className="w-8 py-2.5 ps-1">{grip}</td>
        <td className="py-2.5">
          <span className="flex min-w-0 items-center gap-2 text-[12.5px] text-[var(--octo-text-primary)]">
            <Icon size={14} className="shrink-0 text-[var(--octo-text-faint)]" />
            <span className="truncate">{titleOf(page)}</span>
            {hidden && <Badge tone="neutral">{tx("pl.pages.hidden")}</Badge>}
          </span>
          <span className="block truncate ps-[22px] text-[11px] text-[var(--octo-text-muted)]" dir="ltr">
            {page.path}
          </span>
        </td>
        <td className="py-2.5 text-center">
          {page.isHome ? (
            <span aria-hidden className="text-[var(--octo-text-faint)]">—</span>
          ) : (
            <Switch checked={!hidden} onChange={() => busy === null && toggleVisible(page)} label={`${titleOf(page)} — ${tx("pl.pages.visible")}`} />
          )}
        </td>
        <td className="py-2.5 text-center">
          <Switch checked={isInMenu(server, page)} onChange={() => busy === null && toggleMenu(page)} label={`${titleOf(page)} — ${tx("pl.pages.inNav")}`} />
        </td>
        <td className="py-2.5 text-end">
          <span className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => customize(page)}
              className="rounded px-1 text-[12px] font-medium text-[#0D6EFD] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40"
            >
              {tx("publicLink.pages.customize")}
            </button>
            <button
              type="button"
              aria-label={`${titleOf(page)} — ${tx("pl.pages.settings")}`}
              onClick={() => void draftOf(page.pageId).then((d) => d && setEditing(d), () => undefined)}
              className="rounded p-1 text-[var(--octo-text-faint)] hover:text-[var(--octo-text-secondary)]"
            >
              <Pencil size={13} />
            </button>
            {!page.isHome && (
              <button
                type="button"
                aria-label={`${titleOf(page)} — ${tx("pl.common.delete")}`}
                onClick={() => setDeleting(page)}
                className="rounded p-1 text-[var(--octo-text-faint)] hover:text-[#EF4444]"
              >
                <Trash2 size={13} />
              </button>
            )}
          </span>
        </td>
      </>
    );
  }

  return (
    <div className={clsx(CARD, "xl:col-span-2 min-[1400px]:col-span-1")}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11.5px] text-[var(--octo-text-muted)]">{tx("pl.pages.limit", { used: pages.length, max: limits.maxPages })}</span>
        <Button
          size="sm"
          variant="secondary"
          icon={<Plus size={13} />}
          disabled={pages.length >= limits.maxPages}
          onClick={() => setAdding(true)}
          className="border-[#0D6EFD] text-[#0D6EFD] hover:bg-[#0D6EFD]/5"
        >
          {tx("pl.pages.add")}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px] table-fixed border-collapse text-start">
          <colgroup>
            <col className="w-8" />
            <col />
            <col className="w-[70px]" />
            <col className="w-[70px]" />
            <col className="w-[130px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-[var(--octo-border-card)]">
              <th scope="col" className="w-8 py-2">
                <span className="sr-only">{tx("publicLink.reorder.hint")}</span>
              </th>
              <th scope="col" className={clsx(HEADER_CELL, "text-start")}>{tx("pl.pages.title")}</th>
              <th scope="col" className={clsx(HEADER_CELL, "text-center")}>{tx("pl.pages.visible")}</th>
              <th scope="col" className={clsx(HEADER_CELL, "text-center")}>{tx("pl.pages.inNav")}</th>
              <th scope="col" className={clsx(HEADER_CELL, "text-end")}>{tx("pl.pages.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {home.map((page) => (
              <tr key={page.pageId} className="border-b border-[var(--octo-row-border)]">
                {row(page, <span className="block w-4" />)}
              </tr>
            ))}
          </tbody>
          <ReorderList
            as="table"
            items={others}
            getId={(page) => page.pageId}
            getLabel={titleOf}
            onReorder={(next) => void act("order", () => sync.reorderPages(next.map((p) => p.pageId)))}
            renderRow={(page, _index, grip) => row(page, grip)}
          />
        </table>
      </div>
      <p className="flex items-center gap-1.5 rounded-[10px] bg-[#0D6EFD]/5 px-3 py-2.5 text-[11.5px] text-[#0D6EFD]">
        <Info size={13} className="shrink-0" />
        {tx("publicLink.pages.tip")}
      </p>

      <AddPageModal open={adding} onClose={() => setAdding(false)} sync={sync} />
      {editing && <PageSettingsModal page={editing} onClose={() => setEditing(null)} sync={sync} />}
      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={tx("pl.common.delete")}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              {tx("pl.common.cancel")}
            </Button>
            <Button
              variant="danger"
              disabled={busy !== null}
              onClick={() => {
                const target = deleting;
                setDeleting(null);
                if (target) void act(`del:${target.pageId}`, () => sync.deletePage(target.pageId));
              }}
            >
              {tx("pl.common.delete")}
            </Button>
          </div>
        }
      >
        <p className="text-[13px] text-[var(--octo-text-primary)]">{tx("pl.pages.deleteConfirm", { name: deleting ? titleOf(deleting) : "" })}</p>
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

  const option = "flex w-full items-center gap-2 rounded-[9px] border border-[var(--octo-border-input)] px-3 py-2 text-start text-[12.5px] text-[var(--octo-text-primary)] transition-colors hover:border-[#0D6EFD] hover:text-[#0D6EFD] disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <Modal open={open} onClose={onClose} title={tx("pl.pages.addTitle")}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{tx("pl.pages.templates")}</p>
          {templates.map((template) => (
            <button key={template.key} type="button" disabled={busy !== null} className={option} onClick={() => create(template.key, { templateKey: template.key })}>
              <FileText size={14} className="shrink-0" />
              <span className="flex-1">{tx(`pl.template.${template.key}`) === `pl.template.${template.key}` ? template.defaultTitle[locale] ?? template.key : tx(`pl.template.${template.key}`)}</span>
              {busy === template.key && <span className="text-[11px]">{tx("pl.common.saving")}</span>}
            </button>
          ))}
        </div>
        {sources.some((s) => s.items.length > 0) && (
          <div className="flex flex-col gap-1.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{tx("pl.pages.modules")}</p>
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
                    {source.sourceKey === "menu" ? <BookOpen size={14} className="shrink-0" /> : source.sourceKey === "reservation" ? <CalendarClock size={14} className="shrink-0" /> : <Link2 size={14} className="shrink-0" />}
                    <span className="flex-1">
                      {item.displayNames?.[locale] ?? item.displayName}
                      <span className="ms-1.5 text-[11px] text-[var(--octo-text-muted)]">
                        {tx(`pl.source.${source.sourceKey}`) === `pl.source.${source.sourceKey}` ? source.sourceKey : tx(`pl.source.${source.sourceKey}`)}
                      </span>
                    </span>
                    {existing && <span className="text-[11px] text-[var(--octo-text-muted)]">{tx("pl.pages.used")}</span>}
                    {busy === id && <span className="text-[11px]">{tx("pl.common.saving")}</span>}
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

  function save() {
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
          <Button variant="secondary" onClick={onClose}>
            {tx("pl.common.cancel")}
          </Button>
          <Button onClick={save} disabled={busy !== null || !title.trim()}>
            {busy ? tx("pl.common.saving") : tx("pl.common.save")}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <Input label={tx("pl.pages.title")} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
        {!page.isHome && (
          <div className="flex flex-col gap-1">
            <Input
              label={tx("pl.pages.address")}
              dir="ltr"
              value={path}
              maxLength={60}
              onChange={(e) => setPath(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"))}
            />
            <span className="text-[11px] text-[var(--octo-text-muted)]">{tx("pl.pages.pathHint")}</span>
          </div>
        )}
        {page.previousPaths.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{tx("pl.pages.previousPaths")}</span>
            {page.previousPaths.map((prev) => {
              const dropped = dropPaths.includes(prev.path);
              return (
                <span key={prev.path} className="flex items-center justify-between gap-2 text-[12px]" dir="ltr">
                  <span className={clsx(dropped && "line-through text-[var(--octo-text-faint)]")}>{prev.path}</span>
                  <button
                    type="button"
                    className={SMALL_BUTTON}
                    onClick={() => setDropPaths((d) => (dropped ? d.filter((p) => p !== prev.path) : [...d, prev.path]))}
                  >
                    {dropped ? tx("pl.common.cancel") : tx("pl.common.remove")}
                  </button>
                </span>
              );
            })}
          </div>
        )}
        <Input label={tx("pl.pages.seoTitle")} value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
        <Textarea label={tx("pl.pages.seoDescription")} rows={2} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} />
        <Checkbox checked={noIndex} onChange={(e) => setNoIndex(e.target.checked)} label={tx("pl.pages.noIndex")} />
        <Checkbox checked={hideFooter} onChange={(e) => setHideFooter(e.target.checked)} label={tx("pl.pages.hideFooter")} />
      </div>
    </Modal>
  );
}
