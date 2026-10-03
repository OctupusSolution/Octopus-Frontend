// The Public Link rich-text value (Domain `RichText.cs`) and its lossless round trip through the
// builder's contenteditable editor.
//
// The server keeps a CLOSED block tree per language — paragraph, heading (2-4), list (items hold
// paragraphs and nested lists, at most MAX_RICH_TEXT_LIST_DEPTH deep), quote; inline runs with
// bold/italic/underline, typed links (page, anchor, https) and line breaks. No HTML is ever stored.
// This file turns that tree into editor HTML (`richTextToHtml`) and reads the editor's DOM back
// (`parseRichDom`), accepting what browsers' editing commands produce (`<b>`, `<div>`, a list
// nested directly in a list, a trailing `<br>` …) and never emitting anything the validator refuses:
// runs are never empty and never hold control/format characters (a newline is always a `br`),
// heading levels are clamped to 2-4, over-deep lists are flattened, a list item is never empty,
// and a link keeps only the kinds rich text accepts.
//
// Links travel through the DOM as `href="#pl-link:<json>"`, so the browser's own
// createLink/unlink commands carry the typed target without any side table.
import type { RichBlock, RichInline, RichLinkTarget, RichTextDocument, RichTextRun } from "@octopus/api-client";

/** Backend defaults (`PublicLink:Limits:MaxRichTextListDepth` / `MaxRichTextNodes`); not exposed by `GET /catalogues`. */
export const MAX_RICH_TEXT_LIST_DEPTH = 2;
export const MAX_RICH_TEXT_NODES = 2000;

export const EMPTY_RICH_TEXT: RichTextDocument = { blocks: [] };

type Marks = { bold: boolean; italic: boolean; underline: boolean };
const NO_MARKS: Marks = { bold: false, italic: false, underline: false };

// ---- text rules ------------------------------------------------------------------------------------

/** Control and format characters (Cc, Cf) except the two joiners emoji and Arabic shaping need. */
const CONTROL_OR_FORMAT = /[\p{Cc}\p{Cf}]/u;
const JOINERS = new Set([0x200c, 0x200d]);

/** Makes a DOM text value acceptable as a run: line breaks and tabs become spaces, other control/format characters go. */
export function cleanRunText(text: string): string {
  let out = "";
  for (const ch of text.replace(/\r\n|[\n\r\t\f\v]/g, " ")) if (JOINERS.has(ch.codePointAt(0) ?? 0) || !CONTROL_OR_FORMAT.test(ch)) out += ch;
  return out;
}

// ---- links -----------------------------------------------------------------------------------------

const LINK_PREFIX = "#pl-link:";

export function encodeLinkHref(target: RichLinkTarget): string {
  return LINK_PREFIX + encodeURIComponent(JSON.stringify(target));
}

/** A typed target back from an href: ours, or a plain https address (pasted/typed); anything else is not a link. */
export function decodeLinkHref(href: string | null | undefined): RichLinkTarget | null {
  if (!href) return null;
  if (href.startsWith(LINK_PREFIX)) {
    try {
      return toLinkTarget(JSON.parse(decodeURIComponent(href.slice(LINK_PREFIX.length))));
    } catch {
      return null;
    }
  }
  if (/^https:\/\/[^\s]+$/i.test(href)) return { kind: "external", url: href, openInNewTab: true };
  return null;
}

function toLinkTarget(value: unknown): RichLinkTarget | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const kind = String(v.kind ?? "").toLowerCase();
  if (kind === "page" && typeof v.pageId === "string" && v.pageId) return { kind: "page", pageId: v.pageId };
  if (kind === "anchor" && typeof v.pageId === "string" && typeof v.sectionId === "string" && v.pageId && v.sectionId)
    return { kind: "anchor", pageId: v.pageId, sectionId: v.sectionId };
  if (kind === "external" && typeof v.url === "string" && v.url) return { kind: "external", url: v.url, openInNewTab: v.openInNewTab === true };
  return null;
}

// ---- normalisation -----------------------------------------------------------------------------------

