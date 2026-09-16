// Step 2 — which business is this? OCTOPUS is multi-vertical, and this single
// choice decides which product the merchant ends up with.
//
// All twelve verticals are shown and all twelve can be picked, the way the
// frame draws them — no lock badges. Only `restaurants` has its own type
// catalogue today, so every pick continues into the same Services step; the
// catalogue's `status` field records that and is where a second vertical's
// routing would hook in (see shared/catalog/verticals.ts).
import clsx from "clsx";
import { verticals, type VerticalId } from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { CatalogIcon } from "@/shared/lib/catalog-icon";
import { verticalIcon } from "@/pages/onboarding/_shared/assets";

export function VerticalStep({
  selected,
  onSelect,
}: {
  selected: VerticalId | null;
  onSelect: (id: VerticalId) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
      {verticals.map((vertical) => {
        const active = selected === vertical.id;

        return (
          <button
            key={vertical.id}
            type="button"
            onClick={() => onSelect(vertical.id)}
            aria-pressed={active}
            className={clsx(
              "relative flex cursor-pointer flex-col items-center justify-between gap-2 rounded-[12px] border px-3 pb-4 pt-5 text-center transition-all duration-200",
              active
                ? "border-[#0D6EFD] bg-[var(--octo-selected)]"
                : "border-[var(--octo-border-input)] bg-[var(--octo-card)] hover:border-[#c7d9f8] hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
            )}
          >
            {vertical.image ? (
              <img
                src={verticalIcon(vertical.image)}
                alt=""
                width={80}
                height={80}
                className="h-20 w-20 object-contain"
              />
            ) : (
              // No 3D render exists for this vertical yet. A flat glyph in the
              // set's own violet is visibly a placeholder rather than a
              // borrowed picture from a neighbouring card.
              <span className="grid h-20 w-20 place-items-center rounded-[16px] bg-[#efecff] text-[#5b4bd6]">
                <CatalogIcon name={vertical.icon} size={38} />
              </span>
            )}
            <span className="text-[15px] font-bold text-[var(--octo-text-primary)]">{t(vertical.nameKey)}</span>
          </button>
        );
      })}
    </div>
  );
}
