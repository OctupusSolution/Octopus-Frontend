// The whole builder in one value. Seven steps of answers as a single reducer,
// the same shape onboarding's draft.ts uses, so the page stays an orchestrator
// rather than a bag of useState hooks.
//
// This model is deliberately NOT onboarding's `publicLink: { tag, sections }`.
// That field describes a preview with a reorderable list; this one describes a
// site a merchant owns — theme, brand, pages, navigation, per-module section
// settings, a rehearsal run and a publish record. Sharing one type would have
// meant every onboarding draft carrying seven steps of settings it never sets.

export const STEP_COUNT = 7;

export interface PageEntry {
  id: string;
  inNav: boolean;
  onHome: boolean;
}

export interface SectionEntry {
  id: string;
  enabled: boolean;
}

export type HeroBackground = "image" | "video" | "slider";

export interface HeroSettings {
  background: HeroBackground;
  imageDataUrl: string | null;
  heading: string;
  subheading: string;
  primaryCta: string;
  primaryTarget: string;
  secondaryCta: string;
  secondaryTarget: string;
}

export interface ReservationSettings {
  enabled: boolean;
  homepageDisplay: "widget" | "button";
  primaryAction: string;
  availabilityPreview: boolean;
  nextAvailableLabel: string;
  dateRange: string;
  bookingWindow: string;
  cutOff: string;
  minParty: string;
  maxParty: string;
  tableHold: string;
  autoConfirm: boolean;
  deposit: boolean;
}

export interface WaitlistSettings {
  enabled: boolean;
  homepageDisplay: "widget" | "button";
  primaryAction: string;
  availabilityPreview: boolean;
  nextAvailableLabel: string;
  format: string;
  queueMethod: "fifo" | "priority";
  minParty: string;
  maxParty: string;
  showWaitTime: boolean;
  updateInterval: string;
  notifyWhatsapp: boolean;
  notifySms: boolean;
  notifyEmail: boolean;
  autoRemove: string;
}

export interface MenuSettings {
  connectedMenuId: string;
  /** Multi-select: highlighted, categories, preview, full. */
  homepageDisplay: readonly string[];
  primaryAction: "menuPage" | "menuDrawer" | "ordering";
  orderingMode: "ordering" | "reservation" | "view";
  minOrder: string;
  orderAhead: boolean;
  prepTime: string;
  serviceAreas: string;
  taxDisplay: string;
}

export interface OffersSettings {
  displayStyle: string;
  filterCategories: boolean;
  sortOrder: string;
  ctaButton: string;
  visibility: string;
}

/** Settings for a section with no inspector of its own — see section-catalog. */
export interface GenericSettings {
  [fieldId: string]: string | boolean;
}

export interface SimResult {
  stepId: string;
  status: "success" | "failed";
  seconds: number;
  detailKey: string;
}

export interface Tester {
  email: string;
  roleKey: string;
  canView: boolean;
  tested: boolean;
}

export interface SiteDraft {
  step: number;
  theme: { id: string; filter: string };
  brand: {
    businessName: string;
    logoDataUrl: string | null;
    colors: { primary: string; light: string; accent: string; dark: string };
    typography: {
      en: { titles: string; body: string };
      ar: { titles: string; body: string };
    };
    faviconDataUrl: string | null;
    heroPatternDataUrl: string | null;
  };
  pages: readonly PageEntry[];
  navigation: {
    showInHeader: boolean;
    showInDrawer: boolean;
    stickyHeader: boolean;
    activeIndicator: boolean;
    showIcons: boolean;
    sameTab: boolean;
    hidden: readonly string[];
  };
  sections: readonly SectionEntry[];
  selectedSection: string;
  sectionSettings: {
    hero: HeroSettings;
    reservations: ReservationSettings;
    waitlist: WaitlistSettings;
    menu: MenuSettings;
    offers: OffersSettings;
    generic: Record<string, GenericSettings>;
  };
  preview: {
    testMode: boolean;
    simulation: "idle" | "running" | "done";
    completed: number;
    results: readonly SimResult[] | null;
    testers: readonly Tester[];
  };
  publish: {
    seo: { title: string; description: string; socialImageDataUrl: string | null };
    customDomain: { host: string; connected: boolean; ssl: boolean };
    published: boolean;
  };
  savedAt: number | null;
}