const marksOf = (run: RichTextRun): Marks => ({ bold: run.bold === true, italic: run.italic === true, underline: run.underline === true });
const sameMarks = (a: Marks, b: Marks) => a.bold === b.bold && a.italic === b.italic && a.underline === b.underline;

function normalizeRuns(runs: readonly RichTextRun[]): RichTextRun[] {
  const out: RichTextRun[] = [];
  for (const run of runs) {
    const text = cleanRunText(run.text ?? "");
    if (!text) continue;
    const marks = marksOf(run);
    const last = out[out.length - 1];
    if (last && sameMarks(marksOf(last), marks)) last.text += text;
    else out.push({ text, ...marks });
  }
  return out;
}

function normalizeInlines(inlines: readonly RichInline[] | undefined): RichInline[] {
  const out: RichInline[] = [];
  for (const inline of inlines ?? []) {
    if (inline.kind === "br") {
      out.push({ kind: "br" });
    } else if (inline.kind === "link") {
      const target = toLinkTarget(inline.target);
      const runs = normalizeRuns(inline.runs ?? []);
      if (!runs.length) continue;
      if (!target) {
        out.push(...runs.map((r): RichInline => ({ kind: "text", ...r })));
        continue;
      }
      out.push({ kind: "link", target, runs });
    } else {
      const [run] = normalizeRuns([inline]);
      if (!run) continue;
      const last = out[out.length - 1];
      if (last && last.kind === "text" && sameMarks(marksOf(last), marksOf(run))) last.text += run.text;
      else out.push({ kind: "text", ...run });
    }
  }
  return out;
}

const clampLevel = (level: number) => Math.min(4, Math.max(2, Math.round(Number(level) || 2)));

function normalizeBlock(block: RichBlock, depth: number, maxDepth: number): RichBlock[] {
  switch (block.kind) {
    case "p":
      return [{ kind: "p", inlines: normalizeInlines(block.inlines) }];
    case "quote":
      return [{ kind: "quote", inlines: normalizeInlines(block.inlines) }];
    case "h":
      return [{ kind: "h", level: clampLevel(block.level), inlines: normalizeInlines(block.inlines) }];
    case "list": {
      const listDepth = depth + 1;
      const items = (block.items ?? []).map((item) => normalizeItem(item, listDepth, maxDepth));
      if (listDepth > maxDepth) return items.flat();
      return items.length ? [{ kind: "list", ordered: block.ordered === true, items }] : [];
    }
    default:
      return [];
  }
}

/** A list item holds only paragraphs and nested lists, and is never empty. */
function normalizeItem(item: readonly RichBlock[], listDepth: number, maxDepth: number): RichBlock[] {
  const blocks = item.flatMap((b) =>
    b.kind === "list"
      ? normalizeBlock(b, listDepth, maxDepth).map((x) => (x.kind === "list" ? x : toParagraph(x)))
      : normalizeBlock(b, listDepth, maxDepth).map(toParagraph)
  );
  return blocks.length ? blocks : [{ kind: "p", inlines: [] }];
}

const toParagraph = (block: RichBlock): RichBlock =>
  block.kind === "list" ? block : { kind: "p", inlines: "inlines" in block ? block.inlines ?? [] : [] };

/**
 * The canonical form this builder sends: explicit marks, adjacent same-mark runs merged, empty runs
 * and text-less links dropped, heading levels 2-4, lists no deeper than `maxDepth`, no empty items.
 */
export function normalizeRichText(doc: RichTextDocument | null | undefined, maxDepth = MAX_RICH_TEXT_LIST_DEPTH): RichTextDocument {
  return { blocks: (doc?.blocks ?? []).flatMap((b) => normalizeBlock(b, 0, maxDepth)) };
}

/** Nodes as the server counts them: every block, every inline, and every run inside a link. */
export function countRichNodes(doc: RichTextDocument | null | undefined): number {
  const inlines = (list: readonly RichInline[] | undefined) =>
    (list ?? []).reduce((n, i) => n + 1 + (i.kind === "link" ? (i.runs ?? []).length : 0), 0);
  const block = (b: RichBlock): number =>
    1 + (b.kind === "list" ? (b.items ?? []).reduce((n, item) => n + item.reduce((m, x) => m + block(x), 0), 0) : inlines(b.inlines));
  return (doc?.blocks ?? []).reduce((n, b) => n + block(b), 0);
}

