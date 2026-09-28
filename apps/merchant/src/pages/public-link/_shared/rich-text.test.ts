import { describe, expect, it } from "vitest";
import type { RichTextDocument } from "@octopus/api-client";
import {
  cleanRunText,
  countRichNodes,
  decodeLinkHref,
  encodeLinkHref,
  normalizeRichText,
  parseRichDom,
  richTextToHtml,
  type RichDomNode,
} from "./rich-text";

// A tiny HTML reader for tests (no DOM in the node test environment): enough for the editor's own
// markup and what browsers' editing commands produce — tags, attributes, text, &-entities, void <br>.
function parseHtml(html: string): RichDomNode {
  const root: RichDomNode & { childNodes: RichDomNode[] } = { nodeType: 1, nodeName: "DIV", textContent: null, childNodes: [], getAttribute: () => null };
  const stack: (RichDomNode & { childNodes: RichDomNode[] })[] = [root];
  const decode = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
  const re = /<\/?([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const top = stack[stack.length - 1];
    if (m[3] !== undefined) {
      top.childNodes.push({ nodeType: 3, nodeName: "#text", textContent: decode(m[3]), childNodes: [] });
      continue;
    }
    const tag = m[1].toUpperCase();
    if (m[0].startsWith("</")) {
      while (stack.length > 1 && stack.pop()!.nodeName !== tag);
      continue;
    }
    const attrs: Record<string, string> = {};
    for (const a of m[2].matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) attrs[a[1].toLowerCase()] = decode(a[2]);
    const el: RichDomNode & { childNodes: RichDomNode[] } = { nodeType: 1, nodeName: tag, textContent: null, childNodes: [], getAttribute: (n) => attrs[n] ?? null };
    top.childNodes.push(el);
    if (tag !== "BR") stack.push(el);
  }
  return root;
}

const run = (text: string, marks: Partial<{ bold: boolean; italic: boolean; underline: boolean }> = {}) => ({
  kind: "text" as const,
  text,
  bold: marks.bold ?? false,
  italic: marks.italic ?? false,
  underline: marks.underline ?? false,
});

const RICH: RichTextDocument = {
  blocks: [
    { kind: "h", level: 2, inlines: [run("Our story")] },
    {
      kind: "p",
      inlines: [
        run("Fresh "),
        run("fish", { bold: true }),
        run(" & ", { italic: true }),
        run("<chips>", { bold: true, italic: true, underline: true }),
        { kind: "br" },
        { kind: "link", target: { kind: "page", pageId: "11111111-1111-1111-1111-111111111111" }, runs: [{ text: "see the menu", bold: false, italic: false, underline: true }] },
        run(" or "),
        { kind: "link", target: { kind: "external", url: "https://example.com/a?b=1&c=2", openInNewTab: true }, runs: [{ text: "visit", bold: true, italic: false, underline: false }] },
      ],
    },
    { kind: "p", inlines: [] },
    { kind: "quote", inlines: [run("Best in town"), { kind: "br" }] },
    { kind: "h", level: 4, inlines: [run("Hours")] },
    {
      kind: "list",
      ordered: false,
      items: [
        [{ kind: "p", inlines: [run("Mon–Fri")] }],
        [
          { kind: "p", inlines: [run("Weekends")] },
          { kind: "list", ordered: true, items: [[{ kind: "p", inlines: [run("Sat")] }], [{ kind: "p", inlines: [] }, { kind: "p", inlines: [run("Sun")] }]] },
          { kind: "p", inlines: [run("closing early")] },
        ],
      ],
    },
    {
      kind: "p",
      inlines: [{ kind: "link", target: { kind: "anchor", pageId: "22222222-2222-2222-2222-222222222222", sectionId: "33333333-3333-3333-3333-333333333333" }, runs: [{ text: "jump", bold: false, italic: false, underline: false }] }],
    },
    { kind: "p", inlines: [run("مرحبا بكم")] },
  ],
};

describe("rich text round trip", () => {
  it("renders to editor HTML and reads back the identical tree", () => {
    const html = richTextToHtml(RICH);
    expect(parseRichDom(parseHtml(html))).toEqual(normalizeRichText(RICH));
  });

  it("is stable over repeated round trips", () => {
    const once = parseRichDom(parseHtml(richTextToHtml(RICH)));
    const twice = parseRichDom(parseHtml(richTextToHtml(once)));
    expect(twice).toEqual(once);
  });

  it("reads server documents whose default marks were omitted (canonical form)", () => {
    const stored = { blocks: [{ kind: "p", inlines: [{ kind: "text", text: "a" }, { kind: "text", text: "b", bold: true }] }] } as RichTextDocument;
    expect(normalizeRichText(stored)).toEqual({ blocks: [{ kind: "p", inlines: [run("a"), run("b", { bold: true })] }] });
    expect(parseRichDom(parseHtml(richTextToHtml(stored)))).toEqual(normalizeRichText(stored));
  });

  it("accepts what browsers' editing commands produce", () => {
    const html =
      'first line<div>second <b>bold</b> <span style="font-style: italic">it</span></div><div><br></div>' +
      "<h1>Big</h1><h6>small</h6><ul><li>one</li><ul><li>nested</li><ul><li>too deep</li></ul></ul><li><br></li></ul>";
    expect(parseRichDom(parseHtml(html))).toEqual({
      blocks: [
        { kind: "p", inlines: [run("first line")] },
        { kind: "p", inlines: [run("second "), run("bold", { bold: true }), run(" "), run("it", { italic: true })] },
        { kind: "p", inlines: [] },
        { kind: "h", level: 2, inlines: [run("Big")] },
        { kind: "h", level: 4, inlines: [run("small")] },
        {
          kind: "list",
          ordered: false,
          items: [
            [{ kind: "p", inlines: [run("one")] }, { kind: "list", ordered: false, items: [[{ kind: "p", inlines: [run("nested")] }, { kind: "p", inlines: [run("too deep")] }]] }],
            [{ kind: "p", inlines: [] }],
          ],
        },
      ],
    });
  });

  it("never sends what the validator refuses", () => {
    expect(cleanRunText("a\nb\tc\u0007d\u200Ee\u200Df")).toBe("a b cde\u200Df");
    // Unknown link schemes are unwrapped, email/phone links are not rich-text links.
    const doc = parseRichDom(parseHtml('<p><a href="javascript:alert(1)">x</a><a href="mailto:a@b.co">y</a><a href="#pl-link:%7B%22kind%22%3A%22email%22%7D">z</a></p>'));
    expect(doc).toEqual({ blocks: [{ kind: "p", inlines: [run("xyz")] }] });
    // A heading level outside 2-4 is clamped; an empty editor is an empty document.
    expect(normalizeRichText({ blocks: [{ kind: "h", level: 7, inlines: [run("x")] }] }).blocks[0]).toMatchObject({ level: 4 });
    expect(parseRichDom(parseHtml("<p><br></p>"))).toEqual({ blocks: [] });
  });

  it("encodes link targets losslessly and counts nodes like the server", () => {
    const target = { kind: "anchor" as const, pageId: "p", sectionId: "s" };
    expect(decodeLinkHref(encodeLinkHref(target))).toEqual(target);
    expect(decodeLinkHref("https://example.com")).toEqual({ kind: "external", url: "https://example.com", openInNewTab: true });
    expect(countRichNodes({ blocks: [{ kind: "p", inlines: [run("a"), { kind: "link", target, runs: [{ text: "b" }, { text: "c", bold: true }] }] }] })).toBe(5);
  });
});
