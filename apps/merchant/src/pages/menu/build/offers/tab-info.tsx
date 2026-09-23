// Offer Info — the first of the offer editor's five tabs.
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Check, Loader2, Pencil, Trash2, X } from "lucide-react";
import { Select } from "@ui/primitives";
import { checkOfferSlugAvailability } from "@octopus/api-client";
import { useFilePicker } from "@/shared/ui/use-file-picker";
import { MediaTile } from "@/shared/ui/media-tile";
import type { Offer } from "@/entities/menu";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** The API takes lowercase words joined by hyphens; this mirrors
 *  entities/menu/offers-sync.ts's own toSlug, which is what actually gets
 *  sent on save, not the underscored value the field shows while typing. */
const toApiSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const DEBOUNCE_MS = 400;

type SlugCheck = "idle" | "checking" | "available" | "taken" | "error";

const inputClass =
  "mt-1.5 w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2.5 text-[14px] text-[var(--octo-text-primary)]";

/** Mirrors entities/menu/draft.ts's own slugify, which owns the value at
 *  creation. Kept in step deliberately: if they diverged, typing a name would
 *  produce a different slug than creating the offer did. */
function slugify(name: string): string {
  return name.trim().replace(/\s+/g, "_");
}

const BADGES = [
  { value: "Best Value", key: "menuOffer.badge.bestValue" },
  { value: "Limited Time", key: "menuOffer.badge.limited" },
  { value: "Popular", key: "menuOffer.badge.popular" },
];

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={clsx(
        "h-[22px] w-[40px] shrink-0 rounded-full p-[2px] transition-colors",
        checked ? "bg-[var(--octo-accent)]" : "bg-[var(--octo-switch-off)]"
      )}
    >
      <span
        className={clsx(
          "block h-[18px] w-[18px] rounded-full bg-[var(--octo-knob)] transition-transform",
          checked && "translate-x-[18px] rtl:-translate-x-[18px]"
        )}
      />
    </button>
  );
}

export function TabInfo({
  offer,
  onPatch,
}: {
  offer: Offer;
  onPatch: (patch: Partial<Offer>) => void;
}) {
  const { t } = useI18n();
  const { activeBusinessId } = useAuth();
  const picker = useFilePicker((dataUrl) => onPatch({ image: dataUrl }));

  const apiSlug = toApiSlug(offer.slug);
  const [slugCheck, setSlugCheck] = useState<SlugCheck>("idle");

  useEffect(() => {
    if (!activeBusinessId || apiSlug === "") {
      setSlugCheck("idle");
      return;
    }
    let cancelled = false;
    setSlugCheck("checking");
    const timer = window.setTimeout(() => {
      checkOfferSlugAvailability(activeBusinessId, apiSlug, UUID.test(offer.id) ? offer.id : undefined)
        .then((res) => {
          if (!cancelled) setSlugCheck(res.available ? "available" : "taken");
        })
        .catch(() => {
          if (!cancelled) setSlugCheck("error");
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // offer.id only affects which slug the check excludes, not when it reruns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBusinessId, apiSlug]);

  return (
    <div className="max-w-[720px] space-y-4">
      <label className="block">
        <span className="text-[14px] font-medium text-[var(--octo-text-primary)]">
          {t("menuOffer.name")} <span className="text-error">*</span>
        </span>
        <input
          className={inputClass}
          value={offer.name}
          // The slug follows the name until the merchant edits it themselves,
          // then it is theirs. Leaving it empty made a required field the
          // merchant had no reason to look at, and the Next Step gate refused
          // to open with no visible cause.
          onChange={(e) => {
            const name = e.target.value;
            const untouched = offer.slug === "" || offer.slug === slugify(offer.name);
            onPatch(untouched ? { name, slug: slugify(name) } : { name });
          }}
        />
      </label>

      <label className="block">
        <span className="text-[14px] font-medium text-[var(--octo-text-primary)]">
          {t("menuOffer.slug")} <span className="text-error">*</span>
        </span>
        <input
          className={inputClass}
          value={offer.slug}
          onChange={(e) => onPatch({ slug: e.target.value })}
        />
        {slugCheck !== "idle" && (
          <p
            className={clsx(
              "mt-1.5 flex items-center gap-1.5 text-[12.5px]",
              slugCheck === "available" && "text-[var(--octo-tone-success-text)]",
              slugCheck === "taken" && "text-error",
              (slugCheck === "checking" || slugCheck === "error") && "text-[var(--octo-text-muted)]"
            )}
          >
            {slugCheck === "checking" && <Loader2 size={13} className="animate-spin" aria-hidden />}
            {slugCheck === "available" && <Check size={13} aria-hidden />}
            {slugCheck === "taken" && <X size={13} aria-hidden />}
            {t(`menuOffer.slugCheck.${slugCheck}`)}
          </p>
        )}
      </label>

      <div>
        <p className="text-[14px] font-medium text-[var(--octo-text-primary)]">
          {t("menuOffer.image")} <span className="text-error">*</span>
        </p>
        <div className="relative mt-1.5 h-[480px] overflow-hidden rounded-[10px] border border-dashed border-[var(--octo-border-input)]">
          <MediaTile src={offer.image} />
          {picker.input}
          <div className="absolute end-2.5 top-2.5 flex gap-2">
            <button
              type="button"
              aria-label={t("menuOffer.image")}
              onClick={picker.open}
              className="rounded-[8px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-1.5 text-[var(--octo-text-secondary)]"
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              aria-label={t("menuOffer.image")}
              onClick={() => onPatch({ image: null })}
              className="rounded-[8px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-1.5 text-error"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
        <p className="mt-1 text-[12px] text-[var(--octo-text-muted)]">
          {t("menuOffer.imageHint")}
        </p>
      </div>

      <div>
        <p className="text-[14px] font-medium text-[var(--octo-text-primary)]">
          {t("menuOffer.status")}
        </p>
        <div className="mt-1.5 flex items-center gap-2.5">
          <Switch
            checked={offer.status === "active"}
            label={t("menuOffer.active")}
            onChange={() =>
              onPatch({ status: offer.status === "active" ? "inactive" : "active" })
            }
          />
          <span className="text-[14px] text-[var(--octo-text-primary)]">
            {t("menuOffer.active")}
          </span>
        </div>
      </div>

      <label className="block">
        <span className="text-[14px] font-medium text-[var(--octo-text-primary)]">
          {t("menuOffer.badge")}{" "}
          <span className="font-normal text-[var(--octo-text-secondary)]">
            ({t("menuOffer.badgeOptional")})
          </span>
        </span>
        <Select
          className="mt-1.5"
          value={offer.badge ?? ""}
          onChange={(e) => onPatch({ badge: e.target.value === "" ? null : e.target.value })}
        >
          <option value="">—</option>
          {BADGES.map(({ value, key }) => (
            <option key={value} value={value}>
              {t(key)}
            </option>
          ))}
        </Select>
      </label>

      <div className="flex items-center gap-2.5">
        <Switch
          checked={offer.showSavingBadge}
          label={t("menuOffer.showSaving")}
          onChange={() => onPatch({ showSavingBadge: !offer.showSavingBadge })}
        />
        <span className="text-[14px] text-[var(--octo-text-primary)]">
          {t("menuOffer.showSaving")}
        </span>
      </div>
    </div>
  );
}
