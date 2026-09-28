// Step 4 while connected: the site's menu (GET/PUT /draft/navigation, replaced
// whole) and footer (GET/PUT /draft/footer). With no explicit menu items the
// storefront header lists every visible page in order; the first edit here
// materialises that list so the merchant edits what they see.
//
// Menu items may have one level of sub-items (a dropdown in the header, a
// nested list in the drawer): an item links somewhere or is a group whose only
// job is to hold sub-items. The item editor adds, edits, reorders and removes
// sub-items, and moves items between levels; it checks the backend's limits
// (_shared/nav-tree.ts) before saving and shows the server's refusal if any.
import { useEffect, useState } from "react";
import { CornerDownRight, CornerLeftUp, Eye, EyeOff, FolderOpen, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button, Checkbox, Input, Modal, Select } from "@ui/primitives";
import type { FooterGroupDto, LinkTargetDto, NavigationOptionsDto, NavItemDto, SocialLinkDto } from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import { pickText, withText, type PublicLinkServer, type PublicLinkSync } from "@/entities/site-draft";
import { demoteItem, MAX_NAV_LABEL, navigationInput, promoteChild, removeChild, validateNavigation } from "../../_shared/nav-tree";
import { usePlText } from "../../_shared/texts";
import { ReorderList } from "../../ui/reorder-list";
import { Switch } from "../../ui/switch";
import { CARD, CARD_NOTE, CARD_TITLE, orderedPages, pageTitle, SMALL_BUTTON, useBusy } from "./common";

const DEFAULT_OPTIONS: NavigationOptionsDto = { stickyHeader: false, showActivePageIndicator: false, showIcons: false, openLinksInSameTab: false };

function effectiveItems(server: PublicLinkServer): NavItemDto[] {
  const items = server.navigation?.items ?? [];
  if (items.length) return items;
  return orderedPages(server)
    .filter((p) => p.visibility !== "hidden")
    .map((p) => ({ target: { kind: "page", pageId: p.pageId }, showInHeader: true, showInDrawer: true, children: [] }));
}

function itemLabel(server: PublicLinkServer, item: NavItemDto, lang: string, fallback: string): string {
  const own = pickText(item.label, lang, fallback);
  if (own) return own;
  if (item.target?.kind === "page" || item.target?.kind === "anchor") {
    return pageTitle(server.overview.pages.find((p) => p.pageId === item.target?.pageId), lang, fallback);
  }
  return item.target?.url ?? "—";
}

const keyOf = (item: NavItemDto) => item.id ?? `${item.target?.kind}:${item.target?.pageId ?? item.target?.url ?? pickText(item.label, "en")}`;

export function NavigationDisplayCard({ sync }: { sync: PublicLinkSync }) {
  const tx = usePlText();
  const { t } = useI18n();
  const { act, busy } = useBusy();
  const server = sync.server!;
  const items = effectiveItems(server);
  const options = server.navigation?.options ?? DEFAULT_OPTIONS;

  const save = (nextItems: NavItemDto[], nextOptions: NavigationOptionsDto = options) =>
    void act("nav", () => sync.saveNavigation({ items: nextItems, options: nextOptions }));
  const allHeader = items.length > 0 && items.every((i) => i.showInHeader);
  const allDrawer = items.length > 0 && items.every((i) => i.showInDrawer);
  const option = (key: keyof NavigationOptionsDto, label: string, note: string) => (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">{label}</span>
        <span className="text-[11px] text-[var(--octo-text-muted)]">{note}</span>
      </div>
      <Switch checked={options[key]} onChange={() => busy === null && save(server.navigation?.items ?? [], { ...options, [key]: !options[key] })} label={label} />
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className={CARD}>
        <p className={CARD_TITLE}>{t("publicLink.navigation.display")}</p>
        <Checkbox
          checked={allHeader}
          disabled={busy !== null}
          onChange={(e) => save(items.map((i) => ({ ...i, showInHeader: e.target.checked })))}
          label={t("publicLink.navigation.showInHeader")}
        />
        <Checkbox
          checked={allDrawer}
          disabled={busy !== null}
          onChange={(e) => save(items.map((i) => ({ ...i, showInDrawer: e.target.checked })))}
          label={t("publicLink.navigation.showInDrawer")}
        />
      </div>
      <div className="flex flex-col gap-4 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <p className={CARD_TITLE}>{t("publicLink.navigation.globalOptions")}</p>
        {option("stickyHeader", t("publicLink.navigation.stickyHeader"), t("publicLink.navigation.stickyHeaderNote"))}
        {option("showActivePageIndicator", t("publicLink.navigation.activeIndicator"), t("publicLink.navigation.activeIndicatorNote"))}
        {option("showIcons", t("publicLink.navigation.showIcons"), t("publicLink.navigation.showIconsNote"))}
        {option("openLinksInSameTab", t("publicLink.navigation.sameTab"), t("publicLink.navigation.sameTabNote"))}
        {busy && <span className="text-[11px] text-[var(--octo-text-muted)]">{tx("pl.common.saving")}</span>}
      </div>
    </div>
  );
}

