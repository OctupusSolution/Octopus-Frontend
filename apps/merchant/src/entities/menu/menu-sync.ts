// Pushes the builder's local edits to the Menu API and pulls server state back.
//
// The builder keeps editing one local Menu; `pushMenu` diffs it against the
// last-saved copy and issues only the calls that changed something. Stage 2a
// covers the menu name and its sections. Section entries (items/offers), theme
// and schedule stay local until their own stages, and the offers section is
// local-only (one per menu, needs the offers entitlement).
import {
  archiveSection as archiveSectionApi,
  addModifierOption,
  createCatalogItem,
  createModifierGroup,
  createSection,
  deleteSection as deleteSectionApi,
  getCatalogItem,
  getCatalogSettings,
  getMenuTheme,
  updateMenuTheme,
  getModifierGroup,
  listSections,
  placeSectionEntries,
  removeModifierOption,
  removePlacement,
  reorderModifierOptions,
  reorderPlacements,
  reorderSections,
  setItemAvailability,
  setItemModifierGroups,
  setItemSchedule,
  setOptionAvailability,
  updateCatalogItem,
  updateModifierGroup,
  updateModifierOption,
  updateMenuDetails,
  updateSection as updateSectionApi,
  type AdvisoryDto,
  type AvailabilityScheduleDto,
  type CatalogItemResponse,
  type ModifierGroupResponse,
  type ModifierOptionResponse,
  type PriceEffectDto,
  type SectionResponse,
  type SectionSummaryResponse,
} from "@octopus/api-client";
import { isLocalMedia, knownMedia, mediaUrl, uploadMedia } from "@/shared/api/media";
import { OFFERS_SECTION_ID, blankItem } from "./draft";
import { pullOffers, pushOffers } from "./offers-sync";
import { WEEKDAYS } from "./menu";
import type { DisplayStyle, Item, ItemSchedule, Menu, MenuTheme, ModifierGroup, ModifierOption, Offer, Section, Weekday } from "./menu";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isServerId = (id: string) => UUID.test(id);

const key = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const loc = (s: string) => ({ en: s, ar: s });
const pick = (n: Record<string, string>) => n.en || n.ar || Object.values(n)[0] || "";

function toSection(row: SectionSummaryResponse, local?: Section): Section {
  const style = row.displayStyle.toLowerCase() as DisplayStyle;
  return {
    id: row.id,
    kind: row.kind.toLowerCase() === "offers" ? "offers" : "items",
    name: pick(row.name),
    image: local?.image ?? null,
    description: local?.description ?? "",
    visibility: row.isArchived ? "archived" : row.visibility.toLowerCase() === "hidden" ? "hidden" : "visible",
    displayStyle: ["list", "carousel", "grid"].includes(style) ? style : "list",
    color: local?.color ?? null,
    entries: local?.entries ?? [],
  };
}

const effectToServer = (o: ModifierOption, currency: string): PriceEffectDto =>
  o.priceType === "no-change"
    ? { kind: "NoChange", amount: null }
    : { kind: o.priceType === "fixed" ? "FixedPrice" : "AddAmount", amount: { amount: o.price, currency } };

function toOption(r: ModifierOptionResponse, local?: ModifierOption): ModifierOption {
  const kind = r.effect.kind.toLowerCase();
  return {
    id: r.id,
    name: pick(r.name),
    subLabel: local?.subLabel ?? "",
    priceType: kind === "fixedprice" ? "fixed" : kind === "addamount" ? "add-amount" : "no-change",
    price: r.effect.amount?.amount ?? 0,
    isDefault: r.isDefault,
    available: r.isAvailable,
  };
}

export function toGroup(r: ModifierGroupResponse, local?: ModifierGroup): ModifierGroup {
  const localOpts = new Map((local?.options ?? []).map((o) => [o.id, o]));
  return {
    id: r.id,
    name: pick(r.name),
    type: r.selectionMode.toLowerCase() === "single" ? "single" : "multi",
    customerLabel: pick(r.promptLabel),
    helpText: pick(r.helpText),
    min: r.minSelected,
    max: r.maxSelected ?? Math.max(r.options.length, 1),
    required: r.isRequired,
    showAsRadio: r.showAsRadio,
    options: [...r.options].sort((a, b) => a.position - b.position).map((o) => toOption(o, localOpts.get(o.id))),
  };
}

