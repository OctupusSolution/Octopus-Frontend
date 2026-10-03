// A rich-text field editor that keeps the server's block tree intact (see _shared/rich-text.ts).
//
// A contenteditable surface driven by the browser's own editing commands (bold, italic,
// underline, paragraph / heading 2-4 / quote, bulleted and numbered lists with one extra level of
// nesting, links, line breaks with Shift+Enter). After every edit the DOM is read back into the
// model (`parseRichDom`), so what is saved is always something the server accepts; the DOM is only
// rewritten from the model when the value changes from outside (another language, a reload).
// Pasting inserts plain text, so foreign markup never reaches the tree.
//
// Links are typed: a page of this site, a section of a page (by anchor), or an https address —
// the kinds the server allows in rich text.
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Bold, IndentDecrease, IndentIncrease, Italic, Link2, List, ListOrdered, Underline, Unlink } from "lucide-react";
import { Button, Input, Select } from "@ui/primitives";
import type { PageDraftResponse, RichLinkTarget, RichTextDocument } from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import { stableJson, type PublicLinkSync } from "@/entities/site-draft";
import {
  countRichNodes,
  decodeLinkHref,
  encodeLinkHref,
  MAX_RICH_TEXT_NODES,
  normalizeRichText,
  parseRichDom,
  richTextToHtml,
} from "../../_shared/rich-text";
import { usePlText } from "../../_shared/texts";
import { Switch } from "../../ui/switch";
import { orderedPages, pageTitle } from "./common";

type BlockKind = "p" | "h2" | "h3" | "h4" | "blockquote";

const TOOL =
  "inline-flex h-7 min-w-7 items-center justify-center rounded-[6px] px-1.5 text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)] hover:text-[var(--octo-text-primary)] disabled:opacity-40";

/** The element the caret (or selection start) is in, inside `root`. */
function selectionElement(root: HTMLElement | null): HTMLElement | null {
  const sel = typeof window !== "undefined" ? window.getSelection() : null;
  if (!root || !sel || sel.rangeCount === 0) return null;
  let node: Node | null = sel.getRangeAt(0).startContainer;
  if (node && node.nodeType === 3) node = node.parentNode;
  return node instanceof HTMLElement && root.contains(node) ? node : null;
}

function closest(el: HTMLElement | null, root: HTMLElement | null, test: (e: HTMLElement) => boolean): HTMLElement | null {
  for (let cur = el; cur && cur !== root; cur = cur.parentElement) if (test(cur)) return cur;
  return null;
}

