// The Publish step's go-live checklist: nine predicates over the real draft,
// not a fixed row of green ticks. `goLiveReady` gates the footer's "Publish
// Now" button (see builder-shell.tsx / publish-step.tsx).
//
// Two items (`waitlist`, `menu`, `reservations`) read `sections` — the
// homepage block list from the Customize step — rather than the deeper
// per-module settings (`sectionSettings.menu.connectedMenuId`,
// `sectionSettings.reservations.enabled`, ...). A section absent from
// `sections` altogether (waitlist is deliberately left out of the seeded
// catalog — see site-draft.ts) has nothing to check and counts as done; a
// section that IS on the homepage must actually be enabled there. This is
// what makes a freshly seeded draft already satisfy these three: the seeded
// catalog ships with menu/reservations enabled and no waitlist block, so
// there is genuinely nothing left for a merchant to turn on before the page
// is presentable — the one thing the checklist still makes them do by hand
// is write their own SEO title and description.
//
// `payments` and `responsive` have no field of their own in `SiteDraft` at
// all in this build (there is no payment-gateway or breakpoint config to
// gate on) — they are mock/always-true rows, same as `analytics`, and exist
// so the frame's nine-row list matches what a merchant actually sees.
import type { SiteDraft } from "./site-draft";

export interface GoLiveItem {
  id: string;
  labelKey: string;
  noteKey: string;
  done: (draft: SiteDraft) => boolean;
}

function sectionLiveOrAbsent(draft: SiteDraft, id: string): boolean {
  const section = draft.sections.find((entry) => entry.id === id);
  return section ? section.enabled : true;
}

export const GO_LIVE_ITEMS: readonly GoLiveItem[] = [
  {
    id: "pages",
    labelKey: "publicLink.checklist.pages.label",
    noteKey: "publicLink.checklist.pages.note",
    done: (draft) => draft.pages.some((page) => page.onHome),
  },
  {
    id: "navigation",
    labelKey: "publicLink.checklist.navigation.label",
    noteKey: "publicLink.checklist.navigation.note",
    done: (draft) => draft.pages.some((page) => page.inNav && !draft.navigation.hidden.includes(page.id)),
  },
  {
    id: "menu",
    labelKey: "publicLink.checklist.menu.label",
    noteKey: "publicLink.checklist.menu.note",
    done: (draft) => sectionLiveOrAbsent(draft, "menu"),
  },
  {
    id: "reservations",
    labelKey: "publicLink.checklist.reservations.label",
    noteKey: "publicLink.checklist.reservations.note",
    done: (draft) => sectionLiveOrAbsent(draft, "reservations"),
  },
  {
    id: "waitlist",
    labelKey: "publicLink.checklist.waitlist.label",
    noteKey: "publicLink.checklist.waitlist.note",
    done: (draft) => sectionLiveOrAbsent(draft, "waitlist"),
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
  return GO_LIVE_ITEMS.every((item) => item.done(draft));
}