// ---- theme ---------------------------------------------------------------------
// Card/navigation/item-detail choices live on the menu's own theme in the API.
// Colours, logo and hero are still owned by the site draft (shared with the
// Public Link builder), so the API's copies of those are left as they are.

const NAV: Record<MenuTheme["navStyle"], string> = {
  "top-bar": "TopBar",
  "side-drawer": "SideDrawer",
  "bottom-bar": "BottomBar",
  "pill-scroll": "PillScroll",
};
const CATEGORY: Record<MenuTheme["categoryStyle"], string> = {
  "icon-text": "IconAndText",
  "text-only": "TextOnly",
  "icons-only": "IconOnly",
  "image-text": "ImageAndText",
};
const CARD: Record<MenuTheme["cardStyle"], string> = {
  classic: "Classic",
  "clean-minimal": "CleanMinimal",
  "image-top": "ImageTop",
  "image-left": "ImageLeft",
};
const DETAILS: Record<MenuTheme["itemDetails"], string> = {
  "same-page": "SamePage",
  overlay: "Overlay",
  "new-page": "NewPage",
};
const invert = <K extends string>(m: Record<K, string>) =>
  Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k])) as Record<string, K>;

function themeFromServer(local: MenuTheme, t: Awaited<ReturnType<typeof getMenuTheme>>): MenuTheme {
  return {
    ...local,
    navStyle: invert(NAV)[t.navigationStyle] ?? local.navStyle,
    categoryStyle: invert(CATEGORY)[t.sectionNavStyle] ?? local.categoryStyle,
    cardStyle: invert(CARD)[t.cardStyle] ?? local.cardStyle,
    itemDetails: invert(DETAILS)[t.itemDetailsBehavior] ?? local.itemDetails,
    stickyAddToCart: t.stickyPrimaryAction,
    showItemTags: t.showItemTags,
    presetId: t.presetCode ?? local.presetId,
    serverPresetCode: t.presetCode,
    titleFontCode: t.titleFontCode,
    bodyFontCode: t.bodyFontCode,
  };
}

async function pushTheme(businessId: string, menuId: string, theme: MenuTheme): Promise<void> {
  const current = await getMenuTheme(businessId, menuId);
  await updateMenuTheme(businessId, menuId, {
    businessId,
    menuId,
    presetCode: theme.serverPresetCode !== undefined ? theme.serverPresetCode : current.presetCode,
    logo: current.logo,
    hero: current.hero,
    heroText: current.heroText,
    heroSubtext: current.heroSubtext,
    titleFontCode: theme.titleFontCode !== undefined ? theme.titleFontCode : current.titleFontCode,
    bodyFontCode: theme.bodyFontCode !== undefined ? theme.bodyFontCode : current.bodyFontCode,
    primaryColor: current.primaryColor,
    lightColor: current.lightColor,
    accentColor: current.accentColor,
    darkColor: current.darkColor,
    navigationStyle: NAV[theme.navStyle],
    sectionNavStyle: CATEGORY[theme.categoryStyle],
    cardStyle: CARD[theme.cardStyle],
    itemDetailsBehavior: DETAILS[theme.itemDetails],
    stickyPrimaryAction: theme.stickyAddToCart,
    showItemTags: theme.showItemTags,
    expectedVersion: null,
  });
}

const isItem = (e: Item | { entries: unknown }): e is Item => "modifierGroups" in e;

// ---- item schedule, facts, advisories ---------------------------------------------

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function itemScheduleToApi(s: ItemSchedule): AvailabilityScheduleDto | null {
  if (s.mode === "all-day") return null;
  return {
    presetCode: null,
    windows: [{ days: s.days.map((d) => DAY_NAMES[WEEKDAYS.indexOf(d)]), start: s.start, end: s.end }],
    dateFrom: null,
    dateTo: null,
  };
}

