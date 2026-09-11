// The merchant Menu model. A menu is the root entity: a restaurant owns
// several of them (All Day, Breakfast, Ramadan), each with its own sections,
// theme, schedule and channel visibility, each independently publishable.
//
// Item, Offer and ModifierGroup are declared here rather than in the wizard
// plan because `Section.entries` needs them and the library cards count them.
// Their editing behaviour arrives with the wizard.

export type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

/** Sunday first — the order the frames' day selectors draw. */
export const WEEKDAYS: readonly Weekday[] = [
  "sun", "mon", "tue", "wed", "thu", "fri", "sat",
];

export type MenuStatus =
  | "active" | "scheduled" | "on-hold" | "expired" | "pending" | "archived";

// Channels say "Live" where the menu says "Active"; every other word is
// shared. Keeping them separate types means the card can show a menu whose
// POS is live while its public link is still pending.
export type ChannelState =
  | "live" | "scheduled" | "on-hold" | "expired" | "pending" | "archived" | "off";

// "off" is the one channel state with no menu-status counterpart: the merchant
// switched this menu off for this channel in the Schedule dialog, while the
// menu itself stays active elsewhere. channelStateFor never returns it — only
// an explicit toggle does.

export type SectionKind = "items" | "offers";
export type DisplayStyle = "list" | "carousel" | "grid";

/** The four tags the frame offers as presets. */
export type KnownItemTag =
  | "chef-recommended" | "top-selling" | "most-ordered" | "healthy-choice";

/** A preset or a merchant-typed label. `string & {}` keeps the presets in
 *  autocomplete instead of collapsing the union to plain `string`. */
// eslint-disable-next-line @typescript-eslint/ban-types
export type ItemTag = KnownItemTag | (string & {});

export interface ModifierOption {
  id: string;
  name: string;
  subLabel: string;
  priceType: "no-change" | "add-amount" | "fixed";
  price: number;
  isDefault: boolean;
  available: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string;
  type: "single" | "multi";
  customerLabel: string;
  helpText: string;
  min: number;
  max: number;
  required: boolean;
  showAsRadio: boolean;
  options: ModifierOption[];
}

export type ItemSchedule =
  | { mode: "all-day" }
  | { mode: "custom"; start: string; end: string; days: Weekday[] };

export interface Item {
  id: string;
  name: string;
  shortName: string;
  description: string;
  sku: string;
  image: string | null;
  video: string | null;
  tags: ItemTag[];
  status: "active" | "draft" | "unavailable";
  availability: {
    available: boolean;
    delivery: boolean;
    takeaway: boolean;
    dineIn: boolean;
  };
  schedule: ItemSchedule;
  modifierGroups: ModifierGroup[];
  pricing: { price: number; vatRate: number };
  nutrition: {
    calories: number | null;
    protein: number | null;
    carb: number | null;
    fat: number | null;
  };
  allergies: { allergens: string[]; note: string };
}

export interface Offer {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  status: "active" | "inactive";
  badge: string | null;
  showSavingBadge: boolean;
  entries: { itemId: string; qty: number; price: number }[];
  customerCanChange: boolean;
  pricing: {
    role: "fixed" | "discount" | "dynamic";
    offerPrice: number;
    /** Only meaningful under the "discount" role, where offerPrice is derived
     *  from it rather than typed. Kept when the role changes so switching back
     *  does not lose what the merchant entered. */
    discount: { type: "percent" | "amount"; value: number } | null;
    vatRate: number;
    excludeFromPromotions: boolean;
  };
  availability: {
    from: string | null;
    to: string | null;
    // Each part starts unchosen: the frame shows placeholders when the window
    // is first ticked, and a pre-filled Sun–Sat 10–12 would be saved unread.
    window: {
      days: [Weekday | null, Weekday | null];
      start: string | null;
      end: string | null;
    } | null;
  };
  channels: {
    dineIn: boolean;
    takeaway: boolean;
    delivery: boolean;
    kiosk: boolean;
    onlineOrdering: boolean;
    mobileApp: boolean;
  };
}

// `kind` is the load-bearing field: picking an offers section in the wizard's
// step 2 swaps the entire editor, tabs and all.
export interface Section {
  id: string;
  kind: SectionKind;
  name: string;
  image: string | null;
  description: string;
  /** "archived" is stronger than "hidden": the row is parked out of the way,
   *  its eye toggle is locked, and only Restore brings it back. */
  visibility: "visible" | "hidden" | "archived";
  displayStyle: DisplayStyle;
  color: string | null;
  entries: (Item | Offer)[];
}

export interface MenuTheme {
  presetId: string;
  navStyle: "top-bar" | "side-drawer" | "bottom-bar" | "pill-scroll";
  categoryStyle: "icon-text" | "text-only" | "icons-only" | "image-text";
  cardStyle: "classic" | "clean-minimal" | "image-top" | "image-left";
  itemDetails: "same-page" | "overlay" | "new-page";
  stickyAddToCart: boolean;
  showItemTags: boolean;
}

export interface MenuSchedule {
  type: "all-day" | "breakfast" | "lunch" | "dinner" | "custom";
  start: string;
  end: string;
  days: Weekday[];
  timezone: string;
  branchIds: string[];
  fallbackMenuId: string | null;
  allowPreorderOutsideSchedule: boolean;
}

export interface Menu {
  id: string;
  name: string;
  cover: string | null;
  status: MenuStatus;
  branchId: string;
  sections: Section[];
  theme: MenuTheme;
  schedule: MenuSchedule;
  channels: { pos: ChannelState; publicLink: ChannelState; tableQr: ChannelState };
  updatedAt: string;
  publishedAt: string | null;
  version: number;
}

/** An active menu reads "Live" on its channel chips; everything else keeps its word. */
export function channelStateFor(status: MenuStatus): ChannelState {
  return status === "active" ? "live" : status;
}

export function sectionCount(menu: Menu): number {
  return menu.sections.length;
}

export function entryCount(menu: Menu): number {
  return menu.sections.reduce((total, section) => total + section.entries.length, 0);
}
