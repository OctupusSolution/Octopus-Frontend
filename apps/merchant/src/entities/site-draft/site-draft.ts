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
  /** Darkness of the scrim over the hero media, 0-80. */
  overlay: number;
  textAlign: "start" | "center";
  height: "compact" | "standard" | "tall";
  showOnMobile: boolean;
  showOnDesktop: boolean;
  /** In-page anchor id the header's home link scrolls to. */
  anchorId: string;
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
  /** Hours' notice a guest must give to cancel free of charge; "none" = anytime. */
  cancellationWindow: "none" | "2" | "12" | "24" | "48";
  noShowFee: boolean;
  noShowAmount: string;
  depositRefund: "full" | "partial" | "none";
  termsText: string;
  notifyWhatsapp: boolean;
  notifySms: boolean;
  notifyEmail: boolean;
  reminderEnabled: boolean;
  reminderBefore: "1" | "2" | "24";
  notifyStaff: boolean;
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
  maxWaitMinutes: "30" | "60" | "90";
  requirePhone: boolean;
  allowSelfCancel: boolean;
  policyNote: string;
  notifyReady: boolean;
  reminderEnabled: boolean;
  notifyStaff: boolean;
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
  /** The backend's public-link slug (`PublicSiteResponse.slug`) — the ONE
   *  field here that maps directly onto a real Backend concept today. See
   *  entities/site-draft/public-link-sync.ts. Empty string until claimed. */
  slug: string;
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
    testModeSettings: { expiresInDays: "1" | "7" | "30"; requirePassword: boolean; password: string };
  };
  publish: {
    seo: { title: string; description: string; socialImageDataUrl: string | null };
    customDomain: { host: string; connected: boolean; ssl: boolean };
    published: boolean;
    /** Timestamp of the last successful publish; null until the first one. */
    publishedAt: number | null;
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
  slug: "",
  theme: { id: "elegant", filter: "all" },
  brand: {
    businessName: "",
    logoDataUrl: null,
    // The four swatches the menu Theme frame draws: brand blue, a near-white
    // tint of it, a light blue and a navy. Four identical blues gave the
    // preview nothing to tell a surface from an accent.
    colors: { primary: "#08589D", light: "#EEF4FF", accent: "#5B9BD5", dark: "#0B2545" },
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
    // Frame shows Events and Loyalty already toggled off in the nav.
    hidden: ["events", "loyalty"],
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
      primaryTarget: "reservations",
      secondaryCta: "",
      secondaryTarget: "menu",
      overlay: 45,
      textAlign: "center",
      height: "standard",
      showOnMobile: true,
      showOnDesktop: true,
      anchorId: "home",
    },
    reservations: {
      enabled: true,
      homepageDisplay: "widget",
      primaryAction: "reservations",
      availabilityPreview: true,
      nextAvailableLabel: "",
      dateRange: "7",
      bookingWindow: "30",
      cutOff: "2",
      minParty: "",
      maxParty: "",
      tableHold: "15",
      autoConfirm: true,
      deposit: false,
      cancellationWindow: "24",
      noShowFee: false,
      noShowAmount: "",
      depositRefund: "full",
      termsText: "",
      notifyWhatsapp: true,
      notifySms: false,
      notifyEmail: true,
      reminderEnabled: true,
      reminderBefore: "2",
      notifyStaff: true,
    },
    waitlist: {
      enabled: true,
      homepageDisplay: "widget",
      primaryAction: "waitlist",
      availabilityPreview: true,
      nextAvailableLabel: "",
      format: "30min",
      queueMethod: "fifo",
      minParty: "",
      maxParty: "",
      showWaitTime: true,
      updateInterval: "5",
      notifyWhatsapp: true,
      notifySms: true,
      notifyEmail: true,
      autoRemove: "10",
      maxWaitMinutes: "60",
      requirePhone: true,
      allowSelfCancel: true,
      policyNote: "",
      notifyReady: true,
      reminderEnabled: true,
      notifyStaff: true,
    },
    menu: {
      connectedMenuId: "menu-ocean-table-main",
      homepageDisplay: ["highlighted"],
      primaryAction: "menuPage",
      orderingMode: "ordering",
      minOrder: "",
      orderAhead: true,
      prepTime: "",
      serviceAreas: "",
      taxDisplay: "inclusive",
    },
    offers: {
      displayStyle: "cardList",
      filterCategories: true,
      sortOrder: "dateEarliest",
      ctaButton: "viewAllOffers",
      visibility: "visibleHomepage",
    },
    generic: {},
  },
  preview: {
    testMode: true,
    simulation: "idle",
    completed: 0,
    results: null,
    testers: [],
    testModeSettings: { expiresInDays: "7", requirePassword: false, password: "" },
  },
  publish: {
    seo: { title: "", description: "", socialImageDataUrl: null },
    customDomain: { host: "", connected: false, ssl: false },
    published: false,
    publishedAt: null,
  },
  savedAt: null,
};

export type SiteAction =
  | { type: "goTo"; step: number }
  | { type: "next" }
  | { type: "back" }
  | { type: "patchSlug"; slug: string }
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
  // patchPreview's Partial<preview> requires the whole testModeSettings object
  // when that key is present at all, so a caller changing just one field
  // (e.g. toggling requirePassword) would have to spread the nested object by
  // hand every time. A dedicated action merges one level deeper instead.
  | { type: "patchTestMode"; patch: Partial<SiteDraft["preview"]["testModeSettings"]> }
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
    case "patchSlug":
      return { ...state, slug: action.slug };
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
    case "patchTestMode":
      return {
        ...state,
        preview: {
          ...state.preview,
          testModeSettings: { ...state.preview.testModeSettings, ...action.patch },
        },
      };
    case "patchPublish":
      return { ...state, publish: { ...state.publish, ...action.patch } };
  }
  return state;
}