export function itemScheduleFromApi(s: AvailabilityScheduleDto | null): ItemSchedule {
  const w = s?.windows[0];
  if (!w) return { mode: "all-day" };
  return {
    mode: "custom",
    start: w.start.slice(0, 5),
    end: w.end.slice(0, 5),
    days: w.days.map((d) => WEEKDAYS[DAY_NAMES.indexOf(d)]).filter((d): d is Weekday => Boolean(d)),
  };
}

/** The label-code shape the API accepts (AdvisoryDeclaration / CreateLabel). */
export const LABEL_CODE = /^[a-z][a-z0-9-]{1,40}$/;

function advisoriesOf(i: Item): AdvisoryDto {
  const note = i.allergies.note.trim();
  return {
    labelCodes: i.allergies.allergens.map((a) => a.trim().toLowerCase()).filter((a) => LABEL_CODE.test(a)),
    additionalInfo: note ? { en: note, ar: note } : {},
  };
}

/** Well-known fact codes mirrored into the nutrition strip the builder draws. */
const NUTRITION_FACT: Record<string, keyof Item["nutrition"]> = {
  calories: "calories",
  energy: "calories",
  kcal: "calories",
  protein: "protein",
  carb: "carb",
  carbs: "carb",
  carbohydrates: "carb",
  fat: "fat",
};

export function nutritionFieldOf(factCode: string): keyof Item["nutrition"] | null {
  return NUTRITION_FACT[factCode.toLowerCase()] ?? null;
}

export function toItem(res: CatalogItemResponse, local?: Item): Item {
  const base = local ?? blankItem(res.id, pick(res.name));
  const nutrition = { ...base.nutrition };
  for (const f of res.facts) {
    const field = nutritionFieldOf(f.factCode);
    if (field) nutrition[field] = f.amount;
  }
  return {
    ...base,
    id: res.id,
    name: pick(res.name),
    shortName: pick(res.shortName) || pick(res.name),
    description: pick(res.description),
    sku: res.sku ?? "",
    tags: res.tagCodes,
    status: res.isUnavailable ? "unavailable" : res.status.toLowerCase() === "active" ? "active" : "draft",
    availability: { ...base.availability, available: !res.isUnavailable },
    pricing: { ...base.pricing, price: res.basePrice?.amount ?? 0 },
    schedule: itemScheduleFromApi(res.schedule),
    facts: res.facts.map((f) => ({ factCode: f.factCode, amount: f.amount, unitCode: f.unitCode })),
    nutrition,
    allergies: {
      allergens: res.advisories.labelCodes,
      note: pick(res.advisories.additionalInfo),
    },
  };
}

/** One catalog item in the builder's shape: its image URL resolved and its
 *  modifier groups read in full. */
export async function loadItem(businessId: string, id: string, local?: Item): Promise<Item> {
  const r = await getCatalogItem(businessId, id);
  const item = toItem(r, local);
  item.image = (await mediaUrl(businessId, r.image)) ?? item.image;
  const localGroups = new Map(item.modifierGroups.map((g) => [g.id, g]));
  item.modifierGroups = await Promise.all(
    r.modifierGroupIds.map((gid) => getModifierGroup(businessId, gid).then((g) => toGroup(g, localGroups.get(gid))))
  );
  return item;
}

/** Server sections in server order, with each section's items, and the
 *  local-only offers section last. A section is read in full through a no-op
 *  placement call (the API has no GET-one-section; an empty POST /placements
 *  returns the whole section, description, colour and placements included). */