// Task 5 owns PAGE_IDS and SECTION_IDS; these literal lists must match that
// order exactly — Task 5's test asserts the agreement. `waitlist` is
// deliberately left out of the seeded sections: the frames show the merchant
// swapping it in for `reservationsCta` later, not present from the start.
const SEEDED_PAGE_IDS = [
  "home", "menu", "reservations", "waitlist", "offers", "events", "loyalty", "about", "contact",
] as const;

const SEEDED_SECTION_IDS = [
  "hero", "reservations", "menu", "reservationsCta", "offers", "events", "testimonials", "instagram",
] as const;

export const EMPTY_SITE_DRAFT: SiteDraft = {
  step: 1,
  theme: { id: "elegant", filter: "all" },
  brand: {
    businessName: "",
    logoDataUrl: null,
    colors: { primary: "#08589D", light: "#08589D", accent: "#08589D", dark: "#08589D" },
    typography: {
      en: { titles: "inter", body: "inter" },
      ar: { titles: "inter", body: "inter" },
    },
    faviconDataUrl: null,
    heroPatternDataUrl: null,
  },
  pages: SEEDED_PAGE_IDS.map((id) => ({
    id,
    inNav: id !== "events",
    onHome: id !== "events",
  })),
  navigation: {
    showInHeader: true,
    showInDrawer: true,
    stickyHeader: true,
    activeIndicator: true,
    showIcons: true,
    sameTab: true,
    hidden: [],
  },
  sections: SEEDED_SECTION_IDS.map((id) => ({ id, enabled: id !== "events" })),
  selectedSection: "hero",
  sectionSettings: {
    hero: {
      background: "image",
      imageDataUrl: null,
      heading: "",
      subheading: "",
      primaryCta: "",
      primaryTarget: "",
      secondaryCta: "",
      secondaryTarget: "",
    },
    reservations: {
      enabled: false,
      homepageDisplay: "widget",
      primaryAction: "",
      availabilityPreview: false,
      nextAvailableLabel: "",
      dateRange: "",
      bookingWindow: "",
      cutOff: "",
      minParty: "",
      maxParty: "",
      tableHold: "",
      autoConfirm: true,
      deposit: false,
    },
    waitlist: {
      enabled: false,
      homepageDisplay: "widget",
      primaryAction: "",
      availabilityPreview: false,
      nextAvailableLabel: "",
      format: "",
      queueMethod: "fifo",
      minParty: "",
      maxParty: "",
      showWaitTime: true,
      updateInterval: "",
      notifyWhatsapp: true,
      notifySms: true,
      notifyEmail: true,
      autoRemove: "",
    },
    menu: {
      connectedMenuId: "",
      homepageDisplay: ["highlighted"],
      primaryAction: "menuPage",
      orderingMode: "ordering",
      minOrder: "",
      orderAhead: true,
      prepTime: "",
      serviceAreas: "",
      taxDisplay: "",
    },
    offers: {
      displayStyle: "",
      filterCategories: false,
      sortOrder: "",
      ctaButton: "",
      visibility: "",
    },
    generic: {},
  },
  preview: {
    testMode: true,
    simulation: "idle",
    completed: 0,
    results: null,
    testers: [],
  },
  publish: {
    seo: { title: "", description: "", socialImageDataUrl: null },
    customDomain: { host: "", connected: false, ssl: false },
    published: false,
  },
  savedAt: null,
};

export type SiteAction =
  | { type: "goTo"; step: number }
  | { type: "next" }
  | { type: "back" }
  | { type: "patchTheme"; patch: Partial<SiteDraft["theme"]> }
  | { type: "patchBrand"; patch: Partial<Omit<SiteDraft["brand"], "colors" | "typography">> }
  | { type: "patchColors"; patch: Partial<SiteDraft["brand"]["colors"]> }
  | { type: "patchTypography"; locale: "en" | "ar"; patch: Partial<{ titles: string; body: string }> }
  | { type: "setPages"; pages: readonly PageEntry[] }
  | { type: "togglePageFlag"; id: string; flag: "inNav" | "onHome" }
  | { type: "patchNavigation"; patch: Partial<Omit<SiteDraft["navigation"], "hidden">> }
  | { type: "toggleNavHidden"; id: string }
  | { type: "setSections"; sections: readonly SectionEntry[] }
  | { type: "toggleSection"; id: string }
  | { type: "selectSection"; id: string }
  | { type: "patchSection"; section: "hero"; patch: Partial<HeroSettings> }
  | { type: "patchSection"; section: "reservations"; patch: Partial<ReservationSettings> }
  | { type: "patchSection"; section: "waitlist"; patch: Partial<WaitlistSettings> }
  | { type: "patchSection"; section: "menu"; patch: Partial<MenuSettings> }
  | { type: "patchSection"; section: "offers"; patch: Partial<OffersSettings> }
  | { type: "patchGeneric"; id: string; patch: GenericSettings }
  | { type: "patchPreview"; patch: Partial<SiteDraft["preview"]> }
  | { type: "patchPublish"; patch: Partial<SiteDraft["publish"]> };

