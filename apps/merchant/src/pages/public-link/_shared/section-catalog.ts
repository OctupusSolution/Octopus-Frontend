// Step 5 of the builder: the homepage sections a merchant arranges and
// configures. Five have a hand-written inspector each (hero, reservations,
// waitlist, menu, offers — see SiteDraft["sectionSettings"] in site-draft.ts);
// the rest fall back to a small generic panel driven by `fields` here.
//
// `waitlist` is deliberately in this catalog but not in
// `EMPTY_SITE_DRAFT.sections` — the frames show it swapped in for
// `reservationsCta` once the merchant turns the waitlist module on, so the
// catalog must know it from the start even though the seeded draft doesn't
// list it yet.

import type { LucideIcon } from "lucide-react";
import {
  Image,
  CalendarClock,
  BookOpen,
  CalendarCheck,
  BadgePercent,
  PartyPopper,
  MessageSquareQuote,
  Instagram,
  ClipboardList,
} from "lucide-react";

export type InspectorKind = "hero" | "reservations" | "waitlist" | "menu" | "offers" | "generic";

export type GenericField =
  | { id: string; kind: "select"; labelKey: string; optionKeys: readonly string[] }
  | { id: string; kind: "toggle"; labelKey: string };

export interface SiteSection {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  inspector: InspectorKind;
  /** Only present for `inspector: "generic"` sections. */
  fields?: readonly GenericField[];
}

export const SITE_SECTIONS: readonly SiteSection[] = [
  { id: "hero", labelKey: "publicLink.section.hero", icon: Image, inspector: "hero" },
  { id: "reservations", labelKey: "publicLink.section.reservations", icon: CalendarClock, inspector: "reservations" },
  { id: "menu", labelKey: "publicLink.section.menu", icon: BookOpen, inspector: "menu" },
  {
    id: "reservationsCta",
    labelKey: "publicLink.section.reservationsCta",
    icon: CalendarCheck,
    inspector: "generic",
    fields: [
      {
        id: "displayStyle",
        kind: "select",
        labelKey: "publicLink.field.reservationsCta.displayStyle",
        optionKeys: [
          "publicLink.field.reservationsCta.displayStyle.banner",
          "publicLink.field.reservationsCta.displayStyle.card",
          "publicLink.field.reservationsCta.displayStyle.inline",
        ],
      },
      {
        id: "ctaButton",
        kind: "select",
        labelKey: "publicLink.field.reservationsCta.ctaButton",
        optionKeys: [
          "publicLink.field.reservationsCta.ctaButton.bookNow",
          "publicLink.field.reservationsCta.ctaButton.viewTimes",
          "publicLink.field.reservationsCta.ctaButton.contactUs",
        ],
      },
      { id: "showCountdown", kind: "toggle", labelKey: "publicLink.field.reservationsCta.showCountdown" },
    ],
  },
  { id: "offers", labelKey: "publicLink.section.offers", icon: BadgePercent, inspector: "offers" },
  {
    id: "events",
    labelKey: "publicLink.section.events",
    icon: PartyPopper,
    inspector: "generic",
    fields: [
      {
        id: "displayStyle",
        kind: "select",
        labelKey: "publicLink.field.events.displayStyle",
        optionKeys: [
          "publicLink.field.events.displayStyle.grid",
          "publicLink.field.events.displayStyle.list",
          "publicLink.field.events.displayStyle.carousel",
        ],
      },
      {
        id: "sortOrder",
        kind: "select",
        labelKey: "publicLink.field.events.sortOrder",
        optionKeys: ["publicLink.field.events.sortOrder.dateAsc", "publicLink.field.events.sortOrder.dateDesc"],
      },
      { id: "showPastEvents", kind: "toggle", labelKey: "publicLink.field.events.showPastEvents" },
    ],
  },
  {
    id: "testimonials",
    labelKey: "publicLink.section.testimonials",
    icon: MessageSquareQuote,
    inspector: "generic",
    fields: [
      {
        id: "layout",
        kind: "select",
        labelKey: "publicLink.field.testimonials.layout",
        optionKeys: [
          "publicLink.field.testimonials.layout.carousel",
          "publicLink.field.testimonials.layout.grid",
          "publicLink.field.testimonials.layout.single",
        ],
      },
      {
        id: "source",
        kind: "select",
        labelKey: "publicLink.field.testimonials.source",
        optionKeys: [
          "publicLink.field.testimonials.source.manual",
          "publicLink.field.testimonials.source.google",
          "publicLink.field.testimonials.source.facebook",
        ],
      },
      { id: "showRating", kind: "toggle", labelKey: "publicLink.field.testimonials.showRating" },
    ],
  },
  {
    id: "instagram",
    labelKey: "publicLink.section.instagram",
    icon: Instagram,
    inspector: "generic",
    fields: [
      {
        id: "layout",
        kind: "select",
        labelKey: "publicLink.field.instagram.layout",
        optionKeys: ["publicLink.field.instagram.layout.grid", "publicLink.field.instagram.layout.carousel"],
      },
      {
        id: "postCount",
        kind: "select",
        labelKey: "publicLink.field.instagram.postCount",
        optionKeys: [
          "publicLink.field.instagram.postCount.six",
          "publicLink.field.instagram.postCount.nine",
          "publicLink.field.instagram.postCount.twelve",
        ],
      },
      { id: "showCaption", kind: "toggle", labelKey: "publicLink.field.instagram.showCaption" },
    ],
  },
  { id: "waitlist", labelKey: "publicLink.section.waitlist", icon: ClipboardList, inspector: "waitlist" },
];

export const SECTION_IDS: readonly string[] = SITE_SECTIONS.map((s) => s.id);

/** Which homepage section a page module's "Customize" link opens. Pages with no
 *  entry show no link — their content is not configured by a section inspector. */
export const SECTION_FOR_PAGE: Record<string, string> = {
  home: "hero",
  menu: "menu",
  reservations: "reservations",
  waitlist: "waitlist",
  offers: "offers",
};