export async function pullSections(businessId: string, menu: Menu): Promise<Menu> {
  const res = await listSections(businessId, menu.id, true);
  const local = new Map(menu.sections.map((s) => [s.id, s]));
  const localItems = new Map(
    menu.sections.flatMap((s) => s.entries.filter(isItem)).map((i) => [i.id, i] as const)
  );
  const rows = [...res.data]
    .sort((a, b) => a.position - b.position)
    .filter((r) => r.kind.toLowerCase() !== "offers");
  const sections = await Promise.all(
    rows.map(async (row) => {
      const base = toSection(row, local.get(row.id));
      const full = await placeSectionEntries(businessId, menu.id, row.id, { entries: [], expectedVersion: null });
      const ids = [...full.placements]
        .sort((a, b) => a.position - b.position)
        .filter((p) => p.targetKind.toLowerCase() === "item")
        .map((p) => p.targetId);
      const entries = await Promise.all(ids.map((id) => loadItem(businessId, id, localItems.get(id))));
      return {
        ...base,
        description: pick(full.description),
        image: (await mediaUrl(businessId, full.image)) ?? base.image,
        color: full.color,
        entries: [...entries, ...base.entries.filter((e) => !isItem(e))],
      };
    })
  );
  const offers = menu.sections.find((s) => s.id === OFFERS_SECTION_ID);
  if (offers) {
    const pulled = await pullOffers(businessId, menu.id, offers.entries as unknown as Offer[]);
    if (pulled.length > 0) offers.entries = pulled as unknown as Section["entries"];
  }
  const theme = themeFromServer(menu.theme, await getMenuTheme(businessId, menu.id));
  return { ...menu, theme, sections: offers ? [...sections, offers] : sections };
}

const itemFields = (i: Item) =>
  JSON.stringify([i.name, i.shortName, i.description, i.sku, i.tags, i.status, i.pricing.price, i.image, i.facts ?? [], i.allergies]);

const groupFields = (g: ModifierGroup) =>
  JSON.stringify([g.name, g.customerLabel, g.helpText, g.type, g.min, g.max, g.showAsRadio]);
const optionFields = (o: ModifierOption) => JSON.stringify([o.name, o.priceType, o.price, o.isDefault]);
const groupBody = (g: ModifierGroup) => ({
  name: loc(g.name),
  promptLabel: loc(g.customerLabel || g.name),
  // The API rejects an empty help text (the frame stars it as required too).
  helpText: loc(g.helpText || g.customerLabel || g.name),
  selectionMode: g.type === "single" ? "Single" : "Multiple",
  minSelected: g.min,
  maxSelected: g.type === "single" ? 1 : g.max,
  showAsRadio: g.showAsRadio,
});

/** Brings one modifier group (and its options) in line with the local copy. */
async function pushGroup(
  businessId: string,
  currency: string,
  prev: ModifierGroup | undefined,
  g: ModifierGroup,
  ids: IdMap
): Promise<ModifierGroup> {
  let id = g.id;
  if (!isServerId(id)) {
    const created = await createModifierGroup(businessId, { businessId, ...groupBody(g) }, key());
    id = created.id;
    ids[g.id] = id;
  } else if (!prev || groupFields(prev) !== groupFields(g)) {
    await updateModifierGroup(businessId, id, { ...groupBody(g), expectedVersion: null });
  }

  const known = new Set((prev?.options ?? []).map((o) => o.id));
  const before = new Map((prev?.options ?? []).map((o) => [o.id, o]));
  const kept = new Set(g.options.map((o) => o.id));
  for (const o of prev?.options ?? []) {
    if (isServerId(o.id) && !kept.has(o.id)) await removeModifierOption(businessId, id, o.id);
  }
  const options: ModifierOption[] = [];
  for (const o of g.options) {
    let oid = o.id;
    if (!isServerId(oid)) {
      const seen = new Set([...known, ...options.map((x) => x.id)]);
      const res = await addModifierOption(businessId, id, {
        name: loc(o.name),
        effect: effectToServer(o, currency),
        isDefault: o.isDefault,
        expectedVersion: null,
      });
      oid = res.options.find((x) => !seen.has(x.id))?.id ?? oid;
      ids[o.id] = oid;
      if (!o.available) await setOptionAvailability(businessId, id, oid, { unavailable: true });
    } else {
      const old = before.get(oid);
      if (!old || optionFields(old) !== optionFields(o)) {
        await updateModifierOption(businessId, id, oid, {
          name: loc(o.name),
          effect: effectToServer(o, currency),
          isDefault: o.isDefault,
          expectedVersion: null,
        });
      }
      if (old && old.available !== o.available) {
        await setOptionAvailability(businessId, id, oid, { unavailable: !o.available });
      }
    }
    options.push({ ...o, id: oid });
  }
  const order = options.map((o) => o.id);
  const oldOrder = (prev?.options ?? []).filter((o) => kept.has(o.id)).map((o) => o.id);
  if (order.length > 1 && isServerId(order[0]) && order.join() !== oldOrder.join()) {
    await reorderModifierOptions(businessId, id, { orderedOptionIds: order, expectedVersion: null });
  }
  return { ...g, id, options };
}

