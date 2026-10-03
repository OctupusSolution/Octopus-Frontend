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
//
// The look is the Figma "Public Link-step 4" frame's, built from ui/kit; the
// pieces the sample (not connected) step draws the same way are exported from
// here so both paths stay one design.
import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";
import { CornerDownRight, CornerLeftUp, FolderOpen, Pencil, Plus, Trash2, X } from "lucide-react";
import { Modal } from "@ui/primitives";
import type { FooterGroupDto, LinkTargetDto, NavigationOptionsDto, NavItemDto, SocialLinkDto } from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import { pickText, withText, type PublicLinkServer, type PublicLinkSync } from "@/entities/site-draft";
import { demoteItem, MAX_NAV_LABEL, navigationInput, promoteChild, removeChild, validateNavigation } from "../../_shared/nav-tree";
import { usePlText } from "../../_shared/texts";
import { rules, useTouched, useValidation, type Rule } from "../../_shared/validation";
import { PlButton, PlField, PlFieldError, PlIcon, PlInfoBanner, PlInput, PlSelect, plPanel, plText } from "../../ui/kit";
import { ReorderHint, ReorderList } from "../../ui/reorder-list";
import { Switch } from "../../ui/switch";
import { orderedPages, pageTitle, useBusy } from "./common";

// ---- The step's look, shared with navigation-step.tsx ----------------------------------------------

/** The frame's side cards: 12px radius, 12/16 padding, 24px between title and body. */
export const NAV_CARD = clsx(plPanel, "flex flex-col gap-6 px-3 py-4");

/** The Page Order rows: a hairline above each row and under the last, 8px padding. */
export const NAV_ROWS = "[&>li]:border-t [&>li]:border-[var(--pl-g300)] [&>li]:p-2 [&>li:last-child]:border-b";

/** A 24px icon button on a row (eye, edit, remove). */
export const NAV_ICON_BUTTON =
  "grid h-6 w-6 shrink-0 place-items-center rounded-[4px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40 disabled:cursor-not-allowed disabled:opacity-40";

const MUTED_ICON = "text-[var(--pl-text-3)] hover:text-[var(--pl-text)]";
const DANGER_ICON = "text-[var(--pl-text-3)] hover:text-[var(--pl-error)]";
const NOTE = "text-[12px] font-normal leading-[1.4] text-[var(--pl-text-3)]";
const WARNING = "text-[12px] font-normal leading-[1.4] text-[#B45309]";

/** The frame's 24px checkbox: the filled blue tick box, with its label in the
 *  frame's blue semibold ("primary") or as a plain row label. */
