// Step 3 of the builder: the nine page modules a public site can carry, in
// the order the frames list them. `EMPTY_SITE_DRAFT.pages` (site-draft.ts) is
// seeded from `PAGE_IDS` — this file is the source of truth for that order.

import type { LucideIcon } from "lucide-react";
import { Home, BookOpen, CalendarClock, ClipboardList, BadgePercent, CalendarCheck, HeartHandshake, Info, Phone } from "lucide-react";

export interface PageModule {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  /** Whether the row's "Customize" column links anywhere. Only `events` does
   *  not — the frames show an em dash in its place. */
  customizable: boolean;
}

export const PAGE_MODULES: readonly PageModule[] = [
  { id: "home", labelKey: "publicLink.page.home", icon: Home, customizable: true },
  { id: "menu", labelKey: "publicLink.page.menu", icon: BookOpen, customizable: true },
  { id: "reservations", labelKey: "publicLink.page.reservations", icon: CalendarClock, customizable: true },
  { id: "waitlist", labelKey: "publicLink.page.waitlist", icon: ClipboardList, customizable: true },
  { id: "offers", labelKey: "publicLink.page.offers", icon: BadgePercent, customizable: true },
  { id: "events", labelKey: "publicLink.page.events", icon: CalendarCheck, customizable: false },
  { id: "loyalty", labelKey: "publicLink.page.loyalty", icon: HeartHandshake, customizable: true },
  { id: "about", labelKey: "publicLink.page.about", icon: Info, customizable: true },
  { id: "contact", labelKey: "publicLink.page.contact", icon: Phone, customizable: true },
];

export const PAGE_IDS: readonly string[] = PAGE_MODULES.map((p) => p.id);
