// A menu's own presentation (PublicMenuTheme) -> what the storefront draws with. Every value is optional in practice: an
// unknown enum string, a malformed colour or an unknown font code falls back to the storefront default for that option,
// so a newer backend never breaks an older storefront.
import type { PublicMenuCurrency, PublicMenuMedia, PublicMenuMoney, PublicMenuTheme } from "@octopus/api-client";

export type NavStyle = "top-bar" | "side-drawer" | "bottom-bar" | "pill-scroll";
export type CategoryStyle = "icon-text" | "text-only" | "icons-only" | "image-text";
export type CardStyle = "classic" | "clean-minimal" | "image-top" | "image-left";
export type DetailsStyle = "same-page" | "overlay" | "new-page";
export type DisplayStyle = "list" | "carousel" | "grid";

const NAV: Record<string, NavStyle> = { TopBar: "top-bar", SideDrawer: "side-drawer", BottomBar: "bottom-bar", PillScroll: "pill-scroll" };
const CATEGORY: Record<string, CategoryStyle> = { IconAndText: "icon-text", TextOnly: "text-only", IconOnly: "icons-only", ImageAndText: "image-text" };
const CARD: Record<string, CardStyle> = { Classic: "classic", CleanMinimal: "clean-minimal", ImageTop: "image-top", ImageLeft: "image-left" };
const DETAILS: Record<string, DetailsStyle> = { SamePage: "same-page", Overlay: "overlay", NewPage: "new-page" };
const DISPLAY: Record<string, DisplayStyle> = { List: "list", Carousel: "carousel", Grid: "grid" };

export function menuLayout(theme: PublicMenuTheme) {
  return {
    nav: NAV[theme.navigationStyle] ?? "top-bar",
    category: CATEGORY[theme.sectionNavStyle] ?? "icon-text",
    card: CARD[theme.cardStyle] ?? "classic",
    details: DETAILS[theme.itemDetailsBehavior] ?? "same-page",
    stickyCart: theme.stickyPrimaryAction,
    showTags: theme.showItemTags,
  };
}

export const displayStyleOf = (value: string): DisplayStyle => DISPLAY[value] ?? "list";

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
export const safeColor = (value: string | null | undefined): string | null => (value && HEX.test(value) ? value : null);

/** The menu's colours as the storefront CSS variables they drive (same mapping as the site theme, brand-theme.ts). */
export function menuThemeStyle(theme: PublicMenuTheme): Record<string, string> {
  const style: Record<string, string> = {};
  const primary = safeColor(theme.primaryColor);
  const light = safeColor(theme.lightColor);
  const dark = safeColor(theme.darkColor);
  if (primary) {
    style["--octo-brand"] = primary;
    style["--octo-store-price"] = primary;
  }
  if (light) style["--octo-store-page"] = light;
  if (dark) style["--octo-text-primary"] = dark;
  return style;
}

/** Font code -> the CSS variable app/layout.tsx registers for it (the menu font catalogue uses the same codes). */
const FONT_VAR: Record<string, string> = {
  inter: "var(--font-inter-loaded)",
  cairo: "var(--font-cairo-loaded)",
  tajawal: "var(--font-tajawal-loaded)",
  poppins: "var(--font-poppins-loaded)",
  "playfair-display": "var(--font-playfair-loaded)",
};

export function menuFontStack(code: string | null): string | null {
  const face = code ? FONT_VAR[code.toLowerCase()] : undefined;
  return face ? `${face}, var(--font-family-active)` : null;
}

export function formatMoney(money: PublicMenuMoney | null, currency: PublicMenuCurrency | null, currencyLabel: (code: string) => string): string {
  if (!money) return "";
  if (!currency) return String(money.amount);
  return `${money.amount.toFixed(currency.minorUnits)} ${currencyLabel(currency.code)}`;
}

export const mediaUrl = (media: PublicMenuMedia | null | undefined, fallback: string | null): string | null => media?.url || fallback;
