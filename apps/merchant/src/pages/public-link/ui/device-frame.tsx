// The card every step wraps its `StorefrontPreview` in: a title (and optional
// subtitle), the device switcher, optional host actions and a preview-language
// menu, then the preview constrained to the active device's width.
//
// A `paged` frame shows the preview inside a fixed-height viewport with dots
// and prev/next arrows beneath it, as the frames do. The dots are the
// storefront's own blocks — hero, menu, offers, footer — which the widget tags
// with `data-preview-slide`; the arrows scroll the viewport to them, and
// scrolling by hand moves the active dot.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Globe, Monitor, Smartphone, Tablet } from "lucide-react";
import clsx from "clsx";
import { getDirection, type Locale } from "@i18n/index";
import { Card, Segmented } from "@ui/primitives";
import { I18nScope, useI18n } from "@/app/providers/i18n-provider";
import { StorefrontPreview, type StorefrontPreviewModel, type PreviewDevice } from "@/widgets/storefront-preview";

const DEVICE_ICON: Readonly<Record<PreviewDevice, typeof Monitor>> = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
};

const DEVICE_LABEL_KEY: Readonly<Record<PreviewDevice, string>> = {
  desktop: "publicLink.device.desktop",
  tablet: "publicLink.device.tablet",
  mobile: "publicLink.device.mobile",
};

// Desktop fills the column; tablet and mobile shrink to roughly device width so
// the preview reads as a device sitting inside the card rather than a
// stretched desktop layout.
const DEVICE_MAX_WIDTH: Readonly<Record<PreviewDevice, string>> = {
  desktop: "max-w-full",
  tablet: "max-w-[520px]",
  mobile: "max-w-[300px]",
};

const VIEWPORT_HEIGHT: Readonly<Record<PreviewDevice, string>> = {
  desktop: "h-[460px]",
  tablet: "h-[540px]",
  mobile: "h-[580px]",
};

const DEFAULT_DEVICES: readonly PreviewDevice[] = ["desktop", "tablet", "mobile"];
const PREVIEW_LOCALES: readonly Locale[] = ["en", "ar"];

export interface DeviceFrameProps {
  model: StorefrontPreviewModel;
  device: PreviewDevice;
  onDevice: (device: PreviewDevice) => void;
  devices?: readonly PreviewDevice[];
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Fixed-height viewport with slide dots and prev/next arrows. */
  paged?: boolean;
  /** Rebuilds the model for another locale. Supplying it shows the preview
   *  language menu, so a merchant can see their Arabic site from an English
   *  console and the other way round. */
  modelFor?: (t: (key: string) => string, locale: string) => StorefrontPreviewModel;
}

/** Module scope: rendered inside an `I18nScope`, so `useI18n` here answers in
 *  the preview's language rather than the app's. */
function ScopedPreview({ modelFor }: { modelFor: NonNullable<DeviceFrameProps["modelFor"]> }) {
  const { t, locale } = useI18n();
  return <StorefrontPreview model={modelFor(t, locale)} />;
}

function slideTop(viewport: HTMLElement, slide: HTMLElement): number {
  return slide.getBoundingClientRect().top - viewport.getBoundingClientRect().top + viewport.scrollTop;
}