async function pushItem(businessId: string, currency: string, prev: Item | undefined, i: Item, ids: IdMap, media: MediaMap): Promise<Item> {
  const money = { amount: i.pricing.price, currency };
  let id = i.id;
  if (!isServerId(id)) {
    const created = await createCatalogItem(
      businessId,
      {
        businessId,
        name: loc(i.name),
        shortName: loc(i.shortName || i.name),
        description: loc(i.description),
        sku: i.sku || null,
        tagCodes: i.tags,
        basePrice: money,
      },
      key()
    );
    id = created.id;
  }
  let image = i.image;
  if (!prev || !isServerId(prev.id) || itemFields(prev) !== itemFields(i)) {
    // A picked photo is uploaded once; the item then keeps its delivery URL.
    let ref = knownMedia(i.image);
    if (isLocalMedia(i.image)) {
      const up = await uploadMedia(businessId, i.image, "ItemImage", `${i.name || "item"}.jpg`);
      ref = up.ref;
      image = up.url;
      media[i.id] = up.url;
    }
    await updateCatalogItem(businessId, id, {
      name: loc(i.name),
      shortName: loc(i.shortName || i.name),
      description: loc(i.description),
      sku: i.sku || null,
      tagCodes: i.tags,
      status: i.status === "draft" ? "Draft" : "Active",
      fulfillmentModes: null,
      basePrice: money,
      // The PUT replaces both wholesale: null would clear what the item declares.
      facts: (i.facts ?? []).filter((f) => Number.isFinite(f.amount) && f.amount >= 0),
      advisories: advisoriesOf(i),
      image: ref,
      video: null,
      expectedVersion: null,
    });
  }
  // The schedule has its own endpoint (behind the menu:scheduling feature), so
  // it is only sent when it changed — an item left on "all day" never calls it.
  const prevSchedule = JSON.stringify(prev?.schedule ?? { mode: "all-day" });
  if (JSON.stringify(i.schedule) !== prevSchedule) {
    await setItemSchedule(businessId, id, { schedule: itemScheduleToApi(i.schedule), expectedVersion: null });
  }
  const wasUnavailable = prev?.status === "unavailable";
  const isUnavailable = i.status === "unavailable";
  if (isUnavailable !== wasUnavailable && (prev || isUnavailable)) {
    await setItemAvailability(businessId, id, { unavailable: isUnavailable });
  }
  const before = new Map((prev?.modifierGroups ?? []).map((g) => [g.id, g]));
  const groups: ModifierGroup[] = [];
  for (const g of i.modifierGroups) groups.push(await pushGroup(businessId, currency, before.get(g.id), g, ids));
  const wanted = groups.map((g) => g.id).join();
  if (wanted !== (prev?.modifierGroups ?? []).map((g) => g.id).join() && groups.every((g) => isServerId(g.id))) {
    await setItemModifierGroups(businessId, id, { modifierGroupIds: groups.map((g) => g.id), expectedVersion: null });
  }
  return { ...i, id, image, modifierGroups: groups };
}

