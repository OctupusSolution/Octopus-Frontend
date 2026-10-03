// Navigation items with one level of children (US-019 FR-033), as `PUT /draft/navigation` takes
// them. Mirrors the backend's `SiteNavigation.Validate` so the builder refuses locally what the
// server would refuse, and names the same codes:
//   - at most `maxNavTopLevelItems` top-level items and `maxNavChildren` children per item;
//   - only one level: a child never has children of its own;
//   - an item with no target is a group and needs at least one child;
//   - an outside (https) link needs a label; labels are at most MAX_NAV_LABEL characters.
// Navigation accepts page, anchor and external targets only.
import type { LinkTargetDto, NavItemDto, ReplaceNavigationInput, NavigationOptionsDto } from "@octopus/api-client";

/** Backend default `PublicLink:Limits:MaxNavLabel`; not exposed by `GET /catalogues`. */
export const MAX_NAV_LABEL = 40;

export interface NavLimits {
  maxTopLevel: number;
  maxChildren: number;
  maxLabel?: number;
}

export type NavProblemCode =
  | "publiclink.navigation.too-many-items"
  | "publiclink.navigation.too-many-children"
  | "publiclink.navigation.too-deep"
  | "publiclink.navigation.target-required"
  | "publiclink.navigation.label-required"
  | "publiclink.text.too-long"
  | "publiclink.link.url-invalid";

export interface NavProblem {
  code: NavProblemCode;
  /** Top-level index. */
  index: number | null;
  /** Child index under `index`, when the problem is a child's. */
  child: number | null;
}

const isHttpsUrl = (url: string | null | undefined) => {
  if (!url) return false;
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" && Boolean(u.hostname) && !u.username && !/\s/.test(url.trim());
  } catch {
    return false;
  }
};

const hasLabel = (item: NavItemDto) => Object.values(item.label ?? {}).some((v) => v && v.trim());

function checkItem(item: NavItemDto, index: number, child: number | null, limits: NavLimits, out: NavProblem[]) {
  const at = (code: NavProblemCode) => out.push({ code, index, child });
  const maxLabel = limits.maxLabel ?? MAX_NAV_LABEL;
  if (Object.values(item.label ?? {}).some((v) => (v ?? "").length > maxLabel)) at("publiclink.text.too-long");
  const children = item.children ?? [];
  if (child !== null && children.length > 0) at("publiclink.navigation.too-deep");
  if (child === null && children.length > limits.maxChildren) at("publiclink.navigation.too-many-children");
  if (!item.target) {
    if (children.length === 0) at("publiclink.navigation.target-required");
  } else if (String(item.target.kind).toLowerCase() === "external") {
    if (!isHttpsUrl(item.target.url)) at("publiclink.link.url-invalid");
    if (!hasLabel(item)) at("publiclink.navigation.label-required");
  }
  if (child === null) children.forEach((c, ci) => checkItem(c, index, ci, limits, out));
}

/** Every problem the server would refuse the navigation for (empty = savable). */
export function validateNavigation(items: readonly NavItemDto[], limits: NavLimits): NavProblem[] {
  const out: NavProblem[] = [];
  if (items.length > limits.maxTopLevel) out.push({ code: "publiclink.navigation.too-many-items", index: null, child: null });
  items.forEach((item, i) => checkItem(item, i, null, limits, out));
  return out;
}

/** Only the members a navigation target carries (a page, an anchor or an outside address). */
export function cleanTarget(target: LinkTargetDto | null | undefined): LinkTargetDto | null {
  if (!target) return null;
  const kind = String(target.kind).toLowerCase();
  if (kind === "page") return { kind, pageId: target.pageId ?? null };
  if (kind === "anchor") return { kind, pageId: target.pageId ?? null, sectionId: target.sectionId ?? null };
  if (kind === "external") return { kind, url: (target.url ?? "").trim(), openInNewTab: target.openInNewTab ?? true };
  return { ...target, kind };
}

function cleanLabel(label: Record<string, string> | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [lang, value] of Object.entries(label ?? {})) {
    const trimmed = (value ?? "").trim();
    if (trimmed) out[lang] = trimmed;
  }
  return out;
}

function toDto(item: NavItemDto, allowChildren: boolean): NavItemDto {
  return {
    ...(item.id ? { id: item.id } : {}),
    label: cleanLabel(item.label),
    target: cleanTarget(item.target),
    icon: item.icon ?? null,
    showInHeader: item.showInHeader,
    showInDrawer: item.showInDrawer,
    children: allowChildren ? (item.children ?? []).map((c) => toDto(c, false)) : [],
  };
}

/** The whole-navigation write: labels trimmed (blank = the page's own title), targets reduced to their kind's members, one level of children. */
export function navigationInput(items: readonly NavItemDto[], options: NavigationOptionsDto | null): ReplaceNavigationInput {
  return { items: items.map((item) => toDto(item, true)), options };
}

// ---- tree edits (pure, return new arrays) -----------------------------------------------------------

const replaceAt = <T,>(list: readonly T[], index: number, value: T): T[] => list.map((x, i) => (i === index ? value : x));

export function addChild(items: readonly NavItemDto[], parent: number, child: NavItemDto): NavItemDto[] {
  const p = items[parent];
  if (!p) return [...items];
  return replaceAt(items, parent, { ...p, children: [...(p.children ?? []), { ...child, children: [] }] });
}

export function updateChild(items: readonly NavItemDto[], parent: number, index: number, child: NavItemDto): NavItemDto[] {
  const p = items[parent];
  if (!p) return [...items];
  return replaceAt(items, parent, { ...p, children: replaceAt(p.children ?? [], index, { ...child, children: [] }) });
}

export function removeChild(items: readonly NavItemDto[], parent: number, index: number): NavItemDto[] {
  const p = items[parent];
  if (!p) return [...items];
  return replaceAt(items, parent, { ...p, children: (p.children ?? []).filter((_c, i) => i !== index) });
}

export function moveChild(items: readonly NavItemDto[], parent: number, from: number, to: number): NavItemDto[] {
  const p = items[parent];
  const children = [...(p?.children ?? [])];
  if (!p || from < 0 || from >= children.length || to < 0 || to >= children.length) return [...items];
  const [moved] = children.splice(from, 1);
  children.splice(to, 0, moved);
  return replaceAt(items, parent, { ...p, children });
}

/** A child becomes a top-level item right after its parent. */
export function promoteChild(items: readonly NavItemDto[], parent: number, index: number): NavItemDto[] {
  const p = items[parent];
  const child = p?.children?.[index];
  if (!p || !child) return [...items];
  const next = removeChild(items, parent, index);
  next.splice(parent + 1, 0, { ...child, children: [] });
  return next;
}

/** A childless top-level item moves under another top-level item (the end of its children). */
export function demoteItem(items: readonly NavItemDto[], index: number, parent: number): NavItemDto[] {
  const item = items[index];
  if (!item || index === parent || !items[parent] || (item.children ?? []).length > 0) return [...items];
  const withChild = addChild(items, parent, item);
  return withChild.filter((_x, i) => i !== index);
}
