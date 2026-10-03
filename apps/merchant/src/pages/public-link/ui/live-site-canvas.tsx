// The customer storefront, drawn inside the builder at a real device width.
//
// Every block below mirrors the apps/customer component named beside it — markup, sizes and
// breakpoints — so what the merchant sees is what a visitor gets:
//   SiteHeader            widgets/site-header/site-header.tsx
//   StoreHero             widgets/store-hero/store-hero.tsx
//   PageSections          widgets/page-sections/page-sections.tsx
//   CategoryMosaic        widgets/category-mosaic/category-mosaic.tsx
//   ProductRow/Card       widgets/product-row, shared/ui/product-card.tsx, price-block.tsx
//   PublishedSiteFooter   widgets/site-footer/site-footer.tsx
// When one of those changes, the block here has to follow.
//
// The storefront switches layout with CSS breakpoints (sm 640, md 768, lg 1024). Inside the
// builder those would answer to the merchant's own window, so the page is laid out for the
// preview's virtual viewport instead (`bp`), then scaled to fit the card by the frame.
//
// Links work the way a visitor would expect without leaving the builder: a link to one of the
// site's pages opens that page in the preview, an anchor scrolls to its section, and anything
// that leaves the site (outside links, email, phone, the cart) does nothing.
import { ClipboardList, Clock, Facebook, Globe, Heart, Instagram, Languages, Linkedin, MapPin, Menu, Phone, ShoppingBag, X } from "lucide-react";
import { useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import { storefrontAsset } from "@/shared/lib/storefront-assets";
import type { LiveMenu, LiveSection, LiveSite } from "../_shared/live-site";

export type LiveDevice = "desktop" | "tablet" | "mobile";

/** The viewport each device is laid out at (CSS px). */
export const VIEWPORT_WIDTH: Readonly<Record<LiveDevice, number>> = { desktop: 1280, tablet: 768, mobile: 390 };

interface Breakpoints {
  sm: boolean;
  md: boolean;
  lg: boolean;
}

const breakpointsFor = (device: LiveDevice): Breakpoints => {
  const w = VIEWPORT_WIDTH[device];
  return { sm: w >= 640, md: w >= 768, lg: w >= 1024 };
};

export interface LiveSiteCanvasProps {
  site: LiveSite;
  device: LiveDevice;
  /** Bound menus, by content key (menu id); a missing key is still loading. */
  menus: Readonly<Record<string, LiveMenu | null>>;
  /** Opens a site path (`/about`, `/#menu`) in the preview. */
  onNavigate: (href: string) => void;
  /** Switches the preview to another of the site's languages (the header's language pill). */
  onLanguage: (language: string) => void;
}

// ---- field readers (page-sections.tsx) --------------------------------------------------------

type Fields = Record<string, unknown>;
const str = (f: Fields, k: string): string => (typeof f[k] === "string" ? (f[k] as string).trim() : "");
const media = (f: Fields, k: string): { url: string; alt?: string } | null => {
  const v = f[k] as { url?: unknown; alt?: unknown } | undefined;
  return v && typeof v.url === "string" ? { url: v.url, alt: typeof v.alt === "string" ? v.alt : undefined } : null;
};
const link = (f: Fields, k: string): { href: string; label: string; newTab: boolean } | null => {
  const v = f[k] as { href?: unknown; label?: unknown; openInNewTab?: unknown } | undefined;
  return v && typeof v.href === "string" ? { href: v.href, label: typeof v.label === "string" ? v.label : "", newTab: v.openInNewTab === true } : null;
};
const list = (f: Fields, k: string): Fields[] => (Array.isArray(f[k]) ? (f[k] as { fields?: Fields }[]).map((i) => i.fields ?? {}) : []);

/** A link inside the preview: site paths navigate the preview, everything else is inert. */
function PreviewLink({
  href,
  onNavigate,
  className,
  style,
  children,
  ariaLabel,
  ariaCurrent,
}: {
  href: string;
  onNavigate: (href: string) => void;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  ariaLabel?: string;
  ariaCurrent?: "page";
}) {
  const internal = href.startsWith("/") || href.startsWith("#");
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      title={internal ? undefined : href}
      className={clsx(className, !internal && "cursor-default")}
      style={style}
      onClick={(e: MouseEvent) => {
        e.preventDefault();
        if (internal) onNavigate(href);
      }}
    >
      {children}
    </a>
  );
}