function clampStep(step: number): number {
  return Math.min(STEP_COUNT, Math.max(1, step));
}

function toggleHidden(hidden: readonly string[], id: string): string[] {
  return hidden.includes(id) ? hidden.filter((x) => x !== id) : [...hidden, id];
}

export function siteDraftReducer(state: SiteDraft, action: SiteAction): SiteDraft {
  switch (action.type) {
    case "goTo":
      return { ...state, step: clampStep(action.step) };
    case "next":
      return { ...state, step: clampStep(state.step + 1) };
    case "back":
      return { ...state, step: clampStep(state.step - 1) };
    case "patchTheme":
      return { ...state, theme: { ...state.theme, ...action.patch } };
    case "patchBrand":
      return { ...state, brand: { ...state.brand, ...action.patch } };
    case "patchColors":
      return { ...state, brand: { ...state.brand, colors: { ...state.brand.colors, ...action.patch } } };
    case "patchTypography":
      return {
        ...state,
        brand: {
          ...state.brand,
          typography: {
            ...state.brand.typography,
            [action.locale]: { ...state.brand.typography[action.locale], ...action.patch },
          },
        },
      };
    case "setPages":
      return { ...state, pages: action.pages };
    case "togglePageFlag":
      return {
        ...state,
        pages: state.pages.map((page) =>
          page.id === action.id ? { ...page, [action.flag]: !page[action.flag] } : page,
        ),
      };
    case "patchNavigation":
      return { ...state, navigation: { ...state.navigation, ...action.patch } };
    case "toggleNavHidden":
      return { ...state, navigation: { ...state.navigation, hidden: toggleHidden(state.navigation.hidden, action.id) } };
    case "setSections":
      return { ...state, sections: action.sections };
    case "toggleSection":
      return {
        ...state,
        sections: state.sections.map((section) =>
          section.id === action.id ? { ...section, enabled: !section.enabled } : section,
        ),
      };
    case "selectSection":
      return { ...state, selectedSection: action.id };
    case "patchSection":
      switch (action.section) {
        case "hero":
          return { ...state, sectionSettings: { ...state.sectionSettings, hero: { ...state.sectionSettings.hero, ...action.patch } } };
        case "reservations":
          return { ...state, sectionSettings: { ...state.sectionSettings, reservations: { ...state.sectionSettings.reservations, ...action.patch } } };
        case "waitlist":
          return { ...state, sectionSettings: { ...state.sectionSettings, waitlist: { ...state.sectionSettings.waitlist, ...action.patch } } };
        case "menu":
          return { ...state, sectionSettings: { ...state.sectionSettings, menu: { ...state.sectionSettings.menu, ...action.patch } } };
        case "offers":
          return { ...state, sectionSettings: { ...state.sectionSettings, offers: { ...state.sectionSettings.offers, ...action.patch } } };
        default: {
          // A patchSection variant with no case above is a compile error here, not
          // a silent no-op at runtime — which is what an unhandled dispatch would
          // otherwise become, several steps away from the code that sent it.
          const unreachable: never = action;
          return unreachable;
        }
      }
    case "patchGeneric":
      return {
        ...state,
        sectionSettings: {
          ...state.sectionSettings,
          generic: {
            ...state.sectionSettings.generic,
            [action.id]: { ...state.sectionSettings.generic[action.id], ...action.patch },
          },
        },
      };
    case "patchPreview":
      return { ...state, preview: { ...state.preview, ...action.patch } };
    case "patchPublish":
      return { ...state, publish: { ...state.publish, ...action.patch } };
  }
  return state;
}
