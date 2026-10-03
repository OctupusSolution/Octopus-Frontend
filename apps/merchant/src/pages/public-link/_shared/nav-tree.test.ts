import { describe, expect, it } from "vitest";
import type { NavItemDto } from "@octopus/api-client";
import { addChild, demoteItem, moveChild, navigationInput, promoteChild, removeChild, validateNavigation } from "./nav-tree";

const page = (pageId: string, extra: Partial<NavItemDto> = {}): NavItemDto => ({
  target: { kind: "page", pageId },
  showInHeader: true,
  showInDrawer: true,
  children: [],
  ...extra,
});
const LIMITS = { maxTopLevel: 3, maxChildren: 2 };

describe("navigation children mapping", () => {
  it("writes one level of children with trimmed labels and targets reduced to their kind", () => {
    const items: NavItemDto[] = [
      {
        id: "g1",
        label: { en: "  More ", ar: " " },
        target: null,
        showInHeader: true,
        showInDrawer: false,
        children: [
          page("about", { id: "c1", label: { en: "About us" }, target: { kind: "page", pageId: "about", url: "stale" } }),
          { label: { en: "Blog" }, target: { kind: "external", url: " https://blog.example.com " }, showInHeader: true, showInDrawer: true, children: [page("x")] },
        ],
      },
    ];
    expect(navigationInput(items, null)).toEqual({
      items: [
        {
          id: "g1",
          label: { en: "More" },
          target: null,
          icon: null,
          showInHeader: true,
          showInDrawer: false,
          children: [
            { id: "c1", label: { en: "About us" }, target: { kind: "page", pageId: "about" }, icon: null, showInHeader: true, showInDrawer: true, children: [] },
            { label: { en: "Blog" }, target: { kind: "external", url: "https://blog.example.com", openInNewTab: true }, icon: null, showInHeader: true, showInDrawer: true, children: [] },
          ],
        },
      ],
      options: null,
    });
  });

  it("refuses what the backend's navigation validator refuses", () => {
    const codes = (items: NavItemDto[]) => validateNavigation(items, LIMITS).map((p) => [p.code, p.index, p.child]);
    expect(codes([page("a"), page("b"), page("c")])).toEqual([]);
    expect(codes([page("a"), page("b"), page("c"), page("d")])).toEqual([["publiclink.navigation.too-many-items", null, null]]);
    expect(codes([page("a", { children: [page("b"), page("c"), page("d")] })])).toEqual([["publiclink.navigation.too-many-children", 0, null]]);
    expect(codes([page("a", { children: [page("b", { children: [page("c")] })] })])).toEqual([["publiclink.navigation.too-deep", 0, 0]]);
    expect(codes([{ label: { en: "Group" }, target: null, showInHeader: true, showInDrawer: true, children: [] }])).toEqual([["publiclink.navigation.target-required", 0, null]]);
    expect(codes([{ target: { kind: "external", url: "http://x.example" }, showInHeader: true, showInDrawer: true, children: [] }])).toEqual([
      ["publiclink.link.url-invalid", 0, null],
      ["publiclink.navigation.label-required", 0, null],
    ]);
    expect(codes([page("a", { label: { en: "x".repeat(41) } })])).toEqual([["publiclink.text.too-long", 0, null]]);
  });

  it("adds, moves, removes, promotes and demotes children", () => {
    let items: NavItemDto[] = [page("a"), page("b")];
    items = addChild(items, 0, page("c", { children: [page("ignored")] }));
    items = addChild(items, 0, page("d"));
    expect(items[0].children?.map((c) => c.target?.pageId)).toEqual(["c", "d"]);
    expect(items[0].children?.[0].children).toEqual([]);
    items = moveChild(items, 0, 1, 0);
    expect(items[0].children?.map((c) => c.target?.pageId)).toEqual(["d", "c"]);
    items = promoteChild(items, 0, 0);
    expect(items.map((i) => i.target?.pageId)).toEqual(["a", "d", "b"]);
    items = demoteItem(items, 2, 0);
    expect(items.map((i) => i.target?.pageId)).toEqual(["a", "d"]);
    expect(items[0].children?.map((c) => c.target?.pageId)).toEqual(["c", "b"]);
    items = removeChild(items, 0, 0);
    expect(items[0].children?.map((c) => c.target?.pageId)).toEqual(["b"]);
    // An item that has children cannot become a child (only one level).
    expect(demoteItem(items, 0, 1)).toEqual(items);
  });
});
