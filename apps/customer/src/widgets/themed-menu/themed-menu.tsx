"use client";

// The customer's menu page, drawn from the public menu document with the menu's own theme. One component for every
// entry point: the site's /menu (order mode — add buttons, sticky cart), the QR link /c/{key} and the builder's canvas
// (view mode never shows ordering controls). Section wrappers carry data-section-ref="s{index}" so the builder canvas can
// outline and select them.
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type CSSProperties } from "react";
import type { MenuItem, PublicMenuDocument } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { useOrderingSession } from "@/entities/order";
import { AddToCartModal } from "@/features/cart/add-to-cart";
import { menuFromDocument } from "@/shared/api/menu-document";
import { BottomBar, CategoryNav } from "./category-nav";
import { EntryCard } from "./entry-card";
import { ItemDetails } from "./item-details";
import { menuView, type EntryView } from "./menu-model";
import { menuFontStack, menuLayout, menuThemeStyle } from "./menu-theme";
import { SectionBlock } from "./section-block";

export interface ThemedMenuProps {
  document: PublicMenuDocument;
  mode: "order" | "view";
  selectable?: boolean;
  highlightSectionRef?: string | null;
  /** "brand": the menu's own logo/name/hero header (QR and canvas); "none": the site's header is already above. */
  header?: "brand" | "none";
  /** False in the builder canvas: NewPage then opens the overlay, as view mode does, because navigating to an item page
   *  would take the canvas iframe away from the builder. Default true. */
  itemPages?: boolean;
}

