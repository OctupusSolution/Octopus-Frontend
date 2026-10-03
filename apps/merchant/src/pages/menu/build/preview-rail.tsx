// "Live Preview — How it appear to your customers": the wizard's third column.
//
// A frame around widgets/storefront-preview, not a renderer of its own. The
// desktop/mobile toggle is the frame's, and it drives the widget's own `device`
// rather than a second layout here.
import { useState, type ReactNode } from "react";
import clsx from "clsx";
import type { ItemTag, Menu } from "@/entities/menu";
import { DRAFT_KEY, EMPTY_SITE_DRAFT, parseDraft, type SiteDraft } from "@/entities/site-draft";
import { StorefrontPreview, type PreviewDevice } from "@/widgets/storefront-preview";
import { useI18n } from "@/app/providers/i18n-provider";
import { useTenantConfig } from "@/app/providers/tenant-config-provider";
import { MenuIcon } from "../_shared/menu-icon";
import { TEXT, TEXT_GRAY } from "../_shared/theme";
import { toPreviewModel } from "./preview-model";

const TAG_KEYS: Record<ItemTag, string> = {
  "chef-recommended": "menuWiz.item.tag.chef",
  "top-selling": "menuWiz.item.tag.top",
  "most-ordered": "menuWiz.item.tag.most",
  "healthy-choice": "menuWiz.item.tag.healthy",
};

/** The stored brand, read once. Deliberately not `useSiteDraft()`: that hook
 *  owns a reducer and autosaves, so a second instance here would neither see
 *  the Theme step's edits nor stay out of their way — its own debounced write
 *  could land after them and put the old logo back. */
function readStoredSite(): SiteDraft {
  try {
    return parseDraft(window.localStorage.getItem(DRAFT_KEY)) ?? EMPTY_SITE_DRAFT;
  } catch {
    return EMPTY_SITE_DRAFT;
  }
}

type ToggleDevice = "desktop" | "mobile";

const DEVICES: { id: ToggleDevice; icon: string; size: number }[] = [
  { id: "desktop", icon: "menu-monitor.svg", size: 16 },
  { id: "mobile", icon: "menu-mobile.svg", size: 18 },
];

/** The Live Preview card every build step carries in its end column: white,
 *  28px radius, a soft shadow, the title pair and the desktop/mobile toggle.
 *  The preview itself is the children — this is chrome only. */
export function PreviewCard({
  device,
  onDeviceChange,
  className,
  children,
}: {
  /** Anything other than "mobile" lights the desktop half of the toggle. */
  device: string;
  onDeviceChange: (device: ToggleDevice) => void;
  className?: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const active: ToggleDevice = device === "mobile" ? "mobile" : "desktop";

  return (
    <section
      className={clsx(
        "flex flex-col gap-6 overflow-hidden rounded-[28px] bg-[var(--octo-card)] p-4 shadow-[0px_0px_8px_0px_rgba(0,0,0,0.05)] [[data-theme=dark]_&]:border [[data-theme=dark]_&]:border-[var(--octo-border-card)]",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className={clsx("text-[16px] font-medium leading-4", TEXT)}>{t("menuWiz.preview.title")}</h2>
          <p className={clsx("text-[12px] leading-3", TEXT_GRAY)}>{t("menuWiz.preview.hint")}</p>
        </div>
        <div className="flex shrink-0 items-center">
          {DEVICES.map(({ id, icon, size }, index) => (
            <button
              key={id}
              type="button"
              aria-label={id}
              aria-pressed={active === id}
              onClick={() => onDeviceChange(id)}
              className={clsx(
                "relative grid h-6 w-[34px] place-items-center border bg-[#f5f9ff] [[data-theme=dark]_&]:bg-[#0d6efd]/15",
                index === 0 ? "rounded-s-[4px]" : "-ms-px rounded-e-[4px]",
                active === id
                  ? "z-10 border-[#0D6EFD] text-[#0D6EFD]"
                  : `border-[#cbd5e1] [[data-theme=dark]_&]:border-[var(--octo-border-input)] ${TEXT}`
              )}
            >
              <span className="grid size-4 place-items-center overflow-visible">
                <MenuIcon name={icon} size={size} />
              </span>
            </button>
          ))}
        </div>
      </div>
      {children}
    </section>
  );
}

export function PreviewRail({
  menu,
  composition = "landing",
  site,
}: {
  menu: Menu;
  /** The Theme step is designing the menu page, so it asks for that body. */
  composition?: "landing" | "menu";
  /** The live site draft, from a step that edits it (Theme). Steps that do
   *  not edit brand omit it and the rail reads what is stored. */
  site?: SiteDraft;
}) {
  const { t, locale } = useI18n();
  const { activeBusiness } = useTenantConfig();
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [stored] = useState(readStoredSite);

  const model = toPreviewModel(menu, device, composition, activeBusiness?.businessName ?? "", {
    site: site ?? stored,
    locale,
    tagLabel: (tag) => t(TAG_KEYS[tag]),
  });

  return (
    <PreviewCard device={device} onDeviceChange={setDevice}>
      {/* Tall enough that the landing preview — hero, category mosaic and the
          product cards — is visible without scrolling. The menu composition
          is genuinely longer and still scrolls; its sticky cart and bottom
          bar stick to this box. */}
      <div className="octo-scroll max-h-[880px] overflow-auto rounded-[20px] shadow-[0px_0px_8px_0px_rgba(0,0,0,0.08)]">
        <StorefrontPreview model={model} />
      </div>
    </PreviewCard>
  );
}
