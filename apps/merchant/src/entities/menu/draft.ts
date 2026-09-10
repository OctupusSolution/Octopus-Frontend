// Pure transforms over one Menu while the wizard is editing it — the draft
// counterpart to library.ts, which transforms a collection of them.
//
// Same posture and for the same reason: no reducer, no mutation, every export
// returning a fresh Menu. A wizard step can then hand its event straight to one
// of these and set the result, and the transitions are testable without
// mounting anything.
//
// Ids and clocks are injected by the caller throughout. Nothing here reads
// Date.now() or crypto, so every test asserts exact values.

import {
  WEEKDAYS,
  type Item,
  type Menu,
  type ModifierGroup,
  type ModifierOption,
  type Section,
  type SectionKind,
} from "./menu";

/** Every menu owns exactly one offers section, created with the menu and never
 *  deleted — the spec settled that rather than letting merchants make several.
 *  It always sorts last, so new sections splice in before it. */
export const OFFERS_SECTION_ID = "offers";

export function blankSection(
  id: string,
  kind: SectionKind,
  name: string,
  image: string | null
): Section {
  return {
    id,
    kind,
    name,
    image,
    description: "",
    visibility: "visible",
    displayStyle: "list",
    color: null,
    entries: [],
  };
}

export function blankItem(id: string, name: string): Item {
  return {
    id,
    name,
    shortName: name,
    description: "",
    sku: "",
    image: null,
    video: null,
    tags: [],
    status: "active",
    availability: { available: true, delivery: true, takeaway: true, dineIn: true },
    schedule: { mode: "all-day" },
    modifierGroups: [],
    pricing: { price: 0, vatRate: 0.15 },
    nutrition: { calories: null, protein: null, carb: null, fat: null },
    allergies: { allergens: [], note: "" },
  };
}

export function blankMenu(id: string, branchId: string, now: string): Menu {
  return {
    id,
    name: "",
    cover: null,
    // "pending" rather than "active": nothing has been published, and the
    // library's badge should say so the moment the draft appears there.
    status: "pending",
    branchId,
    sections: [blankSection(OFFERS_SECTION_ID, "offers", "Offers", null)],
    theme: {
      presetId: "elegant",
      navStyle: "top-bar",
      categoryStyle: "icon-text",
      cardStyle: "classic",
      itemDetails: "same-page",
      stickyAddToCart: true,
      showItemTags: true,
    },
    schedule: {
      type: "all-day",
      start: "00:00",
      end: "23:59",
      days: [...WEEKDAYS],
      timezone: "Asia/Riyadh",
      branchIds: [branchId],
      fallbackMenuId: null,
      allowPreorderOutsideSchedule: false,
    },
    channels: { pos: "pending", publicLink: "pending", tableQr: "pending" },
    updatedAt: now,
    publishedAt: null,
    version: 1,
  };
}

/* ----------------------------------------------------------------- sections */

export function addSection(menu: Menu, section: Section): Menu {
  const offersAt = menu.sections.findIndex((s) => s.id === OFFERS_SECTION_ID);
  const next = [...menu.sections];
  // Splice before Offers so it stays last however many sections are added.
  next.splice(offersAt === -1 ? next.length : offersAt, 0, section);
  return { ...menu, sections: next };
}

export function updateSection(menu: Menu, sectionId: string, patch: Partial<Section>): Menu {
  return {
    ...menu,
    sections: menu.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)),
  };
}

export function removeSection(menu: Menu, sectionId: string): Menu {
  // The offers section is part of the menu's shape, not the merchant's content.
  if (sectionId === OFFERS_SECTION_ID) return menu;
  return { ...menu, sections: menu.sections.filter((s) => s.id !== sectionId) };
}

export function moveSection(menu: Menu, from: number, to: number): Menu {
  const last = menu.sections.length - 1;
  if (from < 0 || to < 0 || from > last || to > last || from === to) return menu;
  const next = [...menu.sections];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return { ...menu, sections: next };
}

/* -------------------------------------------------------------------- items */

function mapSection(menu: Menu, sectionId: string, fn: (section: Section) => Section): Menu {
  return {
    ...menu,
    sections: menu.sections.map((s) => (s.id === sectionId ? fn(s) : s)),
  };
}

export function addItem(menu: Menu, sectionId: string, item: Item): Menu {
  return mapSection(menu, sectionId, (s) => ({ ...s, entries: [...s.entries, item] }));
}

export function updateItem(
  menu: Menu,
  sectionId: string,
  itemId: string,
  patch: Partial<Item>
): Menu {
  return mapSection(menu, sectionId, (s) => ({
    ...s,
    entries: s.entries.map((e) => (e.id === itemId ? ({ ...e, ...patch } as Item) : e)),
  }));
}

