// Offer Info — the first of the offer editor's five tabs.
import { useEffect, useState } from "react";
import clsx from "clsx";
import { checkOfferSlugAvailability } from "@octopus/api-client";
import { useFilePicker } from "@/shared/ui/use-file-picker";
import { OFFER_NAME_MAX, OFFER_SLUG_MAX, normalizeOfferSlug, type Offer } from "@/entities/menu";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { Field, SelectBox, Switch } from "../../_shared/controls";
import { MenuIcon } from "../../_shared/menu-icon";
import { FIELD_INVALID, FOCUS, LINE, TEXT, TEXT_GRAY, TEXT_INPUT_CLASS, TEXT_SECONDARY } from "../../_shared/theme";
import type { OfferTabValidation } from "./index";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEBOUNCE_MS = 400;

/** The frame draws no "checking… / available" line under the slug. The check
 *  still runs — a slug the server says is taken is reported as the field's
 *  error — but its progress is not drawn; flip this to draw it again. */
const SHOW_SLUG_STATUS: boolean = false;

type SlugCheck = "idle" | "checking" | "available" | "taken" | "error";

/** The frame's inputs on this tab have a 4px corner, not the module's 12px. */
const INPUT = `${TEXT_INPUT_CLASS} !rounded-[4px]`;
const LABEL = `text-[16px] font-medium leading-4 ${TEXT}`;
const ERROR_TEXT = "text-[12px] leading-[14px] text-[#d30202]";

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