export function NavCheckbox({
  checked,
  onChange,
  label,
  disabled,
  tone = "primary",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
  tone?: "primary" | "plain";
}) {
  return (
    <label className={clsx("flex w-fit max-w-full items-center gap-2", disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer")}>
      <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[3px] peer-focus-visible:ring-2 peer-focus-visible:ring-[#0D6EFD]/40">
        {checked ? (
          <PlIcon name="navigation-checkbox-on" className="text-[var(--pl-primary)]" />
        ) : (
          <span className="h-6 w-6 rounded-[3px] border-2 border-[var(--pl-g300)]" />
        )}
      </span>
      <span
        className={clsx(
          "min-w-0 text-[14px] leading-[14px]",
          tone === "primary" ? "font-semibold" : "font-medium",
          tone === "primary" && checked ? "text-[var(--pl-primary-text)]" : "text-[var(--pl-text)]"
        )}
      >
        {label}
      </span>
    </label>
  );
}

/** A Global Options row: label, 12px note, and the switch on the end side. */
export function NavOptionRow({ label, note, checked, onChange }: { label: string; note: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <span className={plText.h6}>{label}</span>
        <span className="text-[12px] font-normal leading-[12px] text-[var(--pl-text-3)]">{note}</span>
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

/** The row's eye: the frame's filled blue eye while shown, the closed eye while hidden. */
export function NavEye({ hidden }: { hidden: boolean }) {
  return hidden ? (
    <PlIcon name="navigation-eye-closed" className="text-[var(--pl-text-3)]" />
  ) : (
    <PlIcon name="navigation-eye" className="text-[var(--pl-primary)]" />
  );
}

/** "Page Order" and its hint, as the frame heads the middle column. */
export function NavListHeading({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className={plText.h5}>{title}</p>
      <p className={plText.sub}>{hint}</p>
    </div>
  );
}

/** A switch with its caption beside it (the item editor's Header / Drawer / new tab). */
function SwitchLabel({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex shrink-0 items-center gap-2 text-[14px] font-medium leading-[14px] text-[var(--pl-text)]">
      <Switch checked={checked} onChange={onChange} label={label} />
      {label}
    </label>
  );
}

// ---- Navigation -------------------------------------------------------------------------------------

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
    <NavOptionRow
      label={label}
      note={note}
      checked={options[key]}
      onChange={() => busy === null && save(server.navigation?.items ?? [], { ...options, [key]: !options[key] })}
    />
  );

  return (
    <div className="flex flex-col gap-3">
      <div className={NAV_CARD}>
        <p className={plText.h5}>{t("publicLink.navigation.display")}</p>
        <div className="flex flex-col gap-3">
          <NavCheckbox
            checked={allHeader}
            disabled={busy !== null}
            onChange={(checked) => save(items.map((i) => ({ ...i, showInHeader: checked })))}
            label={tx("pl.navigation.showInHeader")}
          />
          <NavCheckbox
            checked={allDrawer}
            disabled={busy !== null}
            onChange={(checked) => save(items.map((i) => ({ ...i, showInDrawer: checked })))}
            label={tx("pl.navigation.showInDrawer")}
          />
        </div>
      </div>
      <div className={NAV_CARD}>
        <p className={plText.h5}>{t("publicLink.navigation.globalOptions")}</p>
        <div className="flex flex-col gap-6">
          {option("stickyHeader", t("publicLink.navigation.stickyHeader"), tx("pl.navigation.stickyHeaderNote"))}
          {option("showActivePageIndicator", tx("pl.navigation.activeIndicator"), tx("pl.navigation.activeIndicatorNote"))}
          {option("showIcons", tx("pl.navigation.showIcons"), tx("pl.navigation.showIconsNote"))}
          {option("openLinksInSameTab", tx("pl.navigation.sameTab"), tx("pl.navigation.sameTabNote"))}
        </div>
        {busy && <span className={NOTE}>{tx("pl.common.saving")}</span>}
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

/** The problems a single input shows under itself; the rest are listed above the Save button. */
const LABEL_REQUIRED = "publiclink.navigation.label-required";
const LABEL_TOO_LONG = "publiclink.text.too-long";
const URL_INVALID = "publiclink.link.url-invalid";
const FIELD_CODES: ReadonlySet<string> = new Set([LABEL_REQUIRED, LABEL_TOO_LONG, URL_INVALID]);

/** The checks `validateNavigation` runs, for one item on its own (its children aside). */
function itemCodes(item: NavItemDto, maxLabel: number): Set<string> {
  const alone = { maxTopLevel: Number.MAX_SAFE_INTEGER, maxChildren: Number.MAX_SAFE_INTEGER, maxLabel };
  return new Set(validateNavigation([{ ...item, children: [] }], alone).map((p) => p.code));
}

type TargetKind = "group" | "page" | "anchor" | "external";

/** The link part of an item: none (a group), a page, a section of a page, or an https address. */
function TargetEditor({
  sync,
  target,
  onChange,
  allowGroup,
  urlError,
  onUrlBlur,
}: {
  sync: PublicLinkSync;
  target: LinkTargetDto | null | undefined;
  onChange: (target: LinkTargetDto | null) => void;
  allowGroup: boolean;
  /** The address's problem, once the field has been left (or Save was pressed). */
  urlError?: string;
  onUrlBlur?: () => void;
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
      <PlSelect aria-label={tx("pl.field.linkKind")} value={kind} onChange={(e) => changeKind(e.target.value as TargetKind)}>
        {allowGroup && <option value="group">{tx("pl.nav.group")}</option>}
        <option value="page">{tx("pl.field.link.page")}</option>
        <option value="anchor">{tx("pl.field.link.anchor")}</option>
        <option value="external">{tx("pl.field.link.external")}</option>
      </PlSelect>
      {(kind === "page" || kind === "anchor") && (
        <PlSelect
          aria-label={tx("pl.field.link.page")}
          value={target?.pageId ?? ""}
          onChange={(e) => onChange(kind === "page" ? { kind: "page", pageId: e.target.value } : { kind: "anchor", pageId: e.target.value, sectionId: null })}
        >
          {pages.map((p) => (
            <option key={p.pageId} value={p.pageId}>
              {pageTitle(p, locale, sync.editLanguage)}
            </option>
          ))}
        </PlSelect>
      )}
      {kind === "anchor" && (
        <PlSelect
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
        </PlSelect>
      )}
      {kind === "external" && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <PlInput
                dir="ltr"
                inputMode="url"
                aria-label={tx("pl.navigation.url")}
                placeholder={tx("pl.nav.linkUrl")}
                invalid={Boolean(urlError)}
                value={target?.url ?? ""}
                onChange={(e) => onChange({ ...target!, url: e.target.value.trim() })}
                onBlur={onUrlBlur}
              />
            </div>
            <SwitchLabel
              checked={target?.openInNewTab !== false}
              onChange={() => onChange({ ...target!, openInNewTab: target?.openInNewTab === false })}
              label={tx("pl.field.newTab")}
            />
          </div>
          <PlFieldError>{urlError}</PlFieldError>
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
  const { touched, touch, touchAll } = useTouched();
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

  // What each input shows under itself. A label over the limit is reported at
  // once; a missing label or a bad address only once the field was left or Save
  // was pressed, so a brand-new link is not painted red before anything is typed.
  const ownCodes = itemCodes(item, limits.maxLabel);
  const childCodes = children.map((c) => itemCodes(c.item, limits.maxLabel));
  const labelError = (codes: Set<string>, name: string) =>
    codes.has(LABEL_TOO_LONG)
      ? tx(problemKey(LABEL_TOO_LONG), { max: limits.maxLabel })
      : codes.has(LABEL_REQUIRED) && touched(name)
        ? tx(problemKey(LABEL_REQUIRED))
        : undefined;
  const urlError = (codes: Set<string>, name: string) => (codes.has(URL_INVALID) && touched(name) ? tx(problemKey(URL_INVALID)) : undefined);
  // Listed above Save: every problem no input of this editor accounts for.
  const shownAtField = new Set([...ownCodes, ...childCodes.flatMap((codes) => [...codes])].filter((code) => FIELD_CODES.has(code)));
  const listed = Array.from(new Set(problems.filter((p) => !shownAtField.has(p.code)).map((p) => problemKey(p.code))));

  const setChild = (i: number, child: NavItemDto) => setChildren((cs) => cs.map((c, n) => (n === i ? { ...c, item: child } : c)));
  const addChildRow = (child: NavItemDto) => setChildren((cs) => [...cs, { key: rowKey(child), item: { ...child, children: [] } }]);

  function save() {
    // Blocked while anything is wrong: reveal every field's message instead.
    if (problems.length > 0) {
      touchAll();
      return;
    }
    setFailed(false);
    void act("save", () => sync.saveNavigation(navigationInput(next, options))).then((ok) => (ok ? onClose() : setFailed(true)));
  }

  const others = items.map((it, i) => ({ it, i })).filter(({ i }) => i !== index);
  const ownLabelError = labelError(ownCodes, "label");

  return (
    <Modal
      open
      onClose={onClose}
      title={index === null ? tx("pl.nav.addItemTitle") : tx("pl.nav.editItem")}
      className="max-w-2xl"
      footer={
        <>
          <PlButton variant="neutral" size="md" onClick={onClose}>
            {tx("pl.common.cancel")}
          </PlButton>
          <PlButton size="md" onClick={save} disabled={busy !== null}>
            {busy ? tx("pl.common.saving") : tx("pl.common.save")}
          </PlButton>
        </>
      }
    >
      <div className="flex max-h-[65vh] flex-col gap-6 overflow-y-auto p-1">
        <div className="grid gap-4 sm:grid-cols-2">
          <PlField label={tx("pl.nav.linkLabel")} required={ownCodes.has(LABEL_REQUIRED)} error={ownLabelError}>
            <PlInput
              aria-label={tx("pl.nav.linkLabel")}
              maxLength={limits.maxLabel}
              invalid={Boolean(ownLabelError)}
              placeholder={item.target ? targetText(server, item.target, locale, lang, groupText) : ""}
              value={item.label?.[lang] ?? ""}
              onChange={(e) => setItem((it) => ({ ...it, label: withText(it.label, lang, e.target.value) }))}
              onBlur={() => touch("label")}
            />
          </PlField>
          <PlField label={tx("pl.field.linkKind")}>
            <TargetEditor
              sync={sync}
              target={item.target}
              allowGroup
              onChange={(target) => setItem((it) => ({ ...it, target }))}
              urlError={urlError(ownCodes, "url")}
              onUrlBlur={() => touch("url")}
            />
          </PlField>
        </div>
        <div className="flex flex-wrap gap-6">
          <SwitchLabel checked={item.showInHeader} onChange={() => setItem((it) => ({ ...it, showInHeader: !it.showInHeader }))} label={tx("pl.nav.header")} />
          <SwitchLabel checked={item.showInDrawer} onChange={() => setItem((it) => ({ ...it, showInDrawer: !it.showInDrawer }))} label={tx("pl.nav.drawer")} />
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--pl-g300)] pt-4">
          <div className="flex items-center justify-between">
            <span className={plText.h6}>{tx("pl.nav.children")}</span>
            <span className={NOTE}>{tx("pl.nav.childrenCount", { n: children.length, max: limits.maxChildren })}</span>
          </div>
          {children.length === 0 && <p className={NOTE}>{item.target ? tx("pl.nav.noChildren") : tx("pl.nav.groupNeedsChildren")}</p>}
          <ReorderList
            items={children}
            getId={(c) => c.key}
            getLabel={(c) => targetText(server, c.item.target, locale, lang, groupText)}
            onReorder={setChildren}
            className="gap-2"
            renderRow={(row, i, grip) => {
              const rowLabelError = labelError(childCodes[i], `${row.key}:label`);
              return (
                <div className="flex w-full min-w-0 flex-col gap-2 rounded-[12px] border border-[var(--pl-g300)] p-2">
                  <div className="flex items-center gap-2">
                    {grip}
                    <div className="min-w-0 flex-1">
                      <PlInput
                        aria-label={tx("pl.nav.linkLabel")}
                        maxLength={limits.maxLabel}
                        invalid={Boolean(rowLabelError)}
                        placeholder={targetText(server, row.item.target, locale, lang, groupText)}
                        value={row.item.label?.[lang] ?? ""}
                        onChange={(e) => setChild(i, { ...row.item, label: withText(row.item.label, lang, e.target.value) })}
                        onBlur={() => touch(`${row.key}:label`)}
                      />
                    </div>
                    <button
                      type="button"
                      className={clsx(NAV_ICON_BUTTON, MUTED_ICON)}
                      title={tx("pl.nav.promote")}
                      onClick={() => {
                        setPromoted((p) => [...p, row.item]);
                        setChildren((cs) => cs.filter((_c, n) => n !== i));
                      }}
                    >
                      <CornerLeftUp size={16} />
                      <span className="sr-only">{tx("pl.nav.promote")}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={tx("pl.common.remove")}
                      onClick={() => setChildren((cs) => cs.filter((_c, n) => n !== i))}
                      className={clsx(NAV_ICON_BUTTON, DANGER_ICON)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <PlFieldError>{rowLabelError}</PlFieldError>
                  <TargetEditor
                    sync={sync}
                    target={row.item.target}
                    allowGroup={false}
                    onChange={(target) => setChild(i, { ...row.item, target })}
                    urlError={urlError(childCodes[i], `${row.key}:url`)}
                    onUrlBlur={() => touch(`${row.key}:url`)}
                  />
                </div>
              );
            }}
          />
          {children.length < limits.maxChildren && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[180px] flex-1">
                <PlSelect aria-label={tx("pl.nav.addChildPage")} value={pickPage} onChange={(e) => setPickPage(e.target.value)}>
                  <option value="">{tx("pl.nav.addChildPage")}</option>
                  {pages.map((p) => (
                    <option key={p.pageId} value={p.pageId}>
                      {pageTitle(p, locale, lang)}
                    </option>
                  ))}
                </PlSelect>
              </div>
              <PlButton
                variant="plain"
                size="md"
                className="text-[14px]"
                disabled={!pickPage}
                onClick={() => {
                  addChildRow({ target: { kind: "page", pageId: pickPage }, showInHeader: true, showInDrawer: true, children: [] });
                  setPickPage("");
                }}
              >
                <Plus size={16} />
                {tx("pl.common.add")}
              </PlButton>
              <PlButton
                variant="plain"
                size="md"
                className="text-[14px]"
                onClick={() => addChildRow({ label: {}, target: { kind: "external", url: "https://", openInNewTab: !options.openLinksInSameTab }, showInHeader: true, showInDrawer: true, children: [] })}
              >
                <Plus size={16} />
                {tx("pl.nav.addLink")}
              </PlButton>
            </div>
          )}
        </div>

        {index !== null && children.length === 0 && others.length > 0 && (
          <div className="border-t border-[var(--pl-g300)] pt-4">
            <PlField label={tx("pl.nav.putUnder")}>
              <PlSelect aria-label={tx("pl.nav.putUnder")} value={parent} onChange={(e) => setParent(e.target.value)}>
                <option value="">{tx("pl.nav.topLevel")}</option>
                {others
                  .filter(({ it }) => (it.children ?? []).length < limits.maxChildren)
                  .map(({ it, i }) => (
                    <option key={i} value={String(i)}>
                      {itemLabel(server, it, locale, lang)}
                    </option>
                  ))}
              </PlSelect>
            </PlField>
          </div>
        )}

        {listed.length > 0 && (
          <ul role="alert" className="flex list-disc flex-col gap-1 ps-5 text-[12px] font-normal leading-[1.4] text-[var(--pl-error)]">
            {listed.map((key) => (
              <li key={key}>{tx(key, { max: key.endsWith("too-many-children") ? limits.maxChildren : key.endsWith("too-many-items") ? limits.maxTopLevel : limits.maxLabel })}</li>
            ))}
          </ul>
        )}
        {failed && sync.error && <PlFieldError>{sync.error}</PlFieldError>}
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
    <div className="flex min-w-0 flex-col gap-3">
      <NavListHeading title={t("publicLink.navigation.pageOrder")} hint={t("publicLink.navigation.pageOrderHint")} />
      {!explicit && <p className={NOTE}>{tx("pl.nav.empty")}</p>}
      <ReorderList
        items={items}
        getId={keyOf}
        getLabel={(item) => itemLabel(server, item, locale, lang)}
        onReorder={(next) => void save(next)}
        className={NAV_ROWS}
        renderRow={(item, index, grip) => {
          const hidden = !item.showInHeader && !item.showInDrawer;
          const label = itemLabel(server, item, locale, lang);
          const kids = item.children ?? [];
          return (
            <>
              <span className="self-start">{grip}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <span className={clsx(plText.h6, "flex min-h-6 min-w-0 items-center gap-2")}>
                  {!item.target && <FolderOpen size={16} className="shrink-0" />}
                  <span className="truncate py-[3px]">{label}</span>
                </span>
                {kids.map((child, ci) => (
                  <span key={child.id ?? ci} className="flex min-w-0 items-center gap-1 ps-2 text-[12px] font-normal leading-[1.4] text-[var(--pl-text-3)]">
                    <CornerDownRight size={12} className="shrink-0 rtl:-scale-x-100" />
                    <span className="truncate">{pickText(child.label, locale, lang) || targetText(server, child.target, locale, lang, groupText)}</span>
                    <button
                      type="button"
                      title={tx("pl.nav.promote")}
                      aria-label={`${tx("pl.nav.promote")} — ${pickText(child.label, locale, lang) || targetText(server, child.target, locale, lang, groupText)}`}
                      disabled={busy !== null || items.length >= max}
                      onClick={() => void save(promoteChild(items, index, ci))}
                      className={clsx(NAV_ICON_BUTTON, MUTED_ICON, "!h-5 !w-5")}
                    >
                      <CornerLeftUp size={12} />
                    </button>
                    <button
                      type="button"
                      aria-label={`${tx("pl.common.remove")} — ${pickText(child.label, locale, lang) || targetText(server, child.target, locale, lang, groupText)}`}
                      disabled={busy !== null || (!item.target && kids.length === 1)}
                      onClick={() => void save(removeChild(items, index, ci))}
                      className={clsx(NAV_ICON_BUTTON, DANGER_ICON, "!h-5 !w-5")}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <button
                type="button"
                aria-label={`${label} — ${tx("pl.nav.editItem")}`}
                disabled={busy !== null}
                onClick={() => setEditing({ index, item })}
                className={clsx(NAV_ICON_BUTTON, MUTED_ICON, "self-start")}
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                aria-label={`${label} — ${t(hidden ? "publicLink.nav.showPage" : "publicLink.nav.hidePage")}`}
                aria-pressed={hidden}
                disabled={busy !== null}
                onClick={() => void save(items.map((it, i) => (i === index ? { ...it, showInHeader: hidden, showInDrawer: hidden } : it)))}
                className={clsx(NAV_ICON_BUTTON, "self-start")}
              >
                <NavEye hidden={hidden} />
              </button>
              <button
                type="button"
                aria-label={`${label} — ${tx("pl.common.remove")}`}
                disabled={busy !== null}
                onClick={() => void save(items.filter((_it, i) => i !== index))}
                className={clsx(NAV_ICON_BUTTON, DANGER_ICON, "self-start")}
              >
                <X size={16} />
              </button>
            </>
          );
        }}
      />
      {(server.navigation?.warnings ?? []).length > 0 && <p className={WARNING}>{tx("pl.nav.warning")}</p>}

      {items.length < max && (
        <div className="flex flex-wrap items-end gap-2">
          {addable.length > 0 && (
            <>
              <div className="min-w-[180px] flex-1">
                <PlSelect aria-label={tx("pl.nav.addPage")} value={pickPage} onChange={(e) => setPickPage(e.target.value)}>
                  <option value="">{tx("pl.nav.addPage")}</option>
                  {addable.map((p) => (
                    <option key={p.pageId} value={p.pageId}>
                      {pageTitle(p, locale, lang)}
                    </option>
                  ))}
                </PlSelect>
              </div>
              <PlButton
                variant="plain"
                size="md"
                className="text-[14px]"
                disabled={!pickPage || busy !== null}
                onClick={() =>
                  void save([...items, { target: { kind: "page", pageId: pickPage }, showInHeader: true, showInDrawer: true, children: [] }]).then((ok) => ok && setPickPage(""))
                }
              >
                <Plus size={16} />
                {tx("pl.common.add")}
              </PlButton>
            </>
          )}
          <PlButton
            variant="plain"
            size="md"
            className="text-[14px]"
            disabled={busy !== null}
            onClick={() =>
              setEditing({
                index: null,
                item: { label: {}, target: { kind: "external", url: "https://", openInNewTab: !options.openLinksInSameTab }, showInHeader: true, showInDrawer: true, children: [] },
              })
            }
          >
            <Plus size={16} />
            {tx("pl.nav.addLink")}
          </PlButton>
          <PlButton
            variant="plain"
            size="md"
            className="text-[14px]"
            disabled={busy !== null}
            onClick={() => setEditing({ index: null, item: { label: {}, target: null, showInHeader: true, showInDrawer: true, children: [] } })}
          >
            <FolderOpen size={16} />
            {tx("pl.nav.addGroup")}
          </PlButton>
        </div>
      )}
      <ReorderHint>{tx("pl.navigation.dragHint")}</ReorderHint>
      <PlInfoBanner className="py-2">{tx("pl.nav.childrenHint", { max: limits.maxChildren })}</PlInfoBanner>
      {editing && <NavItemModal sync={sync} items={items} index={editing.index} initial={editing.item} onClose={() => setEditing(null)} />}
    </div>
  );
}

// ---- Footer -----------------------------------------------------------------------------------------

/** Sensible ceilings for the footer's free text (the API publishes none for it). */
const FOOTER_MAX = { group: 60, url: 300, address: 200, hours: 120, phone: 30 } as const;

/** Digits with the usual separators, and at least five characters of them. */
const phoneRule: Rule = (value) => (!value.trim() || /^[+\d][\d\s().\-]{4,}$/.test(value.trim()) ? null : { key: "pl.navigation.phoneInvalid" });

const CONTACT_FIELDS = ["address", "hours", "phone"] as const;
const CONTACT_RULES: Readonly<Record<(typeof CONTACT_FIELDS)[number], readonly Rule[]>> = {
  address: [rules.maxLength(FOOTER_MAX.address)],
  hours: [rules.maxLength(FOOTER_MAX.hours)],
  phone: [rules.maxLength(FOOTER_MAX.phone), phoneRule],
};

/** The footer, edited as a local copy and saved whole. */
export function FooterCard({ sync }: { sync: PublicLinkSync }) {
  const tx = usePlText();
  const { locale } = useI18n();
  const { act, busy } = useBusy();
  const { check } = useValidation();
  const { touched, touch, touchAll, reset } = useTouched();
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
    reset();
  }, [footer, reset]);

  const networks = server.catalogues?.socialNetworks ?? [];
  const limits = server.catalogues?.limits;
  const pages = orderedPages(server);

  // Every input's problem; shown once the field was left or Save was pressed.
  const groupErrors = groups.map((g) => check(g.title?.[lang] ?? "", [rules.maxLength(FOOTER_MAX.group)]));
  const socialErrors = social.map((s) => check(s.url, [rules.url(), rules.maxLength(FOOTER_MAX.url)]));
  const contactErrors = CONTACT_FIELDS.map((field) => check(contact[field]?.[lang] ?? "", CONTACT_RULES[field]));
  const invalid = [...groupErrors, ...socialErrors, ...contactErrors].some(Boolean);
  const shown = (name: string, error: string | undefined) => (touched(name) ? error : undefined);

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
    // Blocked while anything is wrong: reveal every field's message instead.
    if (invalid) {
      touchAll();
      return;
    }
    void act("footer", () =>
      sync.saveFooter({
        groups,
        socialLinks: social.filter((s) => s.network && s.url.trim()),
        contact,
      })
    ).then((ok) => setSaved(ok));
  }

  return (
    <div className={clsx(plPanel, "flex flex-col gap-6 px-4 py-6")}>
      <div className="flex flex-col gap-3">
        <p className={plText.h5}>{tx("pl.footer.title")}</p>
        <p className={plText.sub}>{tx("pl.footer.note")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-3">
          {groups.map((group, gi) => {
            const error = shown(`group:${gi}`, groupErrors[gi]);
            return (
              <div key={group.id ?? `g${gi}`} className="flex flex-col gap-3 rounded-[12px] border border-[var(--pl-g300)] p-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <PlInput
                        aria-label={tx("pl.footer.group")}
                        placeholder={tx("pl.footer.group")}
                        invalid={Boolean(error)}
                        value={group.title?.[lang] ?? ""}
                        onChange={(e) => setGroups((gs) => gs.map((g, i) => (i === gi ? { ...g, title: withText(g.title, lang, e.target.value) } : g)))}
                        onBlur={() => touch(`group:${gi}`)}
                      />
                    </div>
                    <button
                      type="button"
                      aria-label={tx("pl.common.remove")}
                      onClick={() => setGroups((gs) => gs.filter((_g, i) => i !== gi))}
                      className={clsx(NAV_ICON_BUTTON, DANGER_ICON)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <PlFieldError>{error}</PlFieldError>
                </div>
                {pages.map((p) => (
                  <NavCheckbox
                    key={p.pageId}
                    tone="plain"
                    checked={(group.links ?? []).some((l) => l.target.kind === "page" && l.target.pageId === p.pageId)}
                    onChange={() => togglePage(gi, p.pageId)}
                    label={pageTitle(p, locale, lang)}
                  />
                ))}
              </div>
            );
          })}
          {(!limits || groups.length < limits.maxFooterGroups) && (
            <PlButton variant="plain" size="md" className="w-fit text-[14px]" onClick={() => setGroups((gs) => [...gs, { title: {}, links: [] }])}>
              <Plus size={16} />
              {tx("pl.footer.addGroup")}
            </PlButton>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <span className={plText.h6}>{tx("pl.footer.social")}</span>
          {social.map((link, si) => {
            const error = shown(`social:${si}`, socialErrors[si]);
            return (
              <div key={si} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-[136px] shrink-0">
                    <PlSelect
                      aria-label={tx("pl.footer.social")}
                      value={link.network}
                      onChange={(e) => setSocial((ls) => ls.map((l, i) => (i === si ? { ...l, network: e.target.value } : l)))}
                    >
                      {networks.map((n) => (
                        <option key={n.key} value={n.key}>
                          {n.key.charAt(0).toUpperCase() + n.key.slice(1)}
                        </option>
                      ))}
                    </PlSelect>
                  </div>
                  <div className="min-w-0 flex-1">
                    <PlInput
                      aria-label={tx("pl.navigation.url")}
                      dir="ltr"
                      inputMode="url"
                      placeholder="https://"
                      invalid={Boolean(error)}
                      value={link.url}
                      onChange={(e) => setSocial((ls) => ls.map((l, i) => (i === si ? { ...l, url: e.target.value.trim() } : l)))}
                      onBlur={() => touch(`social:${si}`)}
                    />
                  </div>
                  <button
                    type="button"
                    aria-label={tx("pl.common.remove")}
                    onClick={() => setSocial((ls) => ls.filter((_l, i) => i !== si))}
                    className={clsx(NAV_ICON_BUTTON, DANGER_ICON)}
                  >
                    <X size={16} />
                  </button>
                </div>
                <PlFieldError>{error}</PlFieldError>
              </div>
            );
          })}
          {networks.length > 0 && (!limits || social.length < limits.maxSocialLinks) && (
            <PlButton variant="plain" size="md" className="w-fit text-[14px]" onClick={() => setSocial((ls) => [...ls, { network: networks[0].key, url: "" }])}>
              <Plus size={16} />
              {tx("pl.footer.addSocial")}
            </PlButton>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <span className={plText.h6}>{tx("pl.footer.contact")}</span>
          {CONTACT_FIELDS.map((field, fi) => {
            const error = shown(`contact:${field}`, contactErrors[fi]);
            return (
              <PlField key={field} label={tx(`pl.footer.${field}`)} error={error}>
                <PlInput
                  aria-label={tx(`pl.footer.${field}`)}
                  inputMode={field === "phone" ? "tel" : undefined}
                  dir={field === "phone" ? "ltr" : undefined}
                  invalid={Boolean(error)}
                  value={contact[field]?.[lang] ?? ""}
                  onChange={(e) => setContact((c) => ({ ...c, [field]: withText(c[field], lang, e.target.value) }))}
                  onBlur={() => touch(`contact:${field}`)}
                />
              </PlField>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <PlButton size="md" onClick={save} disabled={busy !== null}>
          {busy ? tx("pl.common.saving") : tx("pl.common.save")}
        </PlButton>
        {saved && <span className="text-[12px] font-normal leading-[1.4] text-[var(--pl-success)]">{tx("pl.footer.saved")}</span>}
        {invalid && touched("__all__") && <PlFieldError>{tx("pl.v.fixBeforeNext")}</PlFieldError>}
        {(footer?.warnings ?? []).length > 0 && <span className={WARNING}>{tx("pl.nav.warning")}</span>}
      </div>
    </div>
  );
}
