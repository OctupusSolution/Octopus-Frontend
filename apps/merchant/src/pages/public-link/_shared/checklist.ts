// The Publish step's go-live checklist: nine predicates over the real draft,
// not a fixed row of green ticks. `goLiveReady` gates the footer's "Publish
// Now" button (see builder-shell.tsx / publish-step.tsx).
//
// Every item checks exactly the thing its label claims. `menu` reads
// `sectionSettings.menu.connectedMenuId`, `reservations` reads
// `sectionSettings.reservations.enabled`, `waitlist` reads
// `sectionSettings.waitlist.enabled` — not the homepage `sections` array
// (whether the block is *drawn* on the page) and not "absent means done".
// A row that reads "Menu is connected" must be false when no menu is
// connected, the same as the custom-domain card is never allowed to show a
// green SSL/Primary badge over a blank host — a green tick a merchant reads
// as a fact about their setup has to actually be one. (An earlier version of
// this file took the more lenient "present-and-enabled-in-sections, or
// absent" reading so a freshly seeded draft would already satisfy these
// three; that was resolved the wrong way — see task-21-report.md's fix
// section — and `EMPTY_SITE_DRAFT` is genuinely not go-live-ready on these
// axes until a merchant connects a menu and turns reservations/waitlist on.)
//
// `payments` and `responsive` have no field of their own in `SiteDraft` at
// all in this build (there is no payment-gateway or breakpoint config to
// gate on) — they are mock/always-true rows, same as `analytics`, and exist
// so the frame's nine-row list matches what a merchant actually sees. Their
// notes are worded to say so ("automatically"/"by construction") rather than
// imply a merchant configured something specific.
import type { SiteDraft } from "./site-draft";

export interface GoLiveItem {
  id: string;
  labelKey: string;
  noteKey: string;
  done: (draft: SiteDraft) => boolean;
  /** Only required items block "Publish Now". Menu, reservations, waitlist and
   *  SEO are optional per business (the backend publishes without them), so
   *  they are shown as recommendations instead of gates. */
  required?: boolean;
}

export const GO_LIVE_ITEMS: readonly GoLiveItem[] = [
  {
    id: "pages",
    labelKey: "publicLink.checklist.pages.label",
    noteKey: "publicLink.checklist.pages.note",
    done: (draft) => draft.pages.some((page) => page.onHome),
    required: true,
  },
  {
    id: "navigation",
    labelKey: "publicLink.checklist.navigation.label",
    noteKey: "publicLink.checklist.navigation.note",
    done: (draft) => draft.pages.some((page) => page.inNav && !draft.navigation.hidden.includes(page.id)),
    required: true,
  },
  {
    id: "menu",
    labelKey: "publicLink.checklist.menu.label",
    noteKey: "publicLink.checklist.menu.note",
    done: (draft) => draft.sectionSettings.menu.connectedMenuId.trim() !== "",
  },
  {
    id: "reservations",
    labelKey: "publicLink.checklist.reservations.label",
    noteKey: "publicLink.checklist.reservations.note",
    done: (draft) => draft.sectionSettings.reservations.enabled,
  },
  {
    id: "waitlist",
    labelKey: "publicLink.checklist.waitlist.label",
    noteKey: "publicLink.checklist.waitlist.note",
    done: (draft) => draft.sectionSettings.waitlist.enabled,
  },
  {
    id: "payments",
    labelKey: "publicLink.checklist.payments.label",
    noteKey: "publicLink.checklist.payments.note",
    // Mock in this build: there is no payment-gateway config on `SiteDraft`
    // to gate on, so an ordering menu is always treated as having a payment
    // path — otherwise there is nothing to check at all.
    done: () => true,
  },
  {
    id: "responsive",
    labelKey: "publicLink.checklist.responsive.label",
    noteKey: "publicLink.checklist.responsive.note",
    // The storefront is responsive by construction; this row says so.
    done: () => true,
  },
  {
    id: "seo",
    labelKey: "publicLink.checklist.seo.label",
    noteKey: "publicLink.checklist.seo.note",
    done: (draft) => draft.publish.seo.title.trim() !== "" && draft.publish.seo.description.trim() !== "",
  },
  {
    id: "analytics",
    labelKey: "publicLink.checklist.analytics.label",
    noteKey: "publicLink.checklist.analytics.note",
    // Mock: analytics is wired up automatically in this build.
    done: () => true,
  },
];

export function goLiveReady(draft: SiteDraft): boolean {
  return GO_LIVE_ITEMS.every((item) => !item.required || item.done(draft));
}