/** Makes the section's placements match `items`, in order. */
async function syncPlacements(businessId: string, menuId: string, sectionId: string, items: Item[]) {
  let full: SectionResponse = await placeSectionEntries(businessId, menuId, sectionId, { entries: [], expectedVersion: null });
  const have = new Set(full.placements.map((p) => p.targetId));
  const want = new Set(items.map((i) => i.id));
  for (const p of full.placements) {
    if (!want.has(p.targetId)) full = await removePlacement(businessId, menuId, sectionId, p.id);
  }
  const add = items.filter((i) => !have.has(i.id));
  if (add.length) {
    full = await placeSectionEntries(businessId, menuId, sectionId, {
      entries: add.map((i) => ({ targetKind: "Item", targetId: i.id })),
      expectedVersion: null,
    });
  }
  const byTarget = new Map(full.placements.map((p) => [p.targetId, p.id]));
  const ordered = items.map((i) => byTarget.get(i.id)).filter((x): x is string => Boolean(x));
  const current = [...full.placements].sort((a, b) => a.position - b.position).map((p) => p.id);
  if (ordered.length > 1 && ordered.join() !== current.join()) {
    await reorderPlacements(businessId, menuId, sectionId, { orderedPlacementIds: ordered, expectedVersion: null });
  }
}

const fields = (s: Section) =>
  JSON.stringify([s.name, s.description, s.visibility === "hidden", s.displayStyle, s.color, s.image]);

/** An image picked in the browser is uploaded once, and the section then keeps its delivery URL. */
async function sectionImage(businessId: string, s: Section) {
  if (isLocalMedia(s.image)) {
    const up = await uploadMedia(businessId, s.image, "SectionImage", `${s.name || "section"}.jpg`);
    return { ref: up.ref, url: up.url };
  }
  return { ref: knownMedia(s.image), url: s.image };
}

async function writeSection(businessId: string, menuId: string, id: string, s: Section): Promise<Section> {
  const img = await sectionImage(businessId, s);
  await updateSectionApi(businessId, menuId, id, {
    name: loc(s.name),
    description: loc(s.description),
    image: img.ref,
    visibility: s.visibility === "archived" ? null : cap(s.visibility),
    displayStyle: cap(s.displayStyle),
    color: s.color,
    expectedVersion: null,
  });
  return { ...s, image: img.url };
}

/** Applies `next` to the server, given `prev` as the last-saved copy. Returns
 *  `next` with server ids/version swapped in. */
export type IdMap = Record<string, string>;
/** local entity id -> delivery URL of the image uploaded for it. */
export type MediaMap = Record<string, string>;

/** Swaps local ids for the server ids they were given. */
export function applyIds(menu: Menu, ids: IdMap, media: MediaMap = {}): Menu {
  if (Object.keys(ids).length === 0 && Object.keys(media).length === 0) return menu;
  return {
    ...menu,
    sections: menu.sections.map((s) => ({
      ...s,
      id: ids[s.id] ?? s.id,
      image: media[s.id] ?? s.image,
      entries: s.entries.map((e) => {
        if (!isItem(e)) {
          // An offer: its own id, and the items it is made of.
          const offer = e as unknown as Offer;
          return {
            ...offer,
            id: ids[offer.id] ?? offer.id,
            image: media[offer.id] ?? offer.image,
            entries: offer.entries.map((x) => ({ ...x, itemId: ids[x.itemId] ?? x.itemId })),
          } as unknown as typeof e;
        }
        return {
          ...e,
          id: ids[e.id] ?? e.id,
          image: media[e.id] ?? e.image,
          modifierGroups: e.modifierGroups.map((g) => ({
            ...g,
            id: ids[g.id] ?? g.id,
            options: g.options.map((o) => ({ ...o, id: ids[o.id] ?? o.id })),
          })),
        };
      }),
    })),
  };
}

