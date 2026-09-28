// The customer storefront itself, framed: its /preview/builder canvas, laid out at the device's real
// width and scaled into the card. Every change of `payload` is posted to it (at most once per
// animation frame), and it is re-posted whenever the canvas says it is ready (a storefront reload
// recovers on its own). No `ready` within READY_TIMEOUT_MS -> `onUnavailable`, and the host shows
// its mirror instead.
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toCanvas, type BuilderRenderPayload } from "@octopus/api-client";
import { acceptFromCanvas, canvasUrl, frameGeometry, READY_TIMEOUT_MS } from "../_shared/frame-bridge";
import { VIEWPORT_WIDTH, type LiveDevice } from "./live-site-canvas";

export interface StorefrontFrameProps {
  origin: string;
  device: LiveDevice;
  payload: BuilderRenderPayload;
  /** Scroll the canvas to an anchor ("" = top) each time `id` changes. */
  scrollRequest: { anchor: string; id: number } | null;
  onNavigate: (href: string) => void;
  onLanguage: (language: string) => void;
  onSelectSection?: (sectionId: string) => void;
  onUnavailable: () => void;
  height: number | string;
  maxCardWidth: number;
  title: string;
}

export function StorefrontFrame({ origin, device, payload, scrollRequest, height, maxCardWidth, title, ...handlers }: StorefrontFrameProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [readyCount, setReadyCount] = useState(0);
  // The latest callbacks, so the message listener is attached once per origin.
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => setSize({ width: box.clientWidth, height: box.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let ready = false;
    setReadyCount(0);
    const onMessage = (event: MessageEvent) => {
      const message = acceptFromCanvas(event, origin, frameRef.current?.contentWindow);
      if (!message) return;
      switch (message.type) {
        case "ready":
          ready = true;
          setReadyCount((n) => n + 1);
          break;
        case "navigate":
          latest.current.onNavigate(message.href);
          break;
        case "language":
          latest.current.onLanguage(message.language);
          break;
        case "select-section":
          latest.current.onSelectSection?.(message.sectionId);
          break;
      }
    };
    window.addEventListener("message", onMessage);
    const timer = window.setTimeout(() => {
      if (!ready) latest.current.onUnavailable();
    }, READY_TIMEOUT_MS);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timer);
    };
  }, [origin]);

  // Render: once per animation frame at most, and again on every `ready`.
  useEffect(() => {
    if (readyCount === 0) return;
    const id = requestAnimationFrame(() => frameRef.current?.contentWindow?.postMessage(toCanvas({ type: "render", ...payload }), origin));
    return () => cancelAnimationFrame(id);
  }, [readyCount, payload, origin]);

  const scrollId = scrollRequest?.id ?? 0;
  useEffect(() => {
    if (readyCount === 0 || !scrollRequest) return;
    const id = requestAnimationFrame(() => frameRef.current?.contentWindow?.postMessage(toCanvas({ type: "scroll-to", anchor: scrollRequest.anchor }), origin));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyCount > 0, scrollId, origin]);

  const viewport = VIEWPORT_WIDTH[device];
  const geo = frameGeometry(viewport, size.width, size.height, maxCardWidth);

  return (
    <div ref={boxRef} className="relative overflow-hidden rounded-xl border border-[var(--octo-border-card)] bg-[#f7f8fa]" style={{ height }}>
      {geo.scale > 0 && (
        <iframe
          ref={frameRef}
          src={canvasUrl(origin)}
          title={title}
          sandbox="allow-scripts allow-same-origin allow-forms"
          className="absolute top-0 border-0 bg-white"
          style={{
            left: Math.max(0, (size.width - geo.drawnWidth) / 2),
            width: viewport,
            height: geo.frameHeight,
            transform: `scale(${geo.scale})`,
            transformOrigin: "top left",
          }}
        />
      )}
      {readyCount === 0 && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-[var(--octo-text-muted)]" aria-hidden>
          <Loader2 size={20} className="animate-spin" />
        </div>
      )}
    </div>
  );
}
