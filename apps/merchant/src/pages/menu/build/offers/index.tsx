// The offer editor — what the middle column becomes when the offers section is
// selected in step 2.
//
// Five tabs, none of them the item editor's. Reading that as "a section has a
// kind" rather than "offers are a special item" is what keeps the two editors
// from growing into each other.
//
// Validation lives in entities/menu/offer-validation. This file only decides
// when a message may be shown: once its field was left, or once its tab was —
// so a new offer never opens red, and a tab the merchant walked past says what
// it still needs.
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { EmptyState } from "@ui/primitives";
import {
  OFFERS_SECTION_ID,
  OFFER_FIELD_TAB,
  individualTotals,
  offerIncompleteTabs,
  validateOffer,
  type Menu,
  type Offer,
  type OfferErrors,
  type OfferField,
  type OfferValidationContext,
} from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { PANEL, TEXT, TEXT_GRAY } from "../../_shared/theme";
import { useDraft } from "../use-draft";
import { TabInfo } from "./tab-info";
import { TabItems } from "./tab-items";
import { TabPricing } from "./tab-pricing";
import { TabAvailability } from "./tab-availability";
import { TabChannels } from "./tab-channels";

export const OFFER_TABS = ["info", "items", "pricing", "availability", "channels"] as const;
export type OfferTabId = (typeof OFFER_TABS)[number];

/** What every tab receives besides the offer: the messages it may show now,
 *  and how it reports that a field was left or changed. */
export interface OfferTabValidation {
  errors: OfferErrors;
  onTouch: (...fields: OfferField[]) => void;
}

function contextFor(menu: Menu, offer: Offer): OfferValidationContext {
  const others = (menu.sections.find((s) => s.id === OFFERS_SECTION_ID)?.entries ?? []) as Offer[];
  return {
    otherSlugs: others.filter((o) => o.id !== offer.id).map((o) => o.slug),
    itemsSubTotal: individualTotals(menu, offer).subTotal,
  };
}

/** What the footer's Next Step is gated on: the tabs still missing something,
 *  in tab order. With the menu, the checks that need the offer's neighbours
 *  (a slug already taken, a price above the items' total) are included. */
export function incompleteTabs(offer: Offer, menu?: Menu): OfferTabId[] {
  return offerIncompleteTabs(offer, menu ? contextFor(menu, offer) : {});
}

const FIELDS = Object.keys(OFFER_FIELD_TAB) as OfferField[];

export function OffersEditor({
  menu,
  offer,
  tab,
  onTabChange,
  onPatch,
  onSetEntry,
  onRemoveEntry,
  onReplaceEntry,
}: {
  menu: Menu;
  offer: Offer | null;
  tab: OfferTabId;
  onTabChange: (tab: OfferTabId) => void;
  onPatch: (patch: Partial<Offer>) => void;
  onSetEntry: (itemId: string, qty: number, price: number) => void;
  onRemoveEntry: (itemId: string) => void;
  onReplaceEntry: (fromItemId: string, toItemId: string, qty: number, price: number) => void;
}) {
  const { t } = useI18n();
  const { setNextBlocked } = useDraft();
  // Per offer, so selecting another offer does not inherit this one's red.
  const [touched, setTouched] = useState<Record<string, OfferField[]>>({});

  const allErrors = offer ? validateOffer(offer, contextFor(menu, offer)) : {};
  const incomplete = Object.keys(allErrors).length > 0;

  // The frame's red strip above the footer, with Next Step held back. Asserted
  // after every render rather than on change: the step that mounts this editor
  // also reports its own gate, and whichever spoke last would otherwise win.
  // setNextBlocked ignores a call that changes nothing, so this settles.
  useEffect(() => {
    setNextBlocked(incomplete, incomplete ? t("menuOffer.incomplete") : null);
  });
  // Released once, on unmount — through a ref, so a caller whose function is
  // not stable cannot turn the release into a release-and-reassert loop.
  const release = useRef(setNextBlocked);
  release.current = setNextBlocked;
  useEffect(() => () => release.current(false), []);

  const title = <h2 className={clsx("text-[18px] font-bold leading-[18px]", TEXT)}>{t("menuOffer.infoTitle")}</h2>;

  if (!offer) {
    return (
      <section className={clsx("flex min-w-0 flex-col gap-4 self-start", PANEL)}>
        {title}
        <EmptyState title={t("menuOffer.addNew")} />
      </section>
    );
  }

  const offerId = offer.id;
  const seen = touched[offerId] ?? [];
  const errors: OfferErrors = {};
  for (const field of seen) if (allErrors[field]) errors[field] = allErrors[field];

  function touch(...fields: OfferField[]) {
    setTouched((prev) => {
      const current = prev[offerId] ?? [];
      const added = fields.filter((field) => !current.includes(field));
      return added.length === 0 ? prev : { ...prev, [offerId]: [...current, ...added] };
    });
  }

  function changeTab(next: OfferTabId) {
    // Leaving a tab is the moment to say what it still needs.
    touch(...FIELDS.filter((field) => OFFER_FIELD_TAB[field] === tab));
    onTabChange(next);
  }

  const validation: OfferTabValidation = { errors, onTouch: touch };

  return (
    <section className={clsx("flex min-w-0 flex-col gap-4 self-start", PANEL)}>
      {title}

      <div className="flex flex-col gap-4">
        <p className={clsx("-my-0.5 truncate text-[16px] font-medium leading-5", TEXT)}>{offer.name || t("menuOffer.addNew")}</p>
        <div
          role="tablist"
          className="octo-scroll flex justify-between gap-3 overflow-x-auto border-b border-[#e2e8f0] [[data-theme=dark]_&]:border-[var(--octo-border-card)]"
        >
          {OFFER_TABS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => changeTab(id)}
              className={clsx(
                "-mb-px shrink-0 whitespace-nowrap border-b pb-[11px] pt-1 text-[14px] font-medium leading-[14px]",
                tab === id ? "border-[#0D6EFD] text-[#0D6EFD]" : `border-transparent ${TEXT_GRAY}`
              )}
            >
              {t(`menuOffer.tab.${id}`)}
            </button>
          ))}
        </div>
      </div>

      {tab === "info" && <TabInfo offer={offer} onPatch={onPatch} validation={validation} />}
      {tab === "items" && (
        <TabItems
          menu={menu}
          offer={offer}
          onSetEntry={onSetEntry}
          onRemoveEntry={onRemoveEntry}
          onReplaceEntry={onReplaceEntry}
          onPatch={onPatch}
          validation={validation}
        />
      )}
      {tab === "pricing" && <TabPricing menu={menu} offer={offer} onPatch={onPatch} validation={validation} />}
      {tab === "availability" && <TabAvailability offer={offer} onPatch={onPatch} validation={validation} />}
      {tab === "channels" && <TabChannels offer={offer} onPatch={onPatch} validation={validation} />}
    </section>
  );
}