/** How a navigation target reads in the builder: the page's title, `#anchor` on a page, or the address. */
function targetText(server: PublicLinkServer, target: LinkTargetDto | null | undefined, lang: string, fallback: string, groupText: string): string {
  if (!target) return groupText;
  const kind = String(target.kind).toLowerCase();
  const page = server.overview.pages.find((p) => p.pageId === target.pageId);
  if (kind === "page") return pageTitle(page, lang, fallback);
  if (kind === "anchor") {
    const section = server.pages[target.pageId ?? ""]?.sections.find((s) => s.sectionId === target.sectionId);
    return `${pageTitle(page, lang, fallback)} #${section?.anchor ?? "…"}`;
  }
  return target.url ?? "—";
}

function navLimits(server: PublicLinkServer) {
  return {
    maxTopLevel: server.catalogues?.limits.maxNavTopLevelItems ?? server.overview.limits.maxNavTopLevelItems,
    maxChildren: server.catalogues?.limits.maxNavChildren ?? 10,
    maxLabel: MAX_NAV_LABEL,
  };
}

/** A problem's human text: `pl.navp.<last segment of the code>`. */
const problemKey = (code: string) => `pl.navp.${code.split(".").pop()}`;

type TargetKind = "group" | "page" | "anchor" | "external";

