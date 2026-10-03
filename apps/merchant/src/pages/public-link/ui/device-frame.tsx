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
import clsx from "clsx";
import { getDirection, type Locale } from "@i18n/index";
import { I18nScope, useI18n } from "@/app/providers/i18n-provider";
import { StorefrontPreview, type StorefrontPreviewModel, type PreviewDevice } from "@/widgets/storefront-preview";
import { PlDeviceSwitch, PlIcon, plCard, plText } from "./kit";

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

// Desktop keeps the frame's 530:385 window; the narrower devices are taller
// than they are wide, so they get a fixed height instead.
const VIEWPORT_HEIGHT: Readonly<Record<PreviewDevice, string>> = {
  desktop: "aspect-[530/385]",
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

  const pagerArrow =
    "grid h-8 w-8 place-items-center rounded-[4px] border border-[var(--pl-g300)] text-[var(--pl-text)] transition-colors hover:bg-[var(--pl-primary-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40 disabled:opacity-40";

  return (
    <div className={clsx(plCard, "flex min-w-0 flex-col gap-6")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <p className={subtitle ? "text-[20px] font-medium leading-[20px] text-[var(--pl-text)]" : plText.h5}>
            {title ?? t("publicLink.livePreview")}
          </p>
          {subtitle && <p className={plText.sub}>{subtitle}</p>}
        </div>
        {devices.length > 1 && (
          <PlDeviceSwitch devices={devices} value={device} onChange={onDevice} label={(id) => t(DEVICE_LABEL_KEY[id])} />
        )}
        {(actions || modelFor) && (
          <div className="flex items-center justify-end gap-3">
            {actions}
            {modelFor && (
              <label className="relative flex h-8 items-center gap-1 rounded-[8px] border border-[var(--pl-g300)] p-2 text-[14px] font-medium leading-[14px] text-[var(--pl-text)] focus-within:ring-2 focus-within:ring-[#0D6EFD]/40">
                <PlIcon name="language" size={16} />
                <span className="sr-only">{t("publicLink.preview.language")}</span>
                <span aria-hidden>{previewLocale.toUpperCase()}</span>
                <PlIcon name="chevron-16" size={16} />
                <select
                  value={previewLocale}
                  onChange={(e) => setPreviewLocale(e.target.value as Locale)}
                  className="absolute inset-0 cursor-pointer opacity-0"
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
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div
          ref={viewportRef}
          onScroll={paged ? handleScroll : undefined}
          className={clsx(
            "relative rounded-[20px] shadow-[0_0_8px_0_rgba(0,0,0,0.08)]",
            paged ? `overflow-y-auto overflow-x-hidden [scrollbar-width:none] ${VIEWPORT_HEIGHT[device]}` : "overflow-x-auto"
          )}
        >
          <div className={`mx-auto ${DEVICE_MAX_WIDTH[device]}`}>{preview}</div>
        </div>

        {paged && slideCount > 1 && (
          <div className="relative flex h-8 items-center justify-end">
            <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-0.5">
              {Array.from({ length: slideCount }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={t("publicLink.preview.slide").replace("{n}", String(index + 1))}
                  aria-current={index === activeSlide ? "true" : undefined}
                  onClick={() => goToSlide(index)}
                  className={clsx(
                    "rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
                    index === activeSlide ? "h-[10px] w-[10px] bg-[var(--pl-primary)]" : "h-2 w-2 bg-[#CCE0FF] hover:bg-[#99C2FF]"
                  )}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={t("publicLink.preview.prevSlide")}
                disabled={activeSlide === 0}
                onClick={() => goToSlide(activeSlide - 1)}
                className={pagerArrow}
              >
                <PlIcon name="chevron-16" size={16} className="rotate-90 rtl:-rotate-90" />
              </button>
              <button
                type="button"
                aria-label={t("publicLink.preview.nextSlide")}
                disabled={activeSlide >= slideCount - 1}
                onClick={() => goToSlide(activeSlide + 1)}
                className={clsx(pagerArrow, "bg-[var(--pl-primary-soft)]")}
              >
                <PlIcon name="chevron-16" size={16} className="-rotate-90 rtl:rotate-90" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