export function ThemedMenu({ document, mode, selectable = false, highlightSectionRef = null, header = "brand", itemPages = true }: ThemedMenuProps) {
  const { t } = useI18n();
  const router = useRouter();
  const layout = menuLayout(document.menu.theme);
  const view = useMemo(() => menuView(document, (code) => (code === "SAR" ? t("store.currency") : code)), [document, t]);
  // The storefront's cart items, addressed by the same refs (menuFromDocument ids are `cat-{n}-{ref}`).
  const orderItems = useMemo(() => (mode === "order" ? menuFromDocument(document) : null), [document, mode]);
  const [adding, setAdding] = useState<MenuItem | null>(null);
  const [open, setOpen] = useState<EntryView | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(view.sections[0]?.ref ?? null);

  const style = { ...menuThemeStyle(document.menu.theme) } as CSSProperties & Record<string, string>;
  const body = menuFontStack(document.menu.theme.bodyFontCode);
  const title = menuFontStack(document.menu.theme.titleFontCode);
  if (body) style.fontFamily = body;
  if (title) style["--font-heading"] = title;

  function itemFor(sectionIndex: number, ref: string): MenuItem | null {
    return orderItems?.items.find((item) => item.id === `cat-${sectionIndex + 1}-${ref}`) ?? null;
  }
  function jump(ref: string) {
    setActive(ref);
    globalThis.document?.getElementById(ref)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  /** NewPage in order mode: the item's own page, when item pages are allowed and the entry resolves to a storefront item.
   *  Otherwise null. */
  function pageFor(sectionIndex: number, orderItem: MenuItem | null): string | null {
    if (layout.details !== "new-page" || mode !== "order" || !itemPages || !orderItem) return null;
    const slug = orderItems?.categories[sectionIndex]?.slug;
    return slug ? `/menu/${slug}/${orderItem.id}` : null;
  }
  function openEntry(entry: EntryView, page: string | null) {
    if (page) router.push(page);
    else if (layout.details === "same-page") setExpanded((cur) => (cur === entry.ref ? null : entry.ref));
    else setOpen(entry); // Overlay, and NewPage in view mode, in the canvas, or when the item page cannot be resolved
  }
  // Only a section ref (s{index}) reaches the <style> below.
  const highlight = highlightSectionRef && /^s\d+$/.test(highlightSectionRef) ? highlightSectionRef : null;

  const status =
    view.availability === "NotAvailableNow"
      ? t("store.menu.notAvailableNow")
      : view.availability === "PreOrder"
        ? t("store.menu.preOrder").replace("{time}", view.nextAvailableAtUtc ? new Date(view.nextAvailableAtUtc).toLocaleString() : "")
        : null;

  return (
    <div className="min-h-full bg-[var(--octo-store-page)] text-[var(--octo-text-primary)]" style={style}>
      {highlight && <style>{`[data-section-ref="${highlight}"]{outline:2px solid #0D6EFD;outline-offset:6px;border-radius:12px}`}</style>}
      {selectable && <style>{`[data-selectable]{cursor:pointer}[data-selectable]:hover{outline:1px dashed rgba(13,110,253,.5);outline-offset:6px;border-radius:12px}`}</style>}

      {header === "brand" && (
        <header className="relative isolate overflow-hidden">
          {view.heroUrl && <img src={view.heroUrl} alt="" className="h-[260px] w-full object-cover sm:h-[340px]" />}
          {view.heroUrl && <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/20" aria-hidden />}
          <div className={view.heroUrl ? "absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-white" : "flex flex-col items-center gap-3 px-6 pt-10 text-center"}>
            {view.logoUrl ? <img src={view.logoUrl} alt={view.name} className="h-[56px] w-auto max-w-[180px] object-contain" /> : <p className="text-[22px] font-bold">{view.name}</p>}
            {view.heroText && <h1 className="max-w-[720px] text-[26px] font-bold sm:text-[36px]">{view.heroText}</h1>}
            {view.heroSubtext && <p className="max-w-[640px] text-[14px] opacity-85">{view.heroSubtext}</p>}
          </div>
        </header>
      )}

      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 py-8 pb-28 sm:px-6">
        {status && <p role="status" className="rounded-xl bg-[var(--octo-store-soft)] px-4 py-3 text-[13.5px] font-medium text-[var(--octo-text-secondary)]">{status}</p>}
        {view.sections.length === 0 ? (
          <p className="py-16 text-center text-[14px] text-[var(--octo-text-muted)]">{t("store.menu.empty")}</p>
        ) : (
          <>
            <CategoryNav sections={view.sections} nav={layout.nav} category={layout.category} active={active} onJump={jump} />
            {view.sections.map((section, sectionIndex) => (
              <SectionBlock key={section.ref} section={section} selectable={selectable}>
                {section.entries.map((entry) => {
                  const orderItem = entry.kind === "item" ? itemFor(sectionIndex, entry.ref) : null;
                  const page = pageFor(sectionIndex, orderItem);
                  return (
                    <div key={entry.ref} className="flex flex-col gap-2" data-item-page={page ?? undefined}>
                      <EntryCard
                        entry={entry}
                        card={layout.card}
                        showTags={layout.showTags}
                        onAdd={mode === "order" && orderItem ? () => setAdding(orderItem) : undefined}
                        onOpen={() => openEntry(entry, page)}
                      />
                      {expanded === entry.ref && entry.kind === "item" && entry.description && <p className="px-2 text-[13px] leading-[1.8] text-[var(--octo-text-secondary)]">{entry.description}</p>}
                    </div>
                  );
                })}
              </SectionBlock>
            ))}
          </>
        )}
      </div>

      {mode === "order" && layout.stickyCart && <StickyCart />}
      {layout.nav === "bottom-bar" && <BottomBar />}
      <ItemDetails entry={open} onClose={() => setOpen(null)} />
      {mode === "order" && <AddToCartModal item={adding} onClose={() => setAdding(null)} />}
    </div>
  );
}

function StickyCart() {
  const { t } = useI18n();
  const { state } = useOrderingSession();
  const count = state.lines.reduce((sum, line) => sum + line.quantity, 0);
  return (
    <Link href="/cart" data-sticky-cart className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-[560px] items-center justify-between rounded-2xl bg-[var(--octo-brand)] px-5 py-3 text-[14px] font-semibold text-white shadow-lg">
      <span className="inline-flex items-center gap-2">
        <ShoppingBag size={18} aria-hidden />
        {t("store.nav.cart")}
      </span>
      <span>{count}</span>
    </Link>
  );
}