/** The link part of an item: none (a group), a page, a section of a page, or an https address. */
function TargetEditor({
  sync,
  target,
  onChange,
  allowGroup,
}: {
  sync: PublicLinkSync;
  target: LinkTargetDto | null | undefined;
  onChange: (target: LinkTargetDto | null) => void;
  allowGroup: boolean;
}) {
  const tx = usePlText();
  const { locale } = useI18n();
  const server = sync.server!;
  const pages = orderedPages(server);
  const kind: TargetKind = !target ? "group" : (String(target.kind).toLowerCase() as TargetKind);
  const anchorPage = kind === "anchor" ? server.pages[target?.pageId ?? ""] : undefined;

  useEffect(() => {
    if (kind === "anchor" && target?.pageId && !server.pages[target.pageId]) void sync.loadPage(target.pageId).catch(() => undefined);
  }, [kind, target?.pageId, server.pages, sync]);

  function changeKind(next: TargetKind) {
    const first = pages[0]?.pageId ?? null;
    if (next === "group") onChange(null);
    else if (next === "page") onChange({ kind: "page", pageId: target?.pageId ?? first });
    else if (next === "anchor") onChange({ kind: "anchor", pageId: target?.pageId ?? first, sectionId: null });
    else onChange({ kind: "external", url: "https://", openInNewTab: true });
  }

  return (
    <div className="flex flex-col gap-2">
      <Select aria-label={tx("pl.field.linkKind")} value={kind} onChange={(e) => changeKind(e.target.value as TargetKind)}>
        {allowGroup && <option value="group">{tx("pl.nav.group")}</option>}
        <option value="page">{tx("pl.field.link.page")}</option>
        <option value="anchor">{tx("pl.field.link.anchor")}</option>
        <option value="external">{tx("pl.field.link.external")}</option>
      </Select>
      {(kind === "page" || kind === "anchor") && (
        <Select
          aria-label={tx("pl.field.link.page")}
          value={target?.pageId ?? ""}
          onChange={(e) => onChange(kind === "page" ? { kind: "page", pageId: e.target.value } : { kind: "anchor", pageId: e.target.value, sectionId: null })}
        >
          {pages.map((p) => (
            <option key={p.pageId} value={p.pageId}>
              {pageTitle(p, locale, sync.editLanguage)}
            </option>
          ))}
        </Select>
      )}
      {kind === "anchor" && (
        <Select
          aria-label={tx("pl.field.link.anchor")}
          value={target?.sectionId ?? ""}
          onChange={(e) => onChange({ kind: "anchor", pageId: target?.pageId ?? null, sectionId: e.target.value || null })}
        >
          <option value="">—</option>
          {(anchorPage?.sections ?? [])
            .filter((s) => s.anchor)
            .map((s) => (
              <option key={s.sectionId} value={s.sectionId}>
                #{s.anchor}
              </option>
            ))}
        </Select>
      )}
      {kind === "external" && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Input dir="ltr" aria-label="URL" placeholder="https://…" value={target?.url ?? ""} onChange={(e) => onChange({ ...target!, url: e.target.value.trim() })} />
          </div>
          <label className="flex items-center gap-2 text-[12px] text-[var(--octo-text-secondary)]">
            <Switch checked={target?.openInNewTab !== false} onChange={() => onChange({ ...target!, openInNewTab: target?.openInNewTab === false })} label={tx("pl.field.newTab")} />
            {tx("pl.field.newTab")}
          </label>
        </div>
      )}
    </div>
  );
}

interface ChildRow {
  key: string;
  item: NavItemDto;
}

let rowSeq = 0;
const rowKey = (item: NavItemDto) => item.id ?? `new-${++rowSeq}`;

/**
 * One menu item with its sub-items, edited as a local copy: label (edit language), link or group,
 * header/drawer, and up to `maxNavChildren` sub-items (add, edit, reorder, remove, move to the top
 * level). A childless top-level item can instead be put under another item. Saved whole.
 */