// ---- rich text (page-sections.tsx) ------------------------------------------------------------

type Inline = { type: string; text?: string; bold?: boolean; italic?: boolean; underline?: boolean; href?: string; runs?: Inline[] };
type Block = { type: string; level?: number; inlines?: Inline[]; ordered?: boolean; items?: Block[][] };

function Run({ run }: { run: Inline }) {
  let node: ReactNode = run.text ?? "";
  if (run.bold) node = <strong>{node}</strong>;
  if (run.italic) node = <em>{node}</em>;
  if (run.underline) node = <u>{node}</u>;
  return <>{node}</>;
}

function Inlines({ inlines, onNavigate }: { inlines?: Inline[]; onNavigate: (href: string) => void }) {
  return (
    <>
      {(inlines ?? []).map((inline, i) => {
        if (inline.type === "br") return <br key={i} />;
        if (inline.type === "link" && inline.href) {
          return (
            <PreviewLink key={i} href={inline.href} onNavigate={onNavigate} className="text-[var(--octo-brand)] underline">
              {(inline.runs ?? []).map((r, j) => (
                <Run key={j} run={r} />
              ))}
            </PreviewLink>
          );
        }
        return <Run key={i} run={inline} />;
      })}
    </>
  );
}

function RichText({ blocks, onNavigate }: { blocks: unknown; onNavigate: (href: string) => void }) {
  if (!Array.isArray(blocks)) return null;
  return (
    <div className="flex flex-col gap-3 text-[14px] leading-[1.9] text-[var(--octo-text-secondary)]">
      {(blocks as Block[]).map((block, i) => {
        switch (block.type) {
          case "h":
            return (
              <h3 key={i} className="text-[18px] font-bold text-[var(--octo-text-primary)]">
                <Inlines inlines={block.inlines} onNavigate={onNavigate} />
              </h3>
            );
          case "quote":
            return (
              <blockquote key={i} className="border-s-4 border-[var(--octo-brand)] ps-4 italic">
                <Inlines inlines={block.inlines} onNavigate={onNavigate} />
              </blockquote>
            );
          case "list": {
            const Tag = block.ordered ? "ol" : "ul";
            return (
              <Tag key={i} className={`ps-5 ${block.ordered ? "list-decimal" : "list-disc"}`}>
                {(block.items ?? []).map((item, j) => (
                  <li key={j}>
                    <RichText blocks={item} onNavigate={onNavigate} />
                  </li>
                ))}
              </Tag>
            );
          }
          case "p":
            return (
              <p key={i}>
                <Inlines inlines={block.inlines} onNavigate={onNavigate} />
              </p>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

// ---- shared/ui ------------------------------------------------------------------------------------

function SectionHeading({ title, id, bp }: { title: string; id?: string; bp: Breakpoints }) {
  return (
    <h2 id={id} className="flex scroll-mt-20 items-center gap-3">
      <span className="h-[26px] w-[4px] shrink-0 rounded-full bg-[var(--octo-brand)]" aria-hidden="true" />
      <span className={clsx("font-bold text-[var(--octo-text-primary)]", bp.sm ? "text-[28px]" : "text-[22px]")}>{title}</span>
    </h2>
  );
}

function Shell({ id, title, bp, children }: { id?: string; title?: string; bp: Breakpoints; children: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-20 flex-col gap-5">
      {title && <SectionHeading title={title} bp={bp} />}
      {children}
    </section>
  );
}

function DoodlePattern({ className }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true" focusable="false">
      <defs>
        <pattern id="octo-live-doodle" width="88" height="88" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
            <circle cx="18" cy="18" r="8" />
            <path d="M12 18h12M18 12v12" />
            <path d="M58 10v18M62 10v18M54 10c0 8 8 8 8 0" />
            <path d="M20 58c0-7 6-12 13-12s13 5 13 12z" />
            <path d="M18 62h30" />
            <path d="M66 52a9 9 0 1 0 .01 0M70 58l6 6" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#octo-live-doodle)" />
    </svg>
  );
}

// ---- header (site-header.tsx) ---------------------------------------------------------------------

function Header({ site, bp, path, onNavigate, onLanguage }: { site: LiveSite; bp: Breakpoints; path: string; onNavigate: (href: string) => void; onLanguage: (language: string) => void }) {
  const { t } = useI18n();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { options, links } = site.navigation;
  const label = (l: { label: string; href: string }) => l.label || (l.href === "/" ? t("store.nav.home") : "");
  const headerNav = links.filter((l) => l.inHeader);
  const drawerNav = links.filter((l) => l.inDrawer);
  const nextLanguage = site.languages.find((code) => code !== site.language);

  return (
    <header className={clsx("z-30 border-b border-[var(--octo-border-card)] bg-[var(--octo-card)]", options.stickyHeader && "sticky top-0")}>
      <div className={clsx("mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-6", bp.sm ? "px-6" : "px-4")}>
        <PreviewLink href="/" onNavigate={onNavigate} ariaLabel={site.brandName || "OCTOPUS"} className="flex shrink-0 items-center gap-2">
          {site.logoUrl ? (
            <img src={site.logoUrl} alt="" className="h-[30px] w-auto max-w-[120px] object-contain" />
          ) : (
            <span className="text-[16px] font-bold text-[var(--octo-text-primary)]">{site.brandName}</span>
          )}
        </PreviewLink>

        {bp.md && (
          <nav className="flex items-center gap-[26px]">
            {headerNav.map((entry) => {
              const active = options.showActivePageIndicator && path === entry.href;
              return (
                <PreviewLink
                  key={`${entry.href}-${entry.label}`}
                  href={entry.href}
                  onNavigate={onNavigate}
                  ariaCurrent={path === entry.href ? "page" : undefined}
                  className={clsx(
                    "relative text-[13.5px] transition-colors",
                    active
                      ? "font-semibold text-[var(--octo-brand)] after:absolute after:inset-x-0 after:-bottom-[17px] after:h-[2px] after:bg-[var(--octo-brand)]"
                      : "text-[var(--octo-text-primary)] hover:text-[var(--octo-brand)]"
                  )}
                >
                  {label(entry)}
                </PreviewLink>
              );
            })}
          </nav>
        )}

        <div className="flex shrink-0 items-center gap-2.5">
          {nextLanguage && (
            <button
              type="button"
              onClick={() => onLanguage(nextLanguage)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-1.5 text-[12px] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
            >
              <Languages size={14} aria-hidden="true" />
              {t("store.nav.language")}
            </button>
          )}
          <span aria-label={t("store.nav.cart")} className="relative grid h-[38px] w-[38px] place-items-center rounded-[11px] bg-[var(--octo-brand)] text-white">
            <ShoppingBag size={17} />
          </span>
          {!bp.md && (
            <button
              type="button"
              aria-label={t("store.nav.openMenu")}
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen((v) => !v)}
              className="grid h-[38px] w-[38px] place-items-center rounded-[11px] border border-[var(--octo-border-input)] text-[var(--octo-text-secondary)]"
            >
              {drawerOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
          )}
        </div>
      </div>

      {drawerOpen && !bp.md && (
        <nav className="border-t border-[var(--octo-divider)] bg-[var(--octo-card)] px-4 py-3">
          <ul className="flex flex-col">
            {drawerNav.map((entry) => (
              <li key={`${entry.href}-${entry.label}`}>
                <PreviewLink
                  href={entry.href}
                  onNavigate={(href) => {
                    setDrawerOpen(false);
                    onNavigate(href);
                  }}
                  className="block py-2.5 text-[13.5px] text-[var(--octo-text-primary)]"
                >
                  {label(entry)}
                </PreviewLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

// ---- hero (store-hero.tsx, as a published hero) ---------------------------------------------------

function Hero({ fields, brandName, bp, onNavigate }: { fields: Fields; brandName: string; bp: Breakpoints; onNavigate: (href: string) => void }) {
  const action = link(fields, "primaryAction");
  const heading = str(fields, "title") || brandName;
  const sub = str(fields, "subtitle");
  return (
    <section className="relative isolate overflow-hidden">
      <img src={media(fields, "background")?.url || storefrontAsset("hero.webp")} alt="" className={clsx("w-full object-cover", bp.sm ? "h-[600px]" : "h-[440px]")} />
      {fields.showOverlay !== false && <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/45 to-black/30" aria-hidden="true" />}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center">
        <h1 className={clsx("max-w-[860px] font-bold leading-[1.4] text-white", bp.sm ? "text-[44px]" : "text-[26px]")}>{heading}</h1>
        {sub && <p className={clsx("max-w-[720px] leading-[1.9] text-white/85", bp.sm ? "text-[15px]" : "text-[13px]")}>{sub}</p>}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          {action && (
            <PreviewLink
              href={action.href}
              onNavigate={onNavigate}
              className="inline-flex items-center gap-2 rounded-full border border-white/70 px-6 py-3 text-[13.5px] text-white transition-colors hover:bg-white/10"
            >
              <ClipboardList size={16} aria-hidden="true" />
              {action.label}
            </PreviewLink>
          )}
        </div>
      </div>
    </section>
  );
}

// ---- menu (category-mosaic.tsx, product-row.tsx, product-card.tsx) --------------------------------

const MOSAIC: readonly { slug: string; area: string; tall?: boolean }[] = [
  { slug: "desserts", area: "1 / 1 / 2 / 2" },
  { slug: "main", area: "1 / 2 / 3 / 3", tall: true },
  { slug: "breakfast", area: "1 / 3 / 2 / 4" },
  { slug: "drinks", area: "2 / 1 / 3 / 2" },
  { slug: "lunch", area: "2 / 3 / 3 / 4" },
];

function CategoryMosaic({ categories, bp, onNavigate }: { categories: LiveMenu["categories"]; bp: Breakpoints; onNavigate: (href: string) => void }) {
  const cols = bp.lg ? "grid-cols-3" : bp.sm ? "grid-cols-2" : "grid-cols-1";
  const tile = "group relative flex overflow-hidden rounded-[20px] bg-[var(--octo-store-soft)] p-5 transition-shadow hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]";
  const name = clsx("relative z-10 font-bold text-[var(--octo-text-primary)]", bp.sm ? "text-[20px]" : "text-[18px]");
  if (!categories.some((c) => MOSAIC.some((slot) => slot.slug === c.slug))) {
    return (
      <div className={clsx("grid gap-4", cols)}>
        {categories.map((category) => (
          <PreviewLink key={category.id} href="/menu" onNavigate={onNavigate} className={clsx(tile, "min-h-[190px] items-center gap-3")}>
            <DoodlePattern className="absolute inset-0 h-full w-full text-[#dfe3e8] opacity-50" />
            <span className={clsx(name, "flex-1")}>{category.name}</span>
            <img src={category.imageUrl} alt="" loading="lazy" className="relative z-10 h-full max-h-[150px] w-1/2 object-contain" />
          </PreviewLink>
        ))}
      </div>
    );
  }
  return (
    <div className={clsx("grid gap-4", cols)} style={bp.lg ? { gridTemplateRows: "210px 210px" } : undefined}>
      {MOSAIC.map((slot, index) => {
        const category = categories.find((c) => c.slug === slot.slug);
        if (!category) return null;
        return (
          <PreviewLink
            key={category.id}
            href="/menu"
            onNavigate={onNavigate}
            className={clsx(tile, "min-h-[190px]", slot.tall ? "flex-col" : index % 2 === 0 ? "flex-row" : "flex-row-reverse")}
            style={bp.lg ? { gridArea: slot.area } : undefined}
          >
            <DoodlePattern className="absolute inset-0 h-full w-full text-[#dfe3e8] opacity-50" />
            <span className={clsx(name, slot.tall ? "text-center" : "flex flex-1 items-center")}>{category.name}</span>
            <img src={category.imageUrl} alt="" loading="lazy" className={clsx("relative z-10 object-contain", slot.tall ? "mt-3 h-full min-h-0 w-full" : "h-full w-1/2")} />
          </PreviewLink>
        );
      })}
    </div>
  );
}

function ProductCard({ item }: { item: LiveMenu["items"][number] }) {
  const { t } = useI18n();
  return (
    <article className="relative flex flex-col rounded-2xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3">
      <div className="relative z-10 flex items-center justify-between gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--octo-border-card)] bg-[var(--octo-card)]" aria-label={t("store.card.favorite")}>
          <Heart size={13} className="text-[var(--octo-text-faint)]" />
        </span>
      </div>
      <img src={item.imageUrl} alt="" loading="lazy" className="mx-auto mt-2 h-[110px] w-auto max-w-full object-contain" />
      <div className="mt-3 flex items-center justify-between gap-2">
        <h3 className="truncate text-[13px] font-bold text-[var(--octo-text-primary)]">{item.name}</h3>
      </div>
      <p className="mt-1 line-clamp-2 text-[11px] leading-[1.6] text-[var(--octo-text-muted)]">{item.description}</p>
      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <span aria-label={t("store.card.addToCart")} className="relative z-10 grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-[var(--octo-brand)] text-white">
          <ShoppingBag size={16} />
        </span>
        <div className="flex min-w-0 flex-col items-end leading-tight">
          <span className="text-[14px] font-bold text-[var(--octo-brand)]">
            {item.price.toFixed(2)}
            <span className="ms-1 text-[9.5px] font-semibold">{t("store.currency")}</span>
          </span>
        </div>
      </div>
    </article>
  );
}

function MenuSection({ anchor, menu, bp, onNavigate }: { anchor: string; menu: LiveMenu; bp: Breakpoints; onNavigate: (href: string) => void }) {
  const { t } = useI18n();
  const items = menu.items.slice(0, 8);
  return (
    <>
      <section className="flex flex-col gap-5">
        <SectionHeading id={anchor} title={t("store.section.menu")} bp={bp} />
        <CategoryMosaic categories={menu.categories} bp={bp} onNavigate={onNavigate} />
      </section>
      {items.length > 0 && (
        <section className="flex flex-col gap-5">
          <SectionHeading id="products" title={t("store.nav.products")} bp={bp} />
          <div className={clsx("grid gap-4", bp.lg ? "grid-cols-4" : bp.sm ? "grid-cols-2" : "grid-cols-1")}>
            {items.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

// ---- sections (page-sections.tsx) -----------------------------------------------------------------

function Section({ section, site, menus, bp, onNavigate }: { section: LiveSection; site: LiveSite; menus: LiveSiteCanvasProps["menus"]; bp: Breakpoints; onNavigate: (href: string) => void }) {
  const f = section.fields;
  const anchor = section.anchor ?? undefined;
  switch (section.type) {
    case "hero":
      return <Hero fields={f} brandName={site.brandName} bp={bp} onNavigate={onNavigate} />;
    case "menu": {
      const key = section.source?.contentKey;
      if (!key) return null;
      const menu = menus[key];
      // Still loading: a quiet placeholder rather than a jump when it arrives.
      if (menu === undefined) return <div className="h-[220px] animate-pulse rounded-[20px] bg-[var(--octo-store-soft)]" aria-hidden />;
      if (!menu || menu.categories.length === 0) return null;
      return <MenuSection anchor={anchor ?? "menu"} menu={menu} bp={bp} onNavigate={onNavigate} />;
    }
    case "about":
    case "text": {
      const image = media(f, "image");
      if (!str(f, "title") && !f.body && !image) return null;
      return (
        <Shell id={anchor} title={str(f, "title")} bp={bp}>
          <div className={image && bp.md ? "grid grid-cols-2 items-center gap-8" : image ? "grid items-center gap-8" : ""}>
            <RichText blocks={f.body} onNavigate={onNavigate} />
            {image && <img src={image.url} alt={image.alt ?? ""} className="w-full rounded-2xl object-cover" />}
          </div>
        </Shell>
      );
    }
    case "cta": {
      const action = link(f, "action");
      if (!str(f, "title") && !str(f, "body") && !action) return null;
      return (
        <section id={anchor} className="flex flex-col items-center gap-4 rounded-2xl bg-[var(--octo-card)] px-6 py-10 text-center">
          {str(f, "title") && <h2 className="text-[22px] font-bold text-[var(--octo-text-primary)]">{str(f, "title")}</h2>}
          {str(f, "body") && <p className="max-w-[640px] text-[14px] text-[var(--octo-text-secondary)]">{str(f, "body")}</p>}
          {action && (
            <PreviewLink href={action.href} onNavigate={onNavigate} className="rounded-full bg-[var(--octo-brand)] px-6 py-3 text-[13.5px] text-white hover:opacity-90">
              {action.label || action.href}
            </PreviewLink>
          )}
        </section>
      );
    }
    case "contact": {
      const rows = (["address", "phone", "email", "hours"] as const).filter((k) => str(f, k));
      if (rows.length === 0) return null;
      return (
        <Shell id={anchor} title={str(f, "title")} bp={bp}>
          <ul className="flex flex-col gap-2 text-[14px] text-[var(--octo-text-secondary)]">
            {rows.map((k) => (
              <li key={k} dir={k === "phone" ? "ltr" : undefined} className={k === "phone" ? "text-start" : undefined}>
                {str(f, k)}
              </li>
            ))}
          </ul>
        </Shell>
      );
    }
    case "testimonials": {
      const items = list(f, "items").filter((i) => str(i, "quote"));
      if (items.length === 0) return null;
      return (
        <Shell id={anchor} title={str(f, "title")} bp={bp}>
          <div className={clsx("grid gap-4", bp.lg ? "grid-cols-3" : bp.sm ? "grid-cols-2" : "grid-cols-1")}>
            {items.map((item, i) => (
              <figure key={i} className="flex flex-col gap-3 rounded-2xl bg-[var(--octo-card)] p-5">
                <blockquote className="text-[14px] leading-[1.9] text-[var(--octo-text-secondary)]">{str(item, "quote")}</blockquote>
                {str(item, "author") && <figcaption className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{str(item, "author")}</figcaption>}
              </figure>
            ))}
          </div>
        </Shell>
      );
    }
    case "gallery": {
      const items = list(f, "items").filter((i) => media(i, "image"));
      if (items.length === 0) return null;
      return (
        <Shell id={anchor} title={str(f, "title")} bp={bp}>
          <div className={clsx("grid gap-3", bp.md ? "grid-cols-4" : "grid-cols-2")}>
            {items.map((item, i) => (
              <figure key={i} className="flex flex-col gap-1">
                <img src={media(item, "image")!.url} alt={media(item, "image")!.alt ?? str(item, "caption")} className="aspect-square w-full rounded-xl object-cover" />
                {str(item, "caption") && <figcaption className="text-[12px] text-[var(--octo-text-muted)]">{str(item, "caption")}</figcaption>}
              </figure>
            ))}
          </div>
        </Shell>
      );
    }
    case "social-feed": {
      const profile = link(f, "profile");
      if (!profile) return null;
      return (
        <Shell id={anchor} title={str(f, "title")} bp={bp}>
          <PreviewLink href={profile.href} onNavigate={onNavigate} className="text-[14px] text-[var(--octo-brand)] underline">
            {profile.label || profile.href}
          </PreviewLink>
        </Shell>
      );
    }
    default:
      // A section type the storefront has no widget for: it renders nothing there either.
      return null;
  }
}

// ---- footer (site-footer.tsx, PublishedSiteFooter) ------------------------------------------------

const SOCIAL_ICONS: Record<string, typeof Instagram> = { instagram: Instagram, facebook: Facebook, linkedin: Linkedin };

function Footer({ site, bp, onNavigate }: { site: LiveSite; bp: Breakpoints; onNavigate: (href: string) => void }) {
  const { contact, groups, socialLinks } = site.footer;
  const hasContact = Boolean(contact.address || contact.hours || contact.phone);
  return (
    <footer className="mt-16 bg-[var(--octo-store-footer)]">
      <div className={clsx("mx-auto grid max-w-[1200px] gap-9 py-12", bp.sm ? "px-6" : "px-4", bp.lg ? "grid-cols-4" : bp.sm ? "grid-cols-2" : "grid-cols-1")}>
        <div className="flex flex-col gap-3">
          {site.logoUrl ? (
            <img src={site.logoUrl} alt={site.brandName} className="h-[34px] w-auto max-w-[140px] object-contain" />
          ) : (
            <p className="text-[16px] font-bold text-[var(--octo-text-primary)]">{site.brandName}</p>
          )}
          {socialLinks.length > 0 && (
            <ul className="flex items-center gap-2.5">
              {socialLinks.map(({ network, url }) => {
                const Icon = SOCIAL_ICONS[network.toLowerCase()] ?? Globe;
                return (
                  <li key={`${network}-${url}`}>
                    <span title={url} aria-label={network} className="grid h-8 w-8 place-items-center rounded-full border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)]">
                      <Icon size={14} />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {groups.map((group, g) => (
          <div key={`${group.title}-${g}`} className="flex flex-col gap-3">
            <h3 className="text-[13px] font-bold text-[var(--octo-text-primary)]">{group.title}</h3>
            <ul className="flex flex-col gap-2.5">
              {group.links.map((l) => (
                <li key={`${l.label}-${l.href}`}>
                  <PreviewLink href={l.href} onNavigate={onNavigate} className="text-[12px] text-[var(--octo-text-secondary)] transition-colors hover:text-[var(--octo-text-primary)]">
                    {l.label}
                  </PreviewLink>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {hasContact && (
          <ul className="flex flex-col gap-2.5 text-[12px] text-[var(--octo-text-secondary)]">
            {contact.address && (
              <li className="flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                {contact.address}
              </li>
            )}
            {contact.hours && (
              <li className="flex items-start gap-2">
                <Clock size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                {contact.hours}
              </li>
            )}
            {contact.phone && (
              <li className="flex items-start gap-2">
                <Phone size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span dir="ltr">{contact.phone}</span>
              </li>
            )}
          </ul>
        )}
      </div>
    </footer>
  );
}

// ---- the page ---------------------------------------------------------------------------------------

/** The storefront's default faces (globals.css): Inter, and IBM Plex Sans Arabic for Arabic. */
export function storefrontFontFamily(fontName: string | null, direction: "ltr" | "rtl"): string {
  const latin = `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const base = direction === "rtl" ? `"IBM Plex Sans Arabic", ${latin}` : latin;
  return fontName ? `"${fontName.replace(/"/g, "")}", ${base}` : base;
}

export function LiveSiteCanvas({ site, device, menus, onNavigate, onLanguage }: LiveSiteCanvasProps) {
  const { t } = useI18n();
  const bp = breakpointsFor(device);
  const page = site.page;
  // A section hidden on this device class is not drawn (the storefront hides it at that breakpoint).
  const sections = (page?.sections ?? []).filter((s) => !s.hiddenOn.includes(device));
  const hero = sections[0]?.type === "hero" ? sections[0] : null;
  const body = hero ? sections.slice(1) : sections;

  const bodyFamily = storefrontFontFamily(site.fontName, site.direction);
  const headingFamily = site.headingFontName ? `"${site.headingFontName.replace(/"/g, "")}", ${bodyFamily}` : bodyFamily;

  return (
    <div
      dir={site.direction}
      lang={site.language}
      className="octo-live-site min-h-full bg-[var(--octo-store-page)] text-[var(--octo-text-primary)] antialiased"
      style={{ ...(site.cssVars as CSSProperties), colorScheme: "light", fontFamily: bodyFamily, ["--font-heading" as string]: headingFamily }}
    >
      {/* globals.css in the storefront: h1-h3 are set in the titles face. */}
      <style>{`.octo-live-site h1, .octo-live-site h2, .octo-live-site h3 { font-family: var(--font-heading); }`}</style>
      <Header site={site} bp={bp} path={page?.path ?? "/"} onNavigate={onNavigate} onLanguage={onLanguage} />
      <main>
        {page ? (
          <>
            {hero && <Section section={hero} site={site} menus={menus} bp={bp} onNavigate={onNavigate} />}
            <div className={clsx("mx-auto flex max-w-[1200px] flex-col gap-14 py-14", bp.sm ? "px-6" : "px-4")}>
              {!page.isHome && !hero && <h1 className="text-[26px] font-bold text-[var(--octo-text-primary)]">{page.title}</h1>}
              {body.map((section) => (
                <div key={section.sectionId}>
                  <Section section={section} site={site} menus={menus} bp={bp} onNavigate={onNavigate} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-2 px-4 py-24 text-center">
            {site.pageLoading ? (
              <div className="h-[320px] w-full animate-pulse rounded-2xl bg-[var(--octo-store-soft)]" aria-hidden />
            ) : (
              <p className="text-[18px] font-bold text-[var(--octo-text-primary)]">{t("publicLink.live.notServed")}</p>
            )}
          </div>
        )}
      </main>
      <Footer site={site} bp={bp} onNavigate={onNavigate} />
    </div>
  );
}
