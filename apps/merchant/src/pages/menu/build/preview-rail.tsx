// "Live Preview — How it appear to your customers": the wizard's third column.
//
// A frame around widgets/storefront-preview, not a renderer of its own. The
// desktop/mobile toggle is the frame's, and it drives the widget's own `device`
// rather than a second layout here.
import { useState } from "react";
import clsx from "clsx";
import { Monitor, Smartphone } from "lucide-react";
import type { Menu } from "@/entities/menu";
import { StorefrontPreview, type PreviewDevice } from "@/widgets/storefront-preview";
import { useI18n } from "@/app/providers/i18n-provider";
import { toPreviewModel } from "./preview-model";

export function PreviewRail({ menu }: { menu: Menu }) {
  const { t } = useI18n();
  const [device, setDevice] = useState<PreviewDevice>("desktop");

  const DEVICES: { id: PreviewDevice; icon: typeof Monitor }[] = [
    { id: "desktop", icon: Monitor },
    { id: "mobile", icon: Smartphone },
  ];

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

      {/* The widget draws at its own natural width; the rail is narrower than
          the page it depicts, so it scrolls rather than squashing the layout
          out of proportion. */}
      <div className="octo-scroll mt-3 max-h-[560px] overflow-auto rounded-[10px] border border-[var(--octo-border-card)]">
        <StorefrontPreview model={toPreviewModel(menu, device)} />
      </div>
    </section>
  );
}