export function DeviceFrame({
  model,
  device,
  onDevice,
  devices = DEFAULT_DEVICES,
  title,
  subtitle,
  actions,
  paged = false,
  modelFor,
}: DeviceFrameProps) {
  const { t, locale } = useI18n();
  const [previewLocale, setPreviewLocale] = useState<Locale>(locale as Locale);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [slideCount, setSlideCount] = useState(0);
  const [activeSlide, setActiveSlide] = useState(0);

  const scoped = Boolean(modelFor) && previewLocale !== locale;

  function slides(): HTMLElement[] {
    return Array.from(viewportRef.current?.querySelectorAll<HTMLElement>("[data-preview-slide]") ?? []);
  }

  // Re-count whenever the preview's content changes — toggling a section on
  // a step adds or removes a block without remounting this card.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!paged || !viewport) return;
    const measure = () => setSlideCount(slides().length);
    measure();
    const observer = new MutationObserver(measure);
    observer.observe(viewport, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [paged, device, previewLocale]);

  // A device or language switch rebuilds the page; start it from the top.
  useEffect(() => {
    viewportRef.current?.scrollTo({ top: 0 });
    setActiveSlide(0);
  }, [device, previewLocale]);

  function handleScroll() {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const all = slides();
    let current = 0;
    all.forEach((slide, index) => {
      if (slideTop(viewport, slide) <= viewport.scrollTop + 12) current = index;
    });
    // Scrolled to the bottom, the last block may never reach the top edge.
    if (viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 2) current = all.length - 1;
    setActiveSlide(Math.max(0, current));
  }

  function goToSlide(index: number) {
    const viewport = viewportRef.current;
    const target = slides()[index];
    if (!viewport || !target) return;
    viewport.scrollTo({ top: slideTop(viewport, target), behavior: "smooth" });
    setActiveSlide(index);
  }

  const preview =
    scoped && modelFor ? (
      <I18nScope locale={previewLocale}>
        <div dir={getDirection(previewLocale)}>
          <ScopedPreview modelFor={modelFor} />
        </div>
      </I18nScope>
    ) : (
      <StorefrontPreview model={model} />
    );

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-[13px] font-medium text-[var(--octo-text-primary)]">{title ?? t("publicLink.livePreview")}</p>
          {subtitle && <p className="text-[11.5px] text-[var(--octo-text-muted)]">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {devices.length > 1 && (
            <Segmented
              options={devices.map((id) => {
                const Icon = DEVICE_ICON[id];
                return {
                  id,
                  label: (
                    <>
                      <Icon size={14} />
                      <span className="sr-only">{t(DEVICE_LABEL_KEY[id])}</span>
                    </>
                  ),
                };
              })}
              value={device}
              onChange={(id) => onDevice(id as PreviewDevice)}
            />
          )}
          {actions}
          {modelFor && (
            <label className="flex h-8 items-center gap-1 rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] pe-1 ps-2 text-[12px] text-[var(--octo-text-primary)]">
              <Globe size={13} className="shrink-0 text-[var(--octo-text-muted)]" aria-hidden />
              <span className="sr-only">{t("publicLink.preview.language")}</span>
              <select
                value={previewLocale}
                onChange={(e) => setPreviewLocale(e.target.value as Locale)}
                className="cursor-pointer bg-transparent pe-1 text-[12px] font-medium focus:outline-none"
              >
                {PREVIEW_LOCALES.map((id) => (
                  <option key={id} value={id}>
                    {id.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      <div
        ref={viewportRef}
        onScroll={paged ? handleScroll : undefined}
        className={clsx(
          "relative mt-4",
          paged ? `octo-scroll overflow-y-auto overflow-x-hidden rounded-xl ${VIEWPORT_HEIGHT[device]}` : "overflow-x-auto"
        )}
      >
        <div className={`mx-auto ${DEVICE_MAX_WIDTH[device]}`}>{preview}</div>
      </div>

      {paged && slideCount > 1 && (
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <span aria-hidden />
          <div className="flex items-center gap-1.5">
            {Array.from({ length: slideCount }, (_, index) => (
              <button
                key={index}
                type="button"
                aria-label={t("publicLink.preview.slide").replace("{n}", String(index + 1))}
                aria-current={index === activeSlide ? "true" : undefined}
                onClick={() => goToSlide(index)}
                className={clsx(
                  "h-2 w-2 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
                  index === activeSlide ? "bg-[#0D6EFD]" : "bg-[#0D6EFD]/25 hover:bg-[#0D6EFD]/50"
                )}
              />
            ))}
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              aria-label={t("publicLink.preview.prevSlide")}
              disabled={activeSlide === 0}
              onClick={() => goToSlide(activeSlide - 1)}
              className="grid h-8 w-8 place-items-center rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)] disabled:opacity-40"
            >
              <ChevronLeft size={15} className="rtl:rotate-180" />
            </button>
            <button
              type="button"
              aria-label={t("publicLink.preview.nextSlide")}
              disabled={activeSlide >= slideCount - 1}
              onClick={() => goToSlide(activeSlide + 1)}
              className="grid h-8 w-8 place-items-center rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)] disabled:opacity-40"
            >
              <ChevronRight size={15} className="rtl:rotate-180" />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