function NavItemModal({
  sync,
  items,
  index,
  initial,
  onClose,
}: {
  sync: PublicLinkSync;
  /** The whole current menu (the write replaces it). */
  items: NavItemDto[];
  /** The item's position, or null for a new one. */
  index: number | null;
  initial: NavItemDto;
  onClose: () => void;
}) {
  const tx = usePlText();
  const { locale } = useI18n();
  const { act, busy } = useBusy();
  const server = sync.server!;
  const lang = sync.editLanguage;
  const limits = navLimits(server);
  const options = server.navigation?.options ?? DEFAULT_OPTIONS;
  const [item, setItem] = useState<NavItemDto>(initial);
  const [children, setChildren] = useState<ChildRow[]>(() => (initial.children ?? []).map((c) => ({ key: rowKey(c), item: c })));
  const [promoted, setPromoted] = useState<NavItemDto[]>([]);
  const [parent, setParent] = useState<string>("");
  const [pickPage, setPickPage] = useState("");
  const [failed, setFailed] = useState(false);
  const pages = orderedPages(server);
  const groupText = tx("pl.nav.group");

  // The menu this edit would save.
  const edited: NavItemDto = { ...item, children: children.map((c) => c.item) };
  let next: NavItemDto[] = index === null ? [...items, edited] : items.map((it, i) => (i === index ? edited : it));
  const at = index === null ? next.length - 1 : index;
  if (promoted.length) next.splice(at + 1, 0, ...promoted.map((p) => ({ ...p, children: [] })));
  const chosenParent = parent === "" ? null : Number(parent);
  // Promoted sub-items were inserted right after this item, so later positions moved down.
  const parentIndex = chosenParent !== null && chosenParent > at ? chosenParent + promoted.length : chosenParent;
  if (parentIndex !== null && children.length === 0) next = demoteItem(next, at, parentIndex);
  const problems = validateNavigation(next, limits);

  const setChild = (i: number, child: NavItemDto) => setChildren((cs) => cs.map((c, n) => (n === i ? { ...c, item: child } : c)));
  const addChildRow = (child: NavItemDto) => setChildren((cs) => [...cs, { key: rowKey(child), item: { ...child, children: [] } }]);

  function save() {
    setFailed(false);
    void act("save", () => sync.saveNavigation(navigationInput(next, options))).then((ok) => (ok ? onClose() : setFailed(true)));
  }

  const others = items.map((it, i) => ({ it, i })).filter(({ i }) => i !== index);

  return (
    <Modal
      open
      onClose={onClose}
      title={index === null ? tx("pl.nav.addItemTitle") : tx("pl.nav.editItem")}
      className="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {tx("pl.common.cancel")}
          </Button>
          <Button onClick={save} disabled={busy !== null || problems.length > 0}>
            {busy ? tx("pl.common.saving") : tx("pl.common.save")}
          </Button>
        </>
      }
    >
      <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto pe-1">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label={tx("pl.nav.linkLabel")}
            maxLength={limits.maxLabel}
            placeholder={item.target ? targetText(server, item.target, locale, lang, groupText) : ""}
            value={item.label?.[lang] ?? ""}
            onChange={(e) => setItem((it) => ({ ...it, label: withText(it.label, lang, e.target.value) }))}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">{tx("pl.field.linkKind")}</span>
            <TargetEditor sync={sync} target={item.target} allowGroup onChange={(target) => setItem((it) => ({ ...it, target }))} />
          </div>
        </div>
        <div className="flex flex-wrap gap-5">
          <label className="flex items-center gap-2 text-[12px] text-[var(--octo-text-secondary)]">
            <Switch checked={item.showInHeader} onChange={() => setItem((it) => ({ ...it, showInHeader: !it.showInHeader }))} label={tx("pl.nav.header")} />
            {tx("pl.nav.header")}
          </label>
          <label className="flex items-center gap-2 text-[12px] text-[var(--octo-text-secondary)]">
            <Switch checked={item.showInDrawer} onChange={() => setItem((it) => ({ ...it, showInDrawer: !it.showInDrawer }))} label={tx("pl.nav.drawer")} />
            {tx("pl.nav.drawer")}
          </label>
        </div>

        <div className="flex flex-col gap-2 border-t border-[var(--octo-divider)] pt-3">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{tx("pl.nav.children")}</span>
            <span className="text-[11px] text-[var(--octo-text-muted)]">{tx("pl.nav.childrenCount", { n: children.length, max: limits.maxChildren })}</span>
          </div>
          {children.length === 0 && <p className="text-[11.5px] text-[var(--octo-text-muted)]">{item.target ? tx("pl.nav.noChildren") : tx("pl.nav.groupNeedsChildren")}</p>}
          <ReorderList
            items={children}
            getId={(c) => c.key}
            getLabel={(c) => targetText(server, c.item.target, locale, lang, groupText)}
            onReorder={setChildren}
            renderRow={(row, i, grip) => (
              <div className="flex w-full flex-col gap-2 rounded-[10px] border border-[var(--octo-border-input)] px-2.5 py-2">
                <div className="flex items-center gap-2">
                  {grip}
                  <div className="min-w-0 flex-1">
                    <Input
                      aria-label={tx("pl.nav.linkLabel")}
                      maxLength={limits.maxLabel}
                      placeholder={targetText(server, row.item.target, locale, lang, groupText)}
                      value={row.item.label?.[lang] ?? ""}
                      onChange={(e) => setChild(i, { ...row.item, label: withText(row.item.label, lang, e.target.value) })}
                    />
                  </div>
                  <button
                    type="button"
                    className={SMALL_BUTTON}
                    title={tx("pl.nav.promote")}
                    onClick={() => {
                      setPromoted((p) => [...p, row.item]);
                      setChildren((cs) => cs.filter((_c, n) => n !== i));
                    }}
                  >
                    <CornerLeftUp size={13} />
                    <span className="sr-only">{tx("pl.nav.promote")}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={tx("pl.common.remove")}
                    onClick={() => setChildren((cs) => cs.filter((_c, n) => n !== i))}
                    className="rounded p-1 text-[var(--octo-text-faint)] hover:text-[#EF4444]"
                  >
                    <X size={14} />
                  </button>
                </div>
                <TargetEditor sync={sync} target={row.item.target} allowGroup={false} onChange={(target) => setChild(i, { ...row.item, target })} />
              </div>
            )}
          />
          {children.length < limits.maxChildren && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[180px] flex-1">
                <Select aria-label={tx("pl.nav.addChildPage")} value={pickPage} onChange={(e) => setPickPage(e.target.value)}>
                  <option value="">{tx("pl.nav.addChildPage")}</option>
                  {pages.map((p) => (
                    <option key={p.pageId} value={p.pageId}>
                      {pageTitle(p, locale, lang)}
                    </option>
                  ))}
                </Select>
              </div>
              <button
                type="button"
                className={SMALL_BUTTON}
                disabled={!pickPage}
                onClick={() => {
                  addChildRow({ target: { kind: "page", pageId: pickPage }, showInHeader: true, showInDrawer: true, children: [] });
                  setPickPage("");
                }}
              >
                <Plus size={13} />
                {tx("pl.common.add")}
              </button>
              <button
                type="button"
                className={SMALL_BUTTON}
                onClick={() => addChildRow({ label: {}, target: { kind: "external", url: "https://", openInNewTab: !options.openLinksInSameTab }, showInHeader: true, showInDrawer: true, children: [] })}
              >
                <Plus size={13} />
                {tx("pl.nav.addLink")}
              </button>
            </div>
          )}
        </div>

        {index !== null && children.length === 0 && others.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-[var(--octo-divider)] pt-3">
            <span className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">{tx("pl.nav.putUnder")}</span>
            <Select aria-label={tx("pl.nav.putUnder")} value={parent} onChange={(e) => setParent(e.target.value)}>
              <option value="">{tx("pl.nav.topLevel")}</option>
              {others
                .filter(({ it }) => (it.children ?? []).length < limits.maxChildren)
                .map(({ it, i }) => (
                  <option key={i} value={String(i)}>
                    {itemLabel(server, it, locale, lang)}
                  </option>
                ))}
            </Select>
          </div>
        )}

        {problems.length > 0 && (
          <ul role="alert" className="flex list-disc flex-col gap-0.5 ps-5 text-[11.5px] text-[#DC2626]">
            {Array.from(new Set(problems.map((p) => problemKey(p.code)))).map((key) => (
              <li key={key}>{tx(key, { max: key.endsWith("too-many-children") ? limits.maxChildren : key.endsWith("too-many-items") ? limits.maxTopLevel : limits.maxLabel })}</li>
            ))}
          </ul>
        )}
        {failed && sync.error && (
          <p role="alert" className="text-[11.5px] text-[#DC2626]">
            {sync.error}
          </p>
        )}
      </div>
    </Modal>
  );
}

