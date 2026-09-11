// "Live Preview — How it appear to your customers": the wizard's third column.
//
// A frame around widgets/storefront-preview, not a renderer of its own. The
// desktop/mobile toggle is the frame's, and it drives the widget's own `device`
// rather than a second layout here.
import { useState } from "react";
import clsx from "clsx";
import { Monitor, Smartphone } from "lucide-react";
import type { ItemTag, Menu } from "@/entities/menu";
import { DRAFT_KEY, EMPTY_SITE_DRAFT, parseDraft, type SiteDraft } from "@/entities/site-draft";
import { StorefrontPreview, type PreviewDevice } from "@/widgets/storefront-preview";
import { useI18n } from "@/app/providers/i18n-provider";
import { useTenantConfig } from "@/app/providers/tenant-config-provider";
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

  const DEVICES: { id: PreviewDevice; icon: typeof Monitor }[] = [
    { id: "desktop", icon: Monitor },
    { id: "mobile", icon: Smartphone },
  ];

  const model = toPreviewModel(menu, device, composition, activeBusiness?.businessName ?? "", {
    site: site ?? stored,
    locale,
    tagLabel: (tag) => t(TAG_KEYS[tag]),
  });

  return (
    <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">
            {t("menuWiz.preview.title")}
          </h2>
          <p className="mt-0.5 text-[12.5px] text-[var(--octo-text-secondary)]">
            {t("menuWiz.preview.hint")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-[9px] border border-[var(--octo-border-card)] p-1">
          {DEVICES.map(({ id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-label={id}
              aria-pressed={device === id}
              onClick={() => setDevice(id)}
              className={clsx(
                "rounded-[7px] p-1.5",
                device === id
                  ? "bg-[var(--octo-selected)] text-[var(--octo-accent)]"
                  : "text-[var(--octo-text-muted)]"
              )}
            >
              <Icon size={16} aria-hidden />
            </button>
          ))}
        </div>
      </div>

      {/* Tall enough that the landing preview — hero, category mosaic and the
          product cards — is visible without scrolling. The menu composition
          is genuinely longer and still scrolls; its sticky cart and bottom
          bar stick to this box. */}
      <div className="octo-scroll mt-3 max-h-[880px] overflow-auto rounded-[10px] border border-[var(--octo-border-card)]">
        <StorefrontPreview model={model} />
      </div>
    </section>
  );
}