function LinkPanel({
  sync,
  page,
  initial,
  onApply,
  onCancel,
}: {
  sync: PublicLinkSync;
  page: PageDraftResponse;
  initial: RichLinkTarget | null;
  onApply: (target: RichLinkTarget) => void;
  onCancel: () => void;
}) {
  const tx = usePlText();
  const { locale } = useI18n();
  const pages = orderedPages(sync.server!);
  const [kind, setKind] = useState<RichLinkTarget["kind"]>(initial?.kind ?? "page");
  const [pageId, setPageId] = useState(initial && initial.kind !== "external" ? initial.pageId : pages[0]?.pageId ?? page.pageId);
  const [sectionId, setSectionId] = useState(initial?.kind === "anchor" ? initial.sectionId : "");
  const [url, setUrl] = useState(initial?.kind === "external" ? initial.url : "https://");
  const [newTab, setNewTab] = useState(initial?.kind === "external" ? initial.openInNewTab === true : true);
  const target = sync.server?.pages[pageId];

  useEffect(() => {
    if (kind === "anchor" && pageId && !sync.server?.pages[pageId]) void sync.loadPage(pageId).catch(() => undefined);
  }, [kind, pageId, sync]);

  // A section link needs the section to carry an anchor.
  const anchored = (target?.sections ?? []).filter((s) => s.anchor);
  const valid =
    kind === "page" ? Boolean(pageId) : kind === "anchor" ? Boolean(pageId && anchored.some((s) => s.sectionId === sectionId)) : /^https:\/\/[^\s/]+\.[^\s]+$/i.test(url.trim());

  function apply() {
    if (!valid) return;
    if (kind === "page") onApply({ kind: "page", pageId });
    else if (kind === "anchor") onApply({ kind: "anchor", pageId, sectionId });
    else onApply({ kind: "external", url: url.trim(), openInNewTab: newTab });
  }

  return (
    <div className="flex flex-col gap-2 rounded-[10px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2.5">
      <Select aria-label={tx("pl.field.linkKind")} value={kind} onChange={(e) => setKind(e.target.value as RichLinkTarget["kind"])}>
        {(["page", "anchor", "external"] as const).map((k) => (
          <option key={k} value={k}>
            {tx(`pl.field.link.${k}`)}
          </option>
        ))}
      </Select>
      {(kind === "page" || kind === "anchor") && (
        <Select aria-label={tx("pl.field.link.page")} value={pageId} onChange={(e) => setPageId(e.target.value)}>
          {pages.map((p) => (
            <option key={p.pageId} value={p.pageId}>
              {pageTitle(p, locale, sync.editLanguage)}
            </option>
          ))}
        </Select>
      )}
      {kind === "anchor" &&
        (anchored.length ? (
          <Select aria-label={tx("pl.field.link.anchor")} value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            <option value="">—</option>
            {anchored.map((s) => (
              <option key={s.sectionId} value={s.sectionId}>
                #{s.anchor}
              </option>
            ))}
          </Select>
        ) : (
          <span className="text-[11px] text-[var(--octo-text-muted)]">{tx("pl.rich.noAnchors")}</span>
        ))}
      {kind === "external" && (
        <>
          <Input dir="ltr" aria-label="URL" value={url} onChange={(e) => setUrl(e.target.value)} />
          <label className="flex items-center gap-2 text-[12px] text-[var(--octo-text-secondary)]">
            <Switch checked={newTab} onChange={() => setNewTab(!newTab)} label={tx("pl.field.newTab")} />
            {tx("pl.field.newTab")}
          </label>
        </>
      )}
      <div className="flex gap-2">
        <Button size="sm" disabled={!valid} onClick={apply}>
          {tx("pl.rich.applyLink")}
        </Button>
        <Button size="sm" variant="secondary" onClick={onCancel}>
          {tx("pl.common.cancel")}
        </Button>
      </div>
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
  sync,
  page,
  label,
}: {
  value: RichTextDocument | undefined;
  onChange: (doc: RichTextDocument) => void;
  sync: PublicLinkSync;
  page: PageDraftResponse;
  label: string;
}) {
  const tx = usePlText();
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string | null>(null);
  const savedRange = useRef<Range | null>(null);
  const [block, setBlock] = useState<BlockKind>("p");
  const [inList, setInList] = useState(false);
  const [linkOpen, setLinkOpen] = useState<{ initial: RichLinkTarget | null } | null>(null);
  const [nodes, setNodes] = useState(() => countRichNodes(value));

  // Only an outside change rewrites the DOM; our own edits leave the caret alone.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const json = stableJson(normalizeRichText(value));
    if (json === lastEmitted.current) return;
    lastEmitted.current = json;
    el.innerHTML = richTextToHtml(value);
    setNodes(countRichNodes(value));
  }, [value]);

  function emit() {
    const el = ref.current;
    if (!el) return;
    const doc = parseRichDom(el);
    lastEmitted.current = stableJson(doc);
    setNodes(countRichNodes(doc));
    onChange(doc);
  }

  function refreshState() {
    const el = selectionElement(ref.current);
    const b = closest(el, ref.current, (e) => /^(P|DIV|H[1-6]|BLOCKQUOTE|LI)$/.test(e.tagName));
    const tag = b?.tagName ?? "P";
    setBlock(tag === "H1" || tag === "H2" ? "h2" : tag === "H3" ? "h3" : /^H[4-6]$/.test(tag) ? "h4" : tag === "BLOCKQUOTE" ? "blockquote" : "p");
    setInList(Boolean(closest(el, ref.current, (e) => e.tagName === "LI")));
  }

  useEffect(() => {
    const onSel = () => {
      if (ref.current && document.activeElement === ref.current) refreshState();
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);

  function exec(command: string, arg?: string) {
    ref.current?.focus();
    try {
      document.execCommand("styleWithCSS", false, "false");
      document.execCommand(command, false, arg);
    } catch {
      // An unsupported command changes nothing; the model stays what the DOM says.
    }
    emit();
    refreshState();
  }

  function saveSelection() {
    const sel = window.getSelection();
    savedRange.current = sel && sel.rangeCount && ref.current?.contains(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : null;
  }

  function restoreSelection() {
    const sel = window.getSelection();
    ref.current?.focus();
    if (sel && savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  }

  function currentAnchor(): HTMLAnchorElement | null {
    return closest(selectionElement(ref.current), ref.current, (e) => e.tagName === "A") as HTMLAnchorElement | null;
  }

  function openLink() {
    saveSelection();
    const a = currentAnchor();
    setLinkOpen({ initial: a ? decodeLinkHref(a.getAttribute("href")) : null });
  }

  function applyLink(target: RichLinkTarget) {
    setLinkOpen(null);
    restoreSelection();
    const href = encodeLinkHref(target);
    const existing = currentAnchor();
    if (existing) {
      existing.setAttribute("href", href);
      emit();
      return;
    }
    const sel = window.getSelection();
    if (sel && sel.rangeCount && !sel.getRangeAt(0).collapsed) {
      exec("createLink", href);
      return;
    }
    // Nothing selected: insert the link with a readable text of its own.
    const text =
      target.kind === "external"
        ? target.url.replace(/^https:\/\//, "")
        : pageTitle(sync.server?.overview.pages.find((p) => p.pageId === target.pageId), sync.editLanguage) || tx("pl.rich.linkText");
    const a = document.createElement("a");
    a.setAttribute("href", href);
    a.textContent = text;
    exec("insertHTML", a.outerHTML);
  }

  function removeLink() {
    const a = currentAnchor();
    if (a) {
      const range = document.createRange();
      range.selectNodeContents(a);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    exec("unlink");
  }

  const keep = (e: React.MouseEvent) => e.preventDefault(); // toolbar clicks keep the editor's selection
  const tooBig = nodes > MAX_RICH_TEXT_NODES;

  return (
    <div className="flex flex-col gap-1.5">
      <div role="toolbar" aria-label={label} className="flex flex-wrap items-center gap-0.5 rounded-t-[9px] border border-b-0 border-[var(--octo-border-input)] bg-[var(--octo-hover)] px-1.5 py-1">
        <select
          aria-label={tx("pl.rich.block")}
          value={block}
          onMouseDown={saveSelection}
          onChange={(e) => {
            restoreSelection();
            const v = e.target.value as BlockKind;
            exec("formatBlock", `<${v}>`);
          }}
          className="h-7 rounded-[6px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-1.5 text-[12px] text-[var(--octo-text-primary)]"
        >
          <option value="p">{tx("pl.rich.paragraph")}</option>
          <option value="h2">{tx("pl.rich.h2")}</option>
          <option value="h3">{tx("pl.rich.h3")}</option>
          <option value="h4">{tx("pl.rich.h4")}</option>
          <option value="blockquote">{tx("pl.rich.quote")}</option>
        </select>
        <span className="mx-1 h-4 w-px bg-[var(--octo-divider)]" />
        <button type="button" className={TOOL} aria-label={tx("pl.rich.bold")} title={tx("pl.rich.bold")} onMouseDown={keep} onClick={() => exec("bold")}>
          <Bold size={14} />
        </button>
        <button type="button" className={TOOL} aria-label={tx("pl.rich.italic")} title={tx("pl.rich.italic")} onMouseDown={keep} onClick={() => exec("italic")}>
          <Italic size={14} />
        </button>
        <button type="button" className={TOOL} aria-label={tx("pl.rich.underline")} title={tx("pl.rich.underline")} onMouseDown={keep} onClick={() => exec("underline")}>
          <Underline size={14} />
        </button>
        <span className="mx-1 h-4 w-px bg-[var(--octo-divider)]" />
        <button type="button" className={TOOL} aria-label={tx("pl.rich.bullets")} title={tx("pl.rich.bullets")} onMouseDown={keep} onClick={() => exec("insertUnorderedList")}>
          <List size={14} />
        </button>
        <button type="button" className={TOOL} aria-label={tx("pl.rich.numbers")} title={tx("pl.rich.numbers")} onMouseDown={keep} onClick={() => exec("insertOrderedList")}>
          <ListOrdered size={14} />
        </button>
        <button type="button" className={TOOL} disabled={!inList} aria-label={tx("pl.rich.indent")} title={tx("pl.rich.indent")} onMouseDown={keep} onClick={() => exec("indent")}>
          <IndentIncrease size={14} />
        </button>
        <button type="button" className={TOOL} disabled={!inList} aria-label={tx("pl.rich.outdent")} title={tx("pl.rich.outdent")} onMouseDown={keep} onClick={() => exec("outdent")}>
          <IndentDecrease size={14} />
        </button>
        <span className="mx-1 h-4 w-px bg-[var(--octo-divider)]" />
        <button type="button" className={TOOL} aria-label={tx("pl.rich.link")} title={tx("pl.rich.link")} onMouseDown={keep} onClick={openLink}>
          <Link2 size={14} />
        </button>
        <button type="button" className={TOOL} aria-label={tx("pl.rich.unlink")} title={tx("pl.rich.unlink")} onMouseDown={keep} onClick={removeLink}>
          <Unlink size={14} />
        </button>
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        contentEditable
        suppressContentEditableWarning
        onFocus={() => {
          try {
            document.execCommand("defaultParagraphSeparator", false, "p");
          } catch {
            // not every browser knows it; the parser reads <div> lines too
          }
        }}
        onInput={emit}
        onKeyUp={refreshState}
        onMouseUp={refreshState}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          if (text) exec("insertText", text);
        }}
        onClick={(e) => {
          // Links are for visitors; inside the editor a click only places the caret.
          if ((e.target as HTMLElement).closest("a")) e.preventDefault();
        }}
        className={clsx(
          "-mt-1.5 min-h-[120px] whitespace-pre-wrap break-words rounded-b-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2 text-[13px] leading-relaxed text-[var(--octo-text-primary)] outline-none focus:border-[#0D6EFD] focus:ring-2 focus:ring-[#0D6EFD]/30",
          "[&_a]:text-[#0D6EFD] [&_a]:underline [&_blockquote]:my-1 [&_blockquote]:border-s-2 [&_blockquote]:border-[var(--octo-border-input)] [&_blockquote]:ps-3 [&_blockquote]:italic",
          "[&_h2]:my-1 [&_h2]:text-[17px] [&_h2]:font-semibold [&_h3]:my-1 [&_h3]:text-[15px] [&_h3]:font-semibold [&_h4]:my-1 [&_h4]:text-[13.5px] [&_h4]:font-semibold",
          "[&_ol]:list-decimal [&_ol]:ps-5 [&_p]:my-1 [&_ul]:list-disc [&_ul]:ps-5 [&_ul_ul]:list-[circle]"
        )}
      />
      {linkOpen && <LinkPanel sync={sync} page={page} initial={linkOpen.initial} onApply={applyLink} onCancel={() => setLinkOpen(null)} />}
      {tooBig && (
        <span role="alert" className="text-[11px] text-[#DC2626]">
          {tx("pl.rich.tooBig", { max: MAX_RICH_TEXT_NODES })}
        </span>
      )}
    </div>
  );
}
