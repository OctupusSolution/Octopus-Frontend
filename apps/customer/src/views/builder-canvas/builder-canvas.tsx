"use client";

// The Public Link builder's live preview canvas (route /preview/builder). It fetches nothing and
// renders nothing of its own: the merchant console frames it and sends, with postMessage, the site
// as the draft would publish it (the same shapes the public read returns), which it renders with the
// storefront's own components. Clicks go back to the console: a link to one of the site's pages
// opens that page in the builder, the language pill switches the builder's preview language, and
// a click on a section selects it for editing. Nothing here ever navigates away.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fromCanvas, type BuilderRenderMessage, type FromCanvasBody } from "@octopus/api-client";
import { defaultLocale, locales, type Locale } from "@i18n/index";
import { StoreI18nProvider, useI18n } from "@/app/providers";
import { themeStyle } from "@/shared/api/brand-theme";
import { menuFromDocument } from "@/shared/api/menu-document";
import { PageSections, sectionsOf } from "@/widgets/page-sections";
import { navLinks, SiteHeader } from "@/widgets/site-header";
import { PublishedSiteFooter } from "@/widgets/site-footer";
import { acceptToCanvas, canvasLinkTarget } from "./canvas-messages";

const COPY = {
  en: { waiting: "This page shows your site while you edit it in the builder.", notServed: "This page is not on your site right now." },
  ar: { waiting: "تعرض هذه الصفحة موقعك أثناء تعديله في أداة البناء.", notServed: "هذه الصفحة غير ظاهرة على موقعك الآن." },
} as const;

const ANNOUNCE_MS = 500;

function scrollToAnchor(anchor: string, tries = 10) {
  if (!anchor) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const target = document.getElementById(anchor);
  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  else if (tries > 0) window.setTimeout(() => scrollToAnchor(anchor, tries - 1), 150);
}

export function BuilderCanvas({ allowedOrigins }: { allowedOrigins: string[] }) {
  const [render, setRender] = useState<BuilderRenderMessage | null>(null);
  const parentOrigin = useRef<string | null>(null);

  const send = useCallback((body: FromCanvasBody) => {
    if (parentOrigin.current) window.parent.postMessage(fromCanvas(body), parentOrigin.current);
  }, []);

  // Handshake: announce readiness (it carries no data, so "*" is safe) until a builder at an
  // allowed origin answers; from then on, talk to that origin only.
  useEffect(() => {
    if (window.parent === window) return;
    const onMessage = (event: MessageEvent) => {
      const message = acceptToCanvas(event, allowedOrigins, window.parent);
      if (!message) return;
      parentOrigin.current = event.origin;
      if (message.type === "render") setRender(message);
      else scrollToAnchor(message.anchor);
    };
    window.addEventListener("message", onMessage);
    const announce = () => {
      if (!parentOrigin.current) window.parent.postMessage(fromCanvas({ type: "ready" }), "*");
    };
    announce();
    const timer = window.setInterval(announce, ANNOUNCE_MS);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearInterval(timer);
    };
  }, [allowedOrigins]);

  // The document takes the site's language, direction and theme, as the root layout does for a published site.
  const shell = render?.shell ?? null;
  useEffect(() => {
    if (!shell) return;
    const html = document.documentElement;
    html.lang = shell.language;
    html.dir = shell.direction;
    const style = themeStyle(shell) as Record<string, string>;
    for (const [name, value] of Object.entries(style)) html.style.setProperty(name, value);
    return () => {
      for (const name of Object.keys(style)) html.style.removeProperty(name);
    };
  }, [shell]);

  // Another page starts from the top, as a real navigation would.
  const pageId = render?.page?.pageId ?? null;
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pageId]);

  // The section being edited comes into view when it changes.
  const highlight = render?.highlightSectionId ?? null;
  useEffect(() => {
    if (!highlight) return;
    document.querySelector(`[data-section-id="${CSS.escape(highlight)}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [highlight]);

  // Links never navigate the frame; forms never submit. A section click is reported only when
  // the builder wired up selection (the Customize step) — elsewhere the canvas is a plain preview.
  const selectable = render?.selectable ?? false;
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest("a[href]");
      if (anchor) {
        event.preventDefault();
        const href = canvasLinkTarget(anchor.getAttribute("href") ?? "", window.location.origin);
        if (href) send({ type: "navigate", href });
        return;
      }
      if (!selectable) return;
      if (target?.closest("button, input, select, textarea, label, [role='dialog']")) return;
      const section = target?.closest<HTMLElement>("[data-section-id]");
      if (section?.dataset.sectionId) send({ type: "select-section", sectionId: section.dataset.sectionId });
    };
    const onSubmit = (event: Event) => event.preventDefault();
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [send, selectable]);

  if (!render) {
    return <p className="mx-auto max-w-[480px] px-6 py-24 text-center text-[14px] text-[var(--octo-text-muted)]">{COPY.en.waiting}</p>;
  }

  const locale: Locale = (locales as readonly string[]).includes(render.shell.language) ? (render.shell.language as Locale) : defaultLocale;
  return (
    <StoreI18nProvider locale={locale}>
      <style>{`
        ${render.selectable ? `[data-section-id] { cursor: pointer; }\n        [data-section-id]:hover { outline: 1px dashed rgba(13, 110, 253, 0.5); outline-offset: 4px; }` : ""}
        ${highlight ? `[data-section-id="${CSS.escape(highlight)}"] { outline: 2px solid #0D6EFD; outline-offset: 4px; }` : ""}
      `}</style>
      <CanvasSite render={render} locale={locale} onLanguage={(language) => send({ type: "language", language })} />
    </StoreI18nProvider>
  );
}

function CanvasSite({ render, locale, onLanguage }: { render: BuilderRenderMessage; locale: Locale; onLanguage: (language: string) => void }) {
  const { t } = useI18n();
  const { shell, page } = render;
  const menus = useMemo(
    () => Object.fromEntries(Object.entries(render.menus).flatMap(([key, doc]) => (doc ? [[key, menuFromDocument(doc)] as const] : []))),
    [render.menus]
  );
  const copy = locale === "ar" ? COPY.ar : COPY.en;

  return (
    <>
      <SiteHeader
        locale={locale}
        logoUrl={shell.brand.logo?.url ?? null}
        brandName={shell.brand.displayName}
        nav={navLinks(shell, t("store.nav.home"))}
        languages={shell.languages.map((l) => l.code)}
        options={shell.navigation.options}
        currentPath={page?.path ?? "/"}
        onSwitchLanguage={onLanguage}
      />
      <main>
        {page ? (
          <PageSections sections={sectionsOf(page)} menus={menus} brandName={shell.brand.displayName} title={page.isHome ? undefined : page.title} />
        ) : (
          <div className="mx-auto max-w-[1200px] px-4 py-24 text-center text-[16px] text-[var(--octo-text-muted)]">
            {render.pageLoading ? "…" : copy.notServed}
          </div>
        )}
      </main>
      <PublishedSiteFooter
        site={{
          brandName: shell.brand.displayName,
          logoUrl: shell.brand.logo?.url ?? null,
          groups: shell.footer.groups,
          socialLinks: shell.footer.socialLinks,
          contact: shell.footer.contact,
        }}
      />
    </>
  );
}
