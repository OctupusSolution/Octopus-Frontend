// The whole wizard in one value. Ten steps' worth of answers used to be eleven
// separate useState hooks in the page component; as a single reducer the page
// stops being a state container and becomes an orchestrator.
import type { ModuleId, TypeCode, VerticalId } from "@/shared/catalog";
import { baseModuleIds } from "@/shared/catalog";
import type { IntegrationId } from "./extras-catalog";

export type EntryPath = "ai" | "template" | "scratch";

/** One weekday's opening window. `open: false` means closed that day. */
export interface DayHours {
  open: boolean;
  from: string; // "09:00"
  to: string;   // "12:00"
}

export type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export interface BrandDetails {
  businessName: string;
  city: string;
  branchType: string;
  branchCount: number;
  currency: string;
  hours: Record<Weekday, DayHours>;
  audiences: string[];
  /** Data URL from the file input — never uploaded anywhere. */
  logoDataUrl: string | null;
  primary: string;
  secondary: string;
  themeTemplate: string | null;
  /** A FONTS id from brand-catalog.ts — the face the public page is set in. */
  font: string;
}

export interface PublicLinkSettings {
  tag: string;
  /** Section ids in display order, for the customise list on step 8. */
  sections: string[];
}

export interface AccountFields {
  fullName: string;
  email: string;
  password: string;
  companyName: string;
}

export interface OnboardingDraft {
  step: number;
  entryPath: EntryPath | null;
  vertical: VerticalId | null;
  type: TypeCode | null;
  answers: Record<string, string>;
  enabled: ModuleId[];
  brand: BrandDetails;
  integrations: IntegrationId[];
  publicLink: PublicLinkSettings;
  account: AccountFields;
  accountCreated: boolean;
  paymentMethod: string | null;
  paid: boolean;
}

const CLOSED_DEFAULT: DayHours = { open: true, from: "09:00", to: "12:00" };

export const EMPTY_DRAFT: OnboardingDraft = {
  step: 1,
  entryPath: null,
  vertical: null,
  type: null,
  answers: {},
  enabled: [...baseModuleIds],
  brand: {
    businessName: "",
    city: "",
    branchType: "",
    branchCount: 1,
    currency: "SAR",
    hours: {
      sun: { ...CLOSED_DEFAULT }, mon: { ...CLOSED_DEFAULT }, tue: { ...CLOSED_DEFAULT },
      wed: { ...CLOSED_DEFAULT }, thu: { ...CLOSED_DEFAULT }, fri: { ...CLOSED_DEFAULT },
      sat: { ...CLOSED_DEFAULT },
    },
    audiences: [],
    logoDataUrl: null,
    primary: "#001EC9",
    secondary: "#1D1D1D",
    themeTemplate: null,
    font: "inter",
  },
  integrations: [],
  publicLink: { tag: "restaurant", sections: ["hero", "offers", "menu", "bestSeller"] },
  account: { fullName: "", email: "", password: "", companyName: "" },
  accountCreated: false,
  paymentMethod: null,
  paid: false,
};

export type DraftAction =
  | { type: "goTo"; step: number }
  | { type: "next" }
  | { type: "back" }
  | { type: "setEntryPath"; path: EntryPath }
  | { type: "setVertical"; id: VerticalId }
  | { type: "setType"; code: TypeCode }
  | { type: "answer"; questionId: string; optionId: string }
  | { type: "setModules"; ids: ModuleId[] }
  | { type: "patchBrand"; patch: Partial<BrandDetails> }
  | { type: "setDayHours"; day: Weekday; hours: DayHours }
  | { type: "toggleAudience"; id: string }
  | { type: "toggleIntegration"; id: IntegrationId }
  | { type: "patchPublicLink"; patch: Partial<PublicLinkSettings> }
  | { type: "patchAccount"; patch: Partial<AccountFields> }
  | { type: "accountCreated" }
  | { type: "setPaymentMethod"; id: string }
  | { type: "paid" };

function toggle<T>(list: readonly T[], id: T): T[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function draftReducer(state: OnboardingDraft, action: DraftAction): OnboardingDraft {
  switch (action.type) {
    case "goTo":
      return { ...state, step: action.step };
    case "next":
      return { ...state, step: state.step + 1 };
    case "back":
      return { ...state, step: Math.max(1, state.step - 1) };
    case "setEntryPath":
      return { ...state, entryPath: action.path };
    case "setVertical":
      return { ...state, vertical: action.id };
    // A question relevant to the old type may not exist for the new one, and a
    // stale answer would silently keep a module switched on.
    case "setType":
      return { ...state, type: action.code, answers: {} };
    case "answer":
      return { ...state, answers: { ...state.answers, [action.questionId]: action.optionId } };
    case "setModules":
      return { ...state, enabled: action.ids };
    case "patchBrand":
      return { ...state, brand: { ...state.brand, ...action.patch } };
    case "setDayHours":
      return { ...state, brand: { ...state.brand, hours: { ...state.brand.hours, [action.day]: action.hours } } };
    case "toggleAudience":
      return { ...state, brand: { ...state.brand, audiences: toggle(state.brand.audiences, action.id) } };
    case "toggleIntegration":
      return { ...state, integrations: toggle(state.integrations, action.id) };
    case "patchPublicLink":
      return { ...state, publicLink: { ...state.publicLink, ...action.patch } };
    case "patchAccount":
      return { ...state, account: { ...state.account, ...action.patch } };
    case "accountCreated":
      return { ...state, accountCreated: true };
    case "setPaymentMethod":
      return { ...state, paymentMethod: action.id };
    case "paid":
      return { ...state, paid: true };
  }
}

// --- Completeness predicates -------------------------------------------
// The Review step (7) and the Dashboard Preview summary (9) show the same
// three "Completed" ticks over the same three groups of answers. They used to
// each decide for themselves — Review from the real data, Preview
// unconditionally — so a merchant with no integrations was told "None
// selected" on step 7 and "Completed" on step 9. One definition each, read by
// both screens.

/** The business card: industry, type, name and city all answered. */
export function businessComplete(draft: OnboardingDraft): boolean {
  return draft.vertical !== null && draft.type !== null
    && draft.brand.businessName.trim() !== "" && draft.brand.city !== "";
}

/** At least one module switched on. */
export function modulesComplete(draft: OnboardingDraft): boolean {
  return draft.enabled.length > 0;
}

/** At least one connector chosen. Integrations are optional, so "not
 *  complete" here means "nothing selected", not "something is wrong". */
export function integrationsComplete(draft: OnboardingDraft): boolean {
  return draft.integrations.length > 0;
}