export function TabInfo({
  offer,
  onPatch,
  validation,
}: {
  offer: Offer;
  onPatch: (patch: Partial<Offer>) => void;
  validation: OfferTabValidation;
}) {
  const { t } = useI18n();
  const { activeBusinessId } = useAuth();
  const { errors, onTouch } = validation;
  const picker = useFilePicker((dataUrl) => onPatch({ image: dataUrl }));

  const apiSlug = normalizeOfferSlug(offer.slug);
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

  const nameError = errors.name ? t(errors.name).replace("{n}", String(OFFER_NAME_MAX)) : null;
  // The server's verdict needs no blur to be worth saying: the merchant typed
  // the slug and the business already has it.
  const slugError = errors.slug
    ? t(errors.slug).replace("{n}", String(OFFER_SLUG_MAX))
    : slugCheck === "taken"
      ? t("menuOffer.slugCheck.taken")
      : null;
  const pickError = picker.error
    ? t(picker.error === "too-large" ? "menuWiz.sec.error.tooLarge" : "menuWiz.sec.error.unreadable")
    : null;
  const imageError = pickError ?? (errors.image ? t(errors.image) : null);

  return (
    <div className="flex flex-col gap-4">
      <Field label={t("menuOffer.name")} required error={nameError}>
        <input
          className={clsx(INPUT, nameError && FIELD_INVALID)}
          value={offer.name}
          aria-label={t("menuOffer.name")}
          aria-invalid={nameError ? true : undefined}
          maxLength={OFFER_NAME_MAX + 20}
          placeholder={t("menuOffer.namePlaceholder")}
          onBlur={() => onTouch("name")}
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
      </Field>

      <Field label={t("menuOffer.slug")} required error={slugError}>
        <input
          className={clsx(INPUT, slugError && FIELD_INVALID)}
          dir="ltr"
          value={offer.slug}
          aria-label={t("menuOffer.slug")}
          aria-invalid={slugError ? true : undefined}
          maxLength={OFFER_SLUG_MAX + 20}
          placeholder={t("menuOffer.slugPlaceholder")}
          onBlur={() => onTouch("slug")}
          onChange={(e) => onPatch({ slug: e.target.value })}
        />
        {SHOW_SLUG_STATUS && slugCheck !== "idle" && slugCheck !== "taken" && (
          <p className={clsx("-mt-1 flex items-center gap-1 px-2 text-[12px] leading-[14px]", slugCheck === "available" ? "text-[#009a39]" : TEXT_GRAY)}>
            {slugCheck === "checking" && <MenuIcon name="menu-loading.svg" size={14} className="animate-spin" />}
            {t(`menuOffer.slugCheck.${slugCheck}`)}
          </p>
        )}
      </Field>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-3">
          <p className={LABEL}>
            {t("menuOffer.image")}
            <span className="text-[#d30202]"> *</span>
          </p>
          {picker.input}
          {offer.image ? (
            <div className={clsx("relative flex aspect-[496/344] w-full flex-col rounded-[12px] border border-dashed p-4", LINE, imageError && FIELD_INVALID)}>
              <img src={offer.image} alt="" className="min-h-0 w-full flex-1 rounded-[8px] object-cover" />
              <div className="absolute end-6 top-6 flex items-center gap-3">
                <button
                  type="button"
                  aria-label={t("menuOffer.changeImage")}
                  onClick={picker.open}
                  className={clsx("grid size-9 place-items-center rounded-[8px] bg-white hover:brightness-95", "text-[#0f172a]")}
                >
                  <MenuIcon name="menu-edit.svg" size={24} />
                </button>
                <button
                  type="button"
                  aria-label={t("menuOffer.removeImage")}
                  onClick={() => {
                    onPatch({ image: null });
                    onTouch("image");
                  }}
                  className="grid size-9 place-items-center rounded-[8px] bg-[#fef0f0] text-[#d30202] hover:brightness-95"
                >
                  <MenuIcon name="menu-trash.svg" size={24} />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={picker.open}
              onBlur={() => onTouch("image")}
              aria-invalid={imageError ? true : undefined}
              className={clsx(
                "flex aspect-[496/344] w-full flex-col items-center justify-center gap-3 rounded-[12px] border border-dashed p-4 text-[14px] leading-[14px] hover:bg-[var(--octo-hover)]",
                LINE,
                FOCUS,
                TEXT_GRAY,
                imageError && FIELD_INVALID
              )}
            >
              <span className="grid size-6 place-items-center">
                <MenuIcon name="menu-upload.svg" size={21.5} />
              </span>
              {t("menuOffer.imageUpload")}
            </button>
          )}
        </div>
        <p className={clsx("text-[12px] leading-3", TEXT_GRAY)}>{t("menuOffer.imageHint")}</p>
        {imageError && (
          <p role="alert" className={ERROR_TEXT}>
            {imageError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className={LABEL}>{t("menuOffer.status")}</p>
        <div className="flex items-center gap-2">
          <Switch
            checked={offer.status === "active"}
            label={t("menuOffer.status")}
            onChange={(on) => onPatch({ status: on ? "active" : "inactive" })}
          />
          <span className={clsx("text-[14px] font-medium leading-[14px]", TEXT)}>
            {t(offer.status === "active" ? "menuOffer.active" : "menuOffer.inactive")}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className={LABEL}>
          {t("menuOffer.badge")}{" "}
          <span className={clsx("text-[12px] font-normal", TEXT_SECONDARY)}>({t("menuOffer.badgeOptional")})</span>
        </p>
        <SelectBox
          value={offer.badge ?? ""}
          ariaLabel={t("menuOffer.badge")}
          placeholderShown={!offer.badge}
          onChange={(value) => onPatch({ badge: value === "" ? null : value })}
        >
          <option value="">{t("menuOffer.badgeNone")}</option>
          {BADGES.map(({ value, key }) => (
            <option key={value} value={value}>
              {t(key)}
            </option>
          ))}
          {/* A badge saved outside the three presets stays selectable. */}
          {offer.badge && !BADGES.some((b) => b.value === offer.badge) && <option value={offer.badge}>{offer.badge}</option>}
        </SelectBox>
        <div className="flex items-center gap-2">
          <Switch
            checked={offer.showSavingBadge}
            label={t("menuOffer.showSaving")}
            onChange={(on) => onPatch({ showSavingBadge: on })}
          />
          <span className={clsx("text-[14px] font-medium leading-[14px]", TEXT)}>{t("menuOffer.showSaving")}</span>
        </div>
      </div>
    </div>
  );
}
