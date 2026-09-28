"use client";

// The menu builder's live preview canvas (route /preview/menu). Renders nothing of its own: the merchant console frames it
// and sends the menu document with postMessage; it draws it with ThemedMenu. Clicks go back to the console (a section click
// selects it when the builder wires selection); nothing here ever navigates away.
import { useCallback, useEffect, useRef, useState } from "react";
import { fromMenuCanvas, type FromMenuCanvasBody, type MenuRenderMessage } from "@octopus/api-client";
import { defaultLocale, getDirection, locales, type Locale } from "@i18n/index";
import { StoreI18nProvider } from "@/app/providers";
import { canvasLinkTarget } from "@/views/builder-canvas/canvas-messages";
import { ThemedMenu } from "@/widgets/themed-menu";
import { acceptToMenuCanvas } from "./canvas-messages";

const ANNOUNCE_MS = 500;

function scrollToAnchor(anchor: string, tries = 10) {
  if (!anchor) return void window.scrollTo({ top: 0, behavior: "smooth" });
  const target = document.getElementById(anchor);
  if (target) target.scrollIntoView({ behavior: "smooth", block: "nearest" });
  else if (tries > 0) window.setTimeout(() => scrollToAnchor(anchor, tries - 1), 150);
}

export function MenuCanvas({ allowedOrigins }: { allowedOrigins: string[] }) {
  const [render, setRender] = useState<MenuRenderMessage | null>(null);
  const parentOrigin = useRef<string | null>(null);

  const send = useCallback((body: FromMenuCanvasBody) => {
    if (parentOrigin.current) window.parent.postMessage(fromMenuCanvas(body), parentOrigin.current);
  }, []);

  useEffect(() => {
    if (window.parent === window) return;
    const onMessage = (event: MessageEvent) => {
      const message = acceptToMenuCanvas(event, allowedOrigins, window.parent);
      if (!message) return;
      if (!parentOrigin.current) parentOrigin.current = event.origin;
      if (message.type === "render") setRender(message);
      else scrollToAnchor(message.anchor);
    };
    window.addEventListener("message", onMessage);
    const announce = () => {
      if (!parentOrigin.current) window.parent.postMessage(fromMenuCanvas({ type: "ready" }), "*");
    };
    announce();
    const timer = window.setInterval(announce, ANNOUNCE_MS);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearInterval(timer);
    };
  }, [allowedOrigins]);

  const highlight = render?.highlightSectionRef ?? null;
  useEffect(() => {
    if (highlight) scrollToAnchor(highlight);
  }, [highlight]);

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
      if (!selectable || target?.closest("button, input, select, textarea, label, [role='dialog']")) return;
      const section = target?.closest<HTMLElement>("[data-section-ref]");
      if (section?.dataset.sectionRef) send({ type: "select-section", sectionRef: section.dataset.sectionRef });
    };
    const onSubmit = (event: Event) => event.preventDefault();
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [send, selectable]);

  if (!render) return <p className="mx-auto max-w-[480px] px-6 py-24 text-center text-[14px] text-[var(--octo-text-muted)]">This page shows your menu while you edit it in the builder.</p>;

  const locale: Locale = (locales as readonly string[]).includes(render.document.language) ? (render.document.language as Locale) : defaultLocale;
  return (
    <StoreI18nProvider locale={locale}>
      <div dir={getDirection(locale)} lang={render.document.language}>
        <ThemedMenu document={render.document} mode={render.mode} selectable={render.selectable} highlightSectionRef={render.highlightSectionRef} />
      </div>
    </StoreI18nProvider>
  );
}