export function removeItem(menu: Menu, sectionId: string, itemId: string): Menu {
  return mapSection(menu, sectionId, (s) => ({
    ...s,
    entries: s.entries.filter((e) => e.id !== itemId),
  }));
}

export function duplicateItem(
  menu: Menu,
  sectionId: string,
  itemId: string,
  newId: string
): Menu {
  return mapSection(menu, sectionId, (s) => {
    const at = s.entries.findIndex((e) => e.id === itemId);
    if (at === -1) return s;
    const copy = { ...(s.entries[at] as Item), id: newId };
    const entries = [...s.entries];
    // Immediately after the original, so the copy appears where the merchant
    // was looking rather than at the bottom of a long list.
    entries.splice(at + 1, 0, copy);
    return { ...s, entries };
  });
}

export function addItemToSections(
  menu: Menu,
  itemId: string,
  fromSectionId: string,
  targetSectionIds: string[],
  newId: (index: number) => string
): Menu {
  const source = menu.sections
    .find((s) => s.id === fromSectionId)
    ?.entries.find((e) => e.id === itemId) as Item | undefined;
  if (!source) return menu;

  let next = menu;
  targetSectionIds.forEach((targetId, index) => {
    next = addItem(next, targetId, { ...source, id: newId(index) });
  });
  return next;
}

/* ---------------------------------------------------------------- modifiers */

function mapItem(
  menu: Menu,
  sectionId: string,
  itemId: string,
  fn: (item: Item) => Item
): Menu {
  return mapSection(menu, sectionId, (s) => ({
    ...s,
    entries: s.entries.map((e) => (e.id === itemId ? fn(e as Item) : e)),
  }));
}

function mapGroup(
  menu: Menu,
  sectionId: string,
  itemId: string,
  groupId: string,
  fn: (group: ModifierGroup) => ModifierGroup
): Menu {
  return mapItem(menu, sectionId, itemId, (item) => ({
    ...item,
    modifierGroups: item.modifierGroups.map((g) => (g.id === groupId ? fn(g) : g)),
  }));
}

export function addModifierGroup(
  menu: Menu,
  sectionId: string,
  itemId: string,
  group: ModifierGroup
): Menu {
  return mapItem(menu, sectionId, itemId, (item) => ({
    ...item,
    modifierGroups: [...item.modifierGroups, group],
  }));
}

export function updateModifierGroup(
  menu: Menu,
  sectionId: string,
  itemId: string,
  groupId: string,
  patch: Partial<ModifierGroup>
): Menu {
  return mapGroup(menu, sectionId, itemId, groupId, (g) => ({ ...g, ...patch }));
}

export function removeModifierGroup(
  menu: Menu,
  sectionId: string,
  itemId: string,
  groupId: string
): Menu {
  return mapItem(menu, sectionId, itemId, (item) => ({
    ...item,
    modifierGroups: item.modifierGroups.filter((g) => g.id !== groupId),
  }));
}

export function addModifierOption(
  menu: Menu,
  sectionId: string,
  itemId: string,
  groupId: string,
  option: ModifierOption
): Menu {
  return mapGroup(menu, sectionId, itemId, groupId, (g) => ({
    ...g,
    options: [...g.options, option],
  }));
}

export function updateModifierOption(
  menu: Menu,
  sectionId: string,
  itemId: string,
  groupId: string,
  optionId: string,
  patch: Partial<ModifierOption>
): Menu {
  return mapGroup(menu, sectionId, itemId, groupId, (g) => ({
    ...g,
    options: g.options.map((o) => (o.id === optionId ? { ...o, ...patch } : o)),
  }));
}

export function removeModifierOption(
  menu: Menu,
  sectionId: string,
  itemId: string,
  groupId: string,
  optionId: string
): Menu {
  return mapGroup(menu, sectionId, itemId, groupId, (g) => ({
    ...g,
    options: g.options.filter((o) => o.id !== optionId),
  }));
}

/** What the customer-view preview's "Total" line shows: the base price plus
 *  every option the item ships pre-selected. Derived, never stored — the
 *  frame's SAR 113 is 100 + Medium 8 + American 2 + Cheddar 3.
 *
 *  An option that is defaulted but unavailable contributes nothing: the
 *  customer cannot have it, so quoting them for it would be a lie. */
export function modifierTotal(item: Item): number {
  let total = item.pricing.price;
  for (const group of item.modifierGroups) {
    for (const option of group.options) {
      if (!option.isDefault || !option.available) continue;
      if (option.priceType === "add-amount") total += option.price;
      // "fixed" replaces the base rather than adding to it; "no-change" adds
      // nothing at all.
      if (option.priceType === "fixed") total = option.price;
    }
  }
  return total;
}