export async function pushMenu(
  businessId: string,
  prev: Menu,
  next: Menu
): Promise<{ menu: Menu; ids: IdMap; media: MediaMap; version: number }> {
  const ids: IdMap = {};
  const media: MediaMap = {};
  let version = next.version;
  const settings = await getCatalogSettings(businessId);
  const currency = settings.currency ?? "SAR";
  const prevItems = new Map(prev.sections.flatMap((s) => s.entries.filter(isItem)).map((i) => [i.id, i] as const));
  if (next.name !== prev.name) {
    const res = await updateMenuDetails(businessId, next.id, {
      name: loc(next.name),
      branchScope: null,
      salesChannels: null,
      expectedVersion: prev.version,
    });
    version = res.version;
  }

  if (JSON.stringify(prev.theme) !== JSON.stringify(next.theme)) await pushTheme(businessId, next.id, next.theme);

  const before = new Map(prev.sections.map((s) => [s.id, s]));
  const kept = new Set(next.sections.map((s) => s.id));
  for (const old of prev.sections) {
    if (old.id !== OFFERS_SECTION_ID && isServerId(old.id) && !kept.has(old.id)) {
      await deleteSectionApi(businessId, next.id, old.id);
    }
  }

  const sections: Section[] = [];
  // Items first (they need real ids), then the section's placements.
  async function withItems(sec: Section): Promise<Section> {
    const pushed: Item[] = [];
    for (const e of sec.entries) if (isItem(e)) {
      const p = await pushItem(businessId, currency, prevItems.get(e.id), e, ids, media);
      if (p.id !== e.id) ids[e.id] = p.id;
      pushed.push(p);
    }
    if (sec.visibility !== "archived") await syncPlacements(businessId, next.id, sec.id, pushed);
    let n = 0;
    return { ...sec, entries: sec.entries.map((e) => (isItem(e) ? pushed[n++] : e)) };
  }
  for (const s of next.sections) {
    if (s.id === OFFERS_SECTION_ID) {
      sections.push(s);
      continue;
    }
    if (!isServerId(s.id)) {
      const created = await createSection(
        businessId,
        next.id,
        { businessId, menuId: next.id, kind: "Items", name: loc(s.name) },
        key()
      );
      const written = await writeSection(businessId, next.id, created.id, s);
      if (written.image !== s.image && written.image) media[s.id] = written.image;
      if (s.visibility === "archived") await archiveSectionApi(businessId, next.id, created.id);
      ids[s.id] = created.id;
      sections.push(await withItems({ ...s, id: created.id }));
      continue;
    }
    const old = before.get(s.id);
    if (!old || fields(old) !== fields(s)) {
      const written = await writeSection(businessId, next.id, s.id, s);
      if (written.image !== s.image && written.image) media[s.id] = written.image;
    }
    if (s.visibility === "archived" && old?.visibility !== "archived") {
      await archiveSectionApi(businessId, next.id, s.id);
    }
    sections.push(await withItems(s));
  }

  // Offers come last: they point at items, which now all have server ids.
  const offersIndex = sections.findIndex((s) => s.id === OFFERS_SECTION_ID);
  if (offersIndex >= 0) {
    const prevOffers = (prev.sections.find((s) => s.id === OFFERS_SECTION_ID)?.entries ?? []) as unknown as Offer[];
    const nextOffers = sections[offersIndex].entries as unknown as Offer[];
    if (JSON.stringify(prevOffers) !== JSON.stringify(nextOffers)) {
      const pushed = await pushOffers(businessId, next.id, prevOffers, nextOffers, ids, currency);
      Object.assign(ids, pushed.ids);
      sections[offersIndex] = { ...sections[offersIndex], entries: pushed.offers as unknown as Section["entries"] };
    }
  }

  const order = sections.filter((s) => s.id !== OFFERS_SECTION_ID).map((s) => s.id);
  const oldOrder = prev.sections.filter((s) => s.id !== OFFERS_SECTION_ID && kept.has(s.id)).map((s) => s.id);
  if (order.length > 1 && order.join() !== oldOrder.join()) {
    await reorderSections(businessId, next.id, { orderedSectionIds: order });
  }

  return { menu: { ...next, sections, version }, ids, media, version };
}