export function NavigationItemsCard({ sync }: { sync: PublicLinkSync }) {
  const tx = usePlText();
  const { t, locale } = useI18n();
  const { act, busy } = useBusy();
  const [pickPage, setPickPage] = useState("");
  const [editing, setEditing] = useState<{ index: number | null; item: NavItemDto } | null>(null);
  const server = sync.server!;
  const lang = sync.editLanguage;
  const items = effectiveItems(server);
  const explicit = (server.navigation?.items ?? []).length > 0;
  const options = server.navigation?.options ?? DEFAULT_OPTIONS;
  const inMenu = new Set(items.flatMap((i) => [i, ...(i.children ?? [])]).filter((i) => i.target?.kind === "page").map((i) => i.target?.pageId));
  const addable = orderedPages(server).filter((p) => !inMenu.has(p.pageId));
  const limits = navLimits(server);
  const max = limits.maxTopLevel;
  const groupText = tx("pl.nav.group");

  const save = (next: NavItemDto[]) => act("nav", () => sync.saveNavigation(navigationInput(next, options)));

  return (
    <div className={CARD}>
      <p className={CARD_TITLE}>{t("publicLink.navigation.pageOrder")}</p>
      {!explicit && <p className={CARD_NOTE}>{tx("pl.nav.empty")}</p>}
      <ReorderList
        items={items}
        getId={keyOf}
        getLabel={(item) => itemLabel(server, item, locale, lang)}
        onReorder={(next) => void save(next)}
        renderRow={(item, index, grip) => {
          const hidden = !item.showInHeader && !item.showInDrawer;
          const label = itemLabel(server, item, locale, lang);
          const kids = item.children ?? [];
          return (
            <>
              {grip}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex min-w-0 items-center gap-1.5 truncate text-[12.5px] text-[var(--octo-text-primary)]">
                  {!item.target && <FolderOpen size={13} className="shrink-0 text-[var(--octo-text-faint)]" />}
                  <span className="truncate">{label}</span>
                </span>
                {kids.map((child, ci) => (
                  <span key={child.id ?? ci} className="flex min-w-0 items-center gap-1 ps-3 text-[11.5px] text-[var(--octo-text-muted)]">
                    <CornerDownRight size={11} className="shrink-0 rtl:-scale-x-100" />
                    <span className="truncate">{pickText(child.label, locale, lang) || targetText(server, child.target, locale, lang, groupText)}</span>
                    <button
                      type="button"
                      title={tx("pl.nav.promote")}
                      aria-label={`${tx("pl.nav.promote")} — ${pickText(child.label, locale, lang) || targetText(server, child.target, locale, lang, groupText)}`}
                      disabled={busy !== null || items.length >= max}
                      onClick={() => void save(promoteChild(items, index, ci))}
                      className="shrink-0 rounded p-0.5 text-[var(--octo-text-faint)] hover:text-[var(--octo-text-secondary)] disabled:opacity-40"
                    >
                      <CornerLeftUp size={11} />
                    </button>
                    <button
                      type="button"
                      aria-label={`${tx("pl.common.remove")} — ${pickText(child.label, locale, lang) || targetText(server, child.target, locale, lang, groupText)}`}
                      disabled={busy !== null || (!item.target && kids.length === 1)}
                      onClick={() => void save(removeChild(items, index, ci))}
                      className="shrink-0 rounded p-0.5 text-[var(--octo-text-faint)] hover:text-[#EF4444] disabled:opacity-40"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
              <button
                type="button"
                aria-label={`${label} — ${tx("pl.nav.editItem")}`}
                disabled={busy !== null}
                onClick={() => setEditing({ index, item })}
                className="shrink-0 rounded p-1 text-[var(--octo-text-faint)] hover:text-[var(--octo-text-secondary)]"
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                aria-label={`${label} — ${t(hidden ? "publicLink.nav.showPage" : "publicLink.nav.hidePage")}`}
                aria-pressed={hidden}
                disabled={busy !== null}
                onClick={() => void save(items.map((it, i) => (i === index ? { ...it, showInHeader: hidden, showInDrawer: hidden } : it)))}
                className="shrink-0 rounded p-1 text-[var(--octo-text-faint)] hover:text-[var(--octo-text-secondary)]"
              >
                {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                type="button"
                aria-label={`${label} — ${tx("pl.common.remove")}`}
                disabled={busy !== null}
                onClick={() => void save(items.filter((_it, i) => i !== index))}
                className="shrink-0 rounded p-1 text-[var(--octo-text-faint)] hover:text-[#EF4444]"
              >
                <X size={14} />
              </button>
            </>
          );
        }}
      />
      {(server.navigation?.warnings ?? []).length > 0 && <p className="text-[11px] text-[#B45309]">{tx("pl.nav.warning")}</p>}

      {items.length < max && (
        <div className="flex flex-wrap items-end gap-2">
          {addable.length > 0 && (
            <>
              <div className="min-w-[180px] flex-1">
                <Select aria-label={tx("pl.nav.addPage")} value={pickPage} onChange={(e) => setPickPage(e.target.value)}>
                  <option value="">{tx("pl.nav.addPage")}</option>
                  {addable.map((p) => (
                    <option key={p.pageId} value={p.pageId}>
                      {pageTitle(p, locale, lang)}
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                size="sm"
                variant="secondary"
                icon={<Plus size={13} />}
                disabled={!pickPage || busy !== null}
                onClick={() =>
                  void save([...items, { target: { kind: "page", pageId: pickPage }, showInHeader: true, showInDrawer: true, children: [] }]).then((ok) => ok && setPickPage(""))
                }
              >
                {tx("pl.common.add")}
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="secondary"
            icon={<Plus size={13} />}
            disabled={busy !== null}
            onClick={() =>
              setEditing({
                index: null,
                item: { label: {}, target: { kind: "external", url: "https://", openInNewTab: !options.openLinksInSameTab }, showInHeader: true, showInDrawer: true, children: [] },
              })
            }
          >
            {tx("pl.nav.addLink")}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={<FolderOpen size={13} />}
            disabled={busy !== null}
            onClick={() => setEditing({ index: null, item: { label: {}, target: null, showInHeader: true, showInDrawer: true, children: [] } })}
          >
            {tx("pl.nav.addGroup")}
          </Button>
        </div>
      )}
      <p className="text-[11px] text-[var(--octo-text-muted)]">{t("publicLink.navigation.pageOrderHint")}</p>
      <p className="text-[11px] text-[var(--octo-text-muted)]">{tx("pl.nav.childrenHint", { max: limits.maxChildren })}</p>
      {editing && <NavItemModal sync={sync} items={items} index={editing.index} initial={editing.item} onClose={() => setEditing(null)} />}
    </div>
  );
}

/** The footer, edited as a local copy and saved whole. */
export function FooterCard({ sync }: { sync: PublicLinkSync }) {
  const tx = usePlText();
  const { locale } = useI18n();
  const { act, busy } = useBusy();
  const server = sync.server!;
  const lang = sync.editLanguage;
  const footer = server.footer;
  const [groups, setGroups] = useState<FooterGroupDto[]>(footer?.groups ?? []);
  const [social, setSocial] = useState<SocialLinkDto[]>(footer?.socialLinks ?? []);
  const [contact, setContact] = useState(footer?.contact ?? {});
  const [saved, setSaved] = useState(false);

  // A fresh server copy (another save, a starter, a page deletion) replaces the local copy.
  useEffect(() => {
    setGroups(footer?.groups ?? []);
    setSocial(footer?.socialLinks ?? []);
    setContact(footer?.contact ?? {});
  }, [footer]);

  const networks = server.catalogues?.socialNetworks ?? [];
  const limits = server.catalogues?.limits;
  const pages = orderedPages(server);

  function togglePage(groupIndex: number, pageId: string) {
    setGroups((gs) =>
      gs.map((g, i) => {
        if (i !== groupIndex) return g;
        const links = g.links ?? [];
        const has = links.some((l) => l.target.kind === "page" && l.target.pageId === pageId);
        return { ...g, links: has ? links.filter((l) => !(l.target.kind === "page" && l.target.pageId === pageId)) : [...links, { target: { kind: "page", pageId } }] };
      })
    );
  }

  function save() {
    setSaved(false);
    void act("footer", () =>
      sync.saveFooter({
        groups,
        socialLinks: social.filter((s) => s.network && s.url.trim()),
        contact,
      })
    ).then((ok) => setSaved(ok));
  }

  return (
    <div className={CARD}>
      <p className={CARD_TITLE}>{tx("pl.footer.title")}</p>
      <p className={CARD_NOTE}>{tx("pl.footer.note")}</p>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-3">
          {groups.map((group, gi) => (
            <div key={group.id ?? `g${gi}`} className="flex flex-col gap-2 rounded-[10px] border border-[var(--octo-border-input)] px-3 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    aria-label={tx("pl.footer.group")}
                    placeholder={tx("pl.footer.group")}
                    value={group.title?.[lang] ?? ""}
                    onChange={(e) => setGroups((gs) => gs.map((g, i) => (i === gi ? { ...g, title: withText(g.title, lang, e.target.value) } : g)))}
                  />
                </div>
                <button
                  type="button"
                  aria-label={tx("pl.common.remove")}
                  onClick={() => setGroups((gs) => gs.filter((_g, i) => i !== gi))}
                  className="rounded p-1 text-[var(--octo-text-faint)] hover:text-[#EF4444]"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              {pages.map((p) => (
                <Checkbox
                  key={p.pageId}
                  checked={(group.links ?? []).some((l) => l.target.kind === "page" && l.target.pageId === p.pageId)}
                  onChange={() => togglePage(gi, p.pageId)}
                  label={pageTitle(p, locale, lang)}
                />
              ))}
            </div>
          ))}
          {(!limits || groups.length < limits.maxFooterGroups) && (
            <button type="button" className={SMALL_BUTTON} onClick={() => setGroups((gs) => [...gs, { title: {}, links: [] }])}>
              <Plus size={13} />
              {tx("pl.footer.addGroup")}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{tx("pl.footer.social")}</span>
          {social.map((link, si) => (
            <div key={si} className="flex items-center gap-2">
              <div className="w-[120px] shrink-0">
                <Select
                  aria-label={tx("pl.footer.social")}
                  value={link.network}
                  onChange={(e) => setSocial((ls) => ls.map((l, i) => (i === si ? { ...l, network: e.target.value } : l)))}
                >
                  {networks.map((n) => (
                    <option key={n.key} value={n.key}>
                      {n.key.charAt(0).toUpperCase() + n.key.slice(1)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex-1">
                <Input
                  aria-label="URL"
                  dir="ltr"
                  placeholder="https://"
                  value={link.url}
                  onChange={(e) => setSocial((ls) => ls.map((l, i) => (i === si ? { ...l, url: e.target.value.trim() } : l)))}
                />
              </div>
              <button type="button" aria-label={tx("pl.common.remove")} onClick={() => setSocial((ls) => ls.filter((_l, i) => i !== si))} className="rounded p-1 text-[var(--octo-text-faint)] hover:text-[#EF4444]">
                <X size={13} />
              </button>
            </div>
          ))}
          {networks.length > 0 && (!limits || social.length < limits.maxSocialLinks) && (
            <button type="button" className={SMALL_BUTTON + " w-fit"} onClick={() => setSocial((ls) => [...ls, { network: networks[0].key, url: "" }])}>
              <Plus size={13} />
              {tx("pl.footer.addSocial")}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{tx("pl.footer.contact")}</span>
          {(["address", "hours", "phone"] as const).map((field) => (
            <Input
              key={field}
              label={tx(`pl.footer.${field}`)}
              value={contact[field]?.[lang] ?? ""}
              onChange={(e) => setContact((c) => ({ ...c, [field]: withText(c[field], lang, e.target.value) }))}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={save} disabled={busy !== null}>
          {busy ? tx("pl.common.saving") : tx("pl.common.save")}
        </Button>
        {saved && <span className="text-[11.5px] text-[#16a34a]">{tx("pl.footer.saved")}</span>}
        {(footer?.warnings ?? []).length > 0 && <span className="text-[11px] text-[#B45309]">{tx("pl.nav.warning")}</span>}
      </div>
    </div>
  );
}