export function isRichTextEmpty(doc: RichTextDocument | null | undefined): boolean {
  const hasText = (b: RichBlock): boolean =>
    b.kind === "list" ? (b.items ?? []).some((item) => item.some(hasText)) : (b.inlines ?? []).some((i) => i.kind !== "br");
  return !(doc?.blocks ?? []).some(hasText);
}

/** The visible text (used for summaries), paragraphs separated by blank lines. */
export function richTextToPlain(doc: RichTextDocument | null | undefined): string {
  const inline = (list: readonly RichInline[] | undefined) =>
    (list ?? []).map((i) => (i.kind === "br" ? "\n" : i.kind === "link" ? (i.runs ?? []).map((r) => r.text).join("") : i.text)).join("");
  const block = (b: RichBlock): string =>
    b.kind === "list" ? (b.items ?? []).map((item) => item.map(block).join("\n")).join("\n") : inline(b.inlines);
  return (doc?.blocks ?? []).map(block).join("\n\n");
}

// ---- model -> editor HTML ------------------------------------------------------------------------------

const escapeText = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escapeAttr = (s: string) => escapeText(s).replace(/"/g, "&quot;");

function runHtml(run: RichTextRun): string {
  let html = escapeText(run.text);
  if (run.underline) html = `<u>${html}</u>`;
  if (run.italic) html = `<em>${html}</em>`;
  if (run.bold) html = `<strong>${html}</strong>`;
  return html;
}

/** The inline content of a block; an empty block shows one `<br>`, a trailing `<br>` gets the browser's extra one. */
function inlinesHtml(inlines: readonly RichInline[] | undefined): string {
  const list = inlines ?? [];
  const body = list
    .map((i) => (i.kind === "br" ? "<br>" : i.kind === "link" ? `<a href="${escapeAttr(encodeLinkHref(i.target))}">${(i.runs ?? []).map(runHtml).join("")}</a>` : runHtml(i)))
    .join("");
  if (!list.length || list[list.length - 1].kind === "br") return body + "<br>";
  return body;
}

function blockHtml(block: RichBlock): string {
  switch (block.kind) {
    case "p":
      return `<p>${inlinesHtml(block.inlines)}</p>`;
    case "h": {
      const level = clampLevel(block.level);
      return `<h${level}>${inlinesHtml(block.inlines)}</h${level}>`;
    }
    case "quote":
      return `<blockquote>${inlinesHtml(block.inlines)}</blockquote>`;
    case "list": {
      const tag = block.ordered ? "ol" : "ul";
      const items = (block.items ?? []).map((item) => {
        const [first, ...rest] = item;
        const head = first && first.kind !== "list" ? inlinesHtml(first.inlines) : first ? blockHtml(first) : "<br>";
        return `<li>${head}${rest.map(blockHtml).join("")}</li>`;
      });
      return `<${tag}>${items.join("")}</${tag}>`;
    }
    default:
      return "";
  }
}

export function richTextToHtml(doc: RichTextDocument | null | undefined): string {
  const blocks = normalizeRichText(doc).blocks;
  return blocks.length ? blocks.map(blockHtml).join("") : "<p><br></p>";
}

// ---- editor DOM -> model ---------------------------------------------------------------------------------

/** The slice of the DOM the parser reads (a real `Node` satisfies it). */
export interface RichDomNode {
  nodeType: number;
  nodeName: string;
  textContent: string | null;
  childNodes: ArrayLike<RichDomNode>;
  getAttribute?: (name: string) => string | null;
}

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;
const BLOCK_TAGS = new Set(["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "UL", "OL", "LI", "PRE", "SECTION", "ARTICLE", "HEADER", "FOOTER", "ASIDE", "NAV", "TABLE", "FIGURE"]);
const LIST_TAGS = new Set(["UL", "OL"]);

const tagOf = (node: RichDomNode) => node.nodeName.toUpperCase();
const attr = (node: RichDomNode, name: string) => (node.getAttribute ? node.getAttribute(name) : null);
const childrenOf = (node: RichDomNode) => Array.from(node.childNodes);
const isBlock = (node: RichDomNode) => node.nodeType === ELEMENT_NODE && BLOCK_TAGS.has(tagOf(node));
/** Formatting whitespace between blocks (a text node that is only whitespace and holds a newline). */
const isLayoutWhitespace = (node: RichDomNode) => node.nodeType === TEXT_NODE && /^\s*$/.test(node.textContent ?? "") && /[\n\r]/.test(node.textContent ?? "");

function marksFor(node: RichDomNode, marks: Marks): Marks {
  const tag = tagOf(node);
  const next = { ...marks };
  if (tag === "B" || tag === "STRONG") next.bold = true;
  if (tag === "I" || tag === "EM") next.italic = true;
  if (tag === "U" || tag === "INS") next.underline = true;
  const style = (attr(node, "style") ?? "").toLowerCase();
  if (style) {
    if (/font-weight\s*:\s*(bold|bolder|[6-9]00)/.test(style)) next.bold = true;
    if (/font-weight\s*:\s*(normal|[1-5]00)/.test(style)) next.bold = false;
    if (/font-style\s*:\s*italic/.test(style)) next.italic = true;
    if (/text-decoration[a-z-]*\s*:[^;]*underline/.test(style)) next.underline = true;
  }
  return next;
}

/** Appends a node's inline content (runs, links, breaks) to `out`. */
function collectInline(node: RichDomNode, marks: Marks, out: RichInline[]): void {
  if (node.nodeType === TEXT_NODE) {
    const text = cleanRunText(node.textContent ?? "");
    if (text) out.push({ kind: "text", text, ...marks });
    return;
  }
  if (node.nodeType !== ELEMENT_NODE) return;
  const tag = tagOf(node);
  if (tag === "BR") {
    out.push({ kind: "br" });
    return;
  }
  if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEMPLATE") return;
  const inner = marksFor(node, marks);
  if (tag === "A") {
    const target = decodeLinkHref(attr(node, "href"));
    const content: RichInline[] = [];
    for (const child of childrenOf(node)) collectInline(child, inner, content);
    if (!target) {
      out.push(...content.map((i) => (i.kind === "link" ? i.runs.map((r) => ({ ...r, kind: "text" as const })) : [i])).flat());
      return;
    }
    // A link holds runs only: a break inside it ends one link and starts another to the same place.
    let runs: RichTextRun[] = [];
    const flush = () => {
      if (runs.length) out.push({ kind: "link", target, runs });
      runs = [];
    };
    for (const i of content) {
      if (i.kind === "br") {
        flush();
        out.push({ kind: "br" });
      } else if (i.kind === "link") runs.push(...i.runs);
      else runs.push({ kind: "text", text: i.text, bold: i.bold, italic: i.italic, underline: i.underline });
    }
    flush();
    return;
  }
  for (const child of childrenOf(node)) collectInline(child, inner, out);
}

/** Collects inline content, dropping the one trailing `<br>` a browser keeps at the end of a block. */
class InlineBuffer {
  items: RichInline[] = [];
  touched = false;
  add(node: RichDomNode) {
    this.touched = true;
    collectInline(node, NO_MARKS, this.items);
  }
  take(): RichInline[] | null {
    if (!this.touched) return null;
    const items = this.items;
    if (items.length && items[items.length - 1].kind === "br") items.pop();
    this.items = [];
    this.touched = false;
    return items;
  }
}

type InlineBlockMaker = (inlines: RichInline[]) => RichBlock;
const paragraph: InlineBlockMaker = (inlines) => ({ kind: "p", inlines });

/** A container's children as blocks: inline runs become `make(...)` blocks, block children recurse. */
function parseContainer(node: RichDomNode, make: InlineBlockMaker, depth: number, maxDepth: number): RichBlock[] {
  const blocks: RichBlock[] = [];
  const buffer = new InlineBuffer();
  const flush = () => {
    const inlines = buffer.take();
    if (inlines) blocks.push(make(inlines));
  };
  for (const child of childrenOf(node)) {
    if (isLayoutWhitespace(child)) continue;
    if (isBlock(child)) {
      flush();
      blocks.push(...parseBlock(child, make, depth, maxDepth));
    } else {
      buffer.add(child);
    }
  }
  flush();
  return blocks;
}

function headingLevel(tag: string): number {
  const n = Number(tag.slice(1));
  return clampLevel(n <= 2 ? 2 : n);
}

function parseBlock(node: RichDomNode, inherited: InlineBlockMaker, depth: number, maxDepth: number): RichBlock[] {
  const tag = tagOf(node);
  if (/^H[1-6]$/.test(tag)) {
    const level = headingLevel(tag);
    return parseContainer(node, (inlines) => ({ kind: "h", level, inlines }), depth, maxDepth);
  }
  if (tag === "BLOCKQUOTE") return parseContainer(node, (inlines) => ({ kind: "quote", inlines }), depth, maxDepth);
  if (LIST_TAGS.has(tag)) return parseList(node, depth + 1, maxDepth);
  if (tag === "LI") return parseListItem(node, depth, maxDepth);
  // p, div and friends: a paragraph (or whatever the enclosing heading/quote makes of it).
  return parseContainer(node, inherited, depth, maxDepth);
}

/** A list at `listDepth` (1 = top level); deeper than allowed, its items are lifted into the parent as paragraphs. */
function parseList(node: RichDomNode, listDepth: number, maxDepth: number): RichBlock[] {
  const items: RichBlock[][] = [];
  for (const child of childrenOf(node)) {
    if (isLayoutWhitespace(child)) continue;
    const tag = child.nodeType === ELEMENT_NODE ? tagOf(child) : "";
    if (tag === "LI") {
      items.push(parseListItem(child, listDepth, maxDepth));
    } else if (LIST_TAGS.has(tag)) {
      // A list directly inside a list (what "indent" makes in some browsers) belongs to the previous item.
      const nested = parseList(child, listDepth + 1, maxDepth);
      if (items.length) items[items.length - 1].push(...nested);
      else items.push(nested.length ? nested : [{ kind: "p", inlines: [] }]);
    } else {
      const inlines: RichInline[] = [];
      collectInline(child, NO_MARKS, inlines);
      if (inlines.length) items.push([{ kind: "p", inlines }]);
    }
  }
  const clean = items.map((item) => (item.length ? item : [{ kind: "p", inlines: [] } as RichBlock]));
  if (listDepth > maxDepth) return clean.flat().flatMap((b) => (b.kind === "list" ? b.items.flat() : [b]));
  if (!clean.length) return [];
  return [{ kind: "list", ordered: tagOf(node) === "OL", items: clean }];
}

/** A list item: its leading inline content is the first paragraph; only paragraphs and nested lists are kept. */
function parseListItem(node: RichDomNode, listDepth: number, maxDepth: number): RichBlock[] {
  const blocks: RichBlock[] = [];
  const buffer = new InlineBuffer();
  const flush = () => {
    const inlines = buffer.take();
    if (inlines) blocks.push({ kind: "p", inlines });
  };
  for (const child of childrenOf(node)) {
    if (isLayoutWhitespace(child)) continue;
    const tag = child.nodeType === ELEMENT_NODE ? tagOf(child) : "";
    if (LIST_TAGS.has(tag)) {
      flush();
      blocks.push(...parseList(child, listDepth + 1, maxDepth));
    } else if (isBlock(child)) {
      flush();
      blocks.push(...parseContainer(child, paragraph, listDepth, maxDepth).map(toParagraph));
    } else {
      buffer.add(child);
    }
  }
  flush();
  return blocks.length ? blocks : [{ kind: "p", inlines: [] }];
}

/** Reads the editor's DOM back into the server's model (normalised, ready to send). */
export function parseRichDom(root: RichDomNode, maxDepth = MAX_RICH_TEXT_LIST_DEPTH): RichTextDocument {
  const blocks = parseContainer(root, paragraph, 0, maxDepth);
  const doc = normalizeRichText({ blocks }, maxDepth);
  // A lone empty paragraph is the editor's empty state, not content.
  return isRichTextEmpty(doc) && doc.blocks.every((b) => b.kind === "p") ? EMPTY_RICH_TEXT : doc;
}
