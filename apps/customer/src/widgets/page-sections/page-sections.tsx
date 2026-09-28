"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { MenuCategory, MenuItem } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { AddToCartModal } from "@/features/cart/add-to-cart";
import type { PublicSection } from "@/shared/api/public-api";
import { SectionHeading } from "@/shared/ui";
import { CategoryMosaic } from "@/widgets/category-mosaic";
import { ProductRow } from "@/widgets/product-row";
import { StoreHero } from "@/widgets/store-hero";

export interface PageSectionsProps {
  sections: PublicSection[];
  /** The menu each Menu section is bound to, by its source.publicLinkKey. */
  menus: Record<string, { categories: MenuCategory[]; items: MenuItem[] }>;
  brandName: string;
  /** A page other than the home page opens with its title. */
  title?: string;
}

// ---- field readers (the public read resolves every field for the language) -----

type Fields = Record<string, unknown>;
const str = (f: Fields, k: string): string => (typeof f[k] === "string" ? (f[k] as string).trim() : "");
const media = (f: Fields, k: string): { url: string; alt?: string } | null => {
  const v = f[k] as { url?: unknown; alt?: unknown } | undefined;
  return v && typeof v.url === "string" ? { url: v.url, alt: typeof v.alt === "string" ? v.alt : undefined } : null;
};
const link = (f: Fields, k: string): { href: string; label: string; newTab: boolean } | null => {
  const v = f[k] as { href?: unknown; label?: unknown; openInNewTab?: unknown } | undefined;
  return v && typeof v.href === "string"
    ? { href: v.href, label: typeof v.label === "string" ? v.label : "", newTab: v.openInNewTab === true }
    : null;
};
const list = (f: Fields, k: string): Fields[] =>
  Array.isArray(f[k]) ? (f[k] as { fields?: Fields }[]).map((i) => i.fields ?? {}) : [];

// ---- rich text ---------------------------------------------------------------------

type Inline = { type: string; text?: string; bold?: boolean; italic?: boolean; underline?: boolean; href?: string; runs?: Inline[] };
type Block = { type: string; level?: number; inlines?: Inline[]; ordered?: boolean; items?: Block[][] };

function Run({ run }: { run: Inline }) {
  let node: ReactNode = run.text ?? "";
  if (run.bold) node = <strong>{node}</strong>;
  if (run.italic) node = <em>{node}</em>;
  if (run.underline) node = <u>{node}</u>;
  return <>{node}</>;
}

function Inlines({ inlines }: { inlines?: Inline[] }) {
  return (
    <>
      {(inlines ?? []).map((inline, i) => {
        if (inline.type === "br") return <br key={i} />;
        if (inline.type === "link" && inline.href) {
          return (
            <a key={i} href={inline.href} className="text-[var(--octo-brand)] underline">
              {(inline.runs ?? []).map((r, j) => <Run key={j} run={r} />)}
            </a>
          );
        }
        return <Run key={i} run={inline} />;
      })}
    </>
  );
}

function RichText({ blocks }: { blocks: unknown }) {
  if (!Array.isArray(blocks)) return null;
  return (
    <div className="flex flex-col gap-3 text-[14px] leading-[1.9] text-[var(--octo-text-secondary)]">
      {(blocks as Block[]).map((block, i) => {
        switch (block.type) {
          case "h":
            return (
              <h3 key={i} className="text-[18px] font-bold text-[var(--octo-text-primary)]">
                <Inlines inlines={block.inlines} />
              </h3>
            );
          case "quote":
            return (
              <blockquote key={i} className="border-s-4 border-[var(--octo-brand)] ps-4 italic">
                <Inlines inlines={block.inlines} />
              </blockquote>
            );
          case "list": {
            const Tag = block.ordered ? "ol" : "ul";
            return (
              <Tag key={i} className={`ps-5 ${block.ordered ? "list-decimal" : "list-disc"}`}>
                {(block.items ?? []).map((item, j) => (
                  <li key={j}>
                    <RichText blocks={item} />
                  </li>
                ))}
              </Tag>
            );
          }
          case "p":
            return (
              <p key={i}>
                <Inlines inlines={block.inlines} />
              </p>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

// ---- sections ------------------------------------------------------------------------

function Shell({ id, title, children }: { id?: string; title?: string; children: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-20 flex-col gap-5">
      {title && <SectionHeading title={title} />}
      {children}
    </section>
  );
}

function MenuSection({
  anchor,
  menu,
  onAdd,
}: {
  anchor: string;
  menu: { categories: MenuCategory[]; items: MenuItem[] };
  onAdd: (item: MenuItem) => void;
}) {
  const { t } = useI18n();
  const hrefFor = (item: MenuItem) => {
    const category = menu.categories.find((c) => c.id === item.categoryId);
    return category ? `/menu/${category.slug}/${item.id}` : "/menu";
  };
  return (
    <>
      <section className="flex flex-col gap-5">
        <SectionHeading id={anchor} title={t("store.section.menu")} />
        <CategoryMosaic categories={menu.categories} />
      </section>
      {menu.items.length > 0 && (
        <ProductRow id="products" title={t("store.nav.products")} items={menu.items.slice(0, 8)} hrefFor={hrefFor} onAdd={onAdd} />
      )}
    </>
  );
}

/** The breakpoint classes that hide a section on the devices its owner chose: phones below
 *  md, tablets from md to lg, desktops from lg (the builder's preview uses the same split). */
const HIDDEN_ON: Record<string, string> = { mobile: "max-md:hidden", tablet: "md:max-lg:hidden", desktop: "lg:hidden" };
export const hiddenOnClass = (hiddenOn: readonly string[] | null | undefined): string =>
  (hiddenOn ?? []).map((device) => HIDDEN_ON[device]).filter(Boolean).join(" ");

/** Renders a published page's sections in order. Section types the storefront has
 *  no widget for, and sections with nothing to show, are skipped. */
export function PageSections({ sections, menus, brandName, title }: PageSectionsProps) {
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const hero = sections[0]?.type === "hero" ? sections[0] : null;
  const body = hero ? sections.slice(1) : sections;

  function render(section: PublicSection): ReactNode {
    const f = section.fields ?? {};
    const anchor = section.anchor ?? undefined;
    switch (section.type) {
      case "hero": {
        const action = link(f, "primaryAction");
        return (
          <StoreHero
            copy={{
              heading: str(f, "title") || brandName,
              subheading: str(f, "subtitle"),
              primaryCta: action?.label ?? "",
              secondaryCta: "",
              imageUrl: media(f, "background")?.url ?? null,
              primaryHref: action?.href ?? null,
              published: true,
              showOverlay: f.showOverlay !== false,
            }}
          />
        );
      }
      case "menu": {
        const key = section.source?.publicLinkKey;
        const menu = key ? menus[key] : undefined;
        if (!menu || menu.categories.length === 0) return null;
        return <MenuSection anchor={anchor ?? "menu"} menu={menu} onAdd={setSelected} />;
      }
      case "about":
      case "text": {
        const image = media(f, "image");
        if (!str(f, "title") && !f.body && !image) return null;
        return (
          <Shell id={anchor} title={str(f, "title")}>
            <div className={image ? "grid items-center gap-8 md:grid-cols-2" : ""}>
              <RichText blocks={f.body} />
              {image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image.url} alt={image.alt ?? ""} className="w-full rounded-2xl object-cover" />
              )}
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
              <Link
                href={action.href}
                target={action.newTab ? "_blank" : undefined}
                className="rounded-full bg-[var(--octo-brand)] px-6 py-3 text-[13.5px] text-white hover:opacity-90"
              >
                {action.label || action.href}
              </Link>
            )}
          </section>
        );
      }
      case "contact": {
        const rows = (["address", "phone", "email", "hours"] as const).filter((k) => str(f, k));
        if (rows.length === 0) return null;
        return (
          <Shell id={anchor} title={str(f, "title")}>
            <ul className="flex flex-col gap-2 text-[14px] text-[var(--octo-text-secondary)]">
              {rows.map((k) => (
                <li key={k}>
                  {k === "phone" ? (
                    <a href={`tel:${str(f, k)}`} dir="ltr">{str(f, k)}</a>
                  ) : k === "email" ? (
                    <a href={`mailto:${str(f, k)}`}>{str(f, k)}</a>
                  ) : (
                    str(f, k)
                  )}
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
          <Shell id={anchor} title={str(f, "title")}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item, i) => (
                <figure key={i} className="flex flex-col gap-3 rounded-2xl bg-[var(--octo-card)] p-5">
                  <blockquote className="text-[14px] leading-[1.9] text-[var(--octo-text-secondary)]">{str(item, "quote")}</blockquote>
                  {str(item, "author") && (
                    <figcaption className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{str(item, "author")}</figcaption>
                  )}
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
          <Shell id={anchor} title={str(f, "title")}>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {items.map((item, i) => (
                <figure key={i} className="flex flex-col gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
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
          <Shell id={anchor} title={str(f, "title")}>
            <a href={profile.href} target="_blank" rel="noopener noreferrer" className="text-[14px] text-[var(--octo-brand)] underline">
              {profile.label || profile.href}
            </a>
          </Shell>
        );
      }
      default:
        // A section type this storefront has no widget for (or a newer one): skipped.
        return null;
    }
  }

  return (
    <>
      {hero && (
        <div data-section-id={hero.sectionId} className={hiddenOnClass(hero.hiddenOn) || undefined}>
          {render(hero)}
        </div>
      )}
      <div className="mx-auto flex max-w-[1200px] flex-col gap-14 px-4 py-14 sm:px-6">
        {title && !hero && <h1 className="text-[26px] font-bold text-[var(--octo-text-primary)]">{title}</h1>}
        {body.map((section) => {
          const node = render(section);
          return node ? (
            <div key={section.sectionId} data-section-id={section.sectionId} className={hiddenOnClass(section.hiddenOn) || undefined}>
              {node}
            </div>
          ) : null;
        })}
      </div>
      <AddToCartModal item={selected} onClose={() => setSelected(null)} />
    </>
  );
}
