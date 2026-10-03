// Items on Offer — what is in the combo, and how many of each.
//
// Adding is a picker over the menu's own items, because an offer entry points
// at an item by id: letting a name be typed here would create a line that
// resolves to nothing and quotes a price for a dish that does not exist.
import { useState } from "react";
import clsx from "clsx";
import { Modal } from "@ui/primitives";
import { MediaTile } from "@/shared/ui/media-tile";
import { type Item, type Menu, type Offer } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { Field, SelectBox } from "../../_shared/controls";
import { MenuIcon } from "../../_shared/menu-icon";
import { FIELD_INVALID, INFO_STRIP, LINE, MODAL_SUBMIT, SURFACE_SUBTLE, TEXT, TEXT_INPUT_CLASS } from "../../_shared/theme";
import type { OfferTabValidation } from "./index";

const PRICE_TEXT = "text-[#004bb9] [[data-theme=dark]_&]:text-[#8ab8ff]";

export function TabItems({
  menu,
  offer,
  onSetEntry,
  onRemoveEntry,
  onReplaceEntry,
  onPatch,
  validation,
}: {
  menu: Menu;
  offer: Offer;
  onSetEntry: (itemId: string, qty: number, price: number) => void;
  onRemoveEntry: (itemId: string) => void;
  /** Swaps one line for another item in place, in a single draft update — a
   *  remove followed by an add would each close over the same stale draft. */
  onReplaceEntry: (fromItemId: string, toItemId: string, qty: number, price: number) => void;
  onPatch: (patch: Partial<Offer>) => void;
  validation: OfferTabValidation;
}) {
  const { t } = useI18n();
  const { errors, onTouch } = validation;
  // null = closed; "" = adding a new line; otherwise the line being edited.
  const [editing, setEditing] = useState<string | null>(null);
  const [pickId, setPickId] = useState("");
  const [qty, setQty] = useState("1");
  const [attempted, setAttempted] = useState(false);
  const [qtyTouched, setQtyTouched] = useState(false);

  const allItems = menu.sections
    .filter((s) => s.kind === "items")
    .flatMap((s) => s.entries as Item[]);
  const byId = new Map(allItems.map((item) => [item.id, item]));
  // The line being edited may keep its own item, so it stays in its list.
  const candidates = allItems.filter(
    (item) => item.id === editing || !offer.entries.some((e) => e.itemId === item.id)
  );
  const addable = allItems.some((item) => !offer.entries.some((e) => e.itemId === item.id));

  function open(itemId: string) {
    const entry = offer.entries.find((e) => e.itemId === itemId);
    setEditing(itemId);
    const firstFree = allItems.find((i) => !offer.entries.some((e) => e.itemId === i.id));
    setPickId(itemId || (firstFree?.id ?? ""));
    setQty(String(entry?.qty ?? 1));
    setAttempted(false);
    setQtyTouched(false);
  }

  const qtyNumber = Number(qty);
  const qtyValid = qty.trim() !== "" && Number.isInteger(qtyNumber) && qtyNumber >= 1;
  const itemError = attempted && !byId.has(pickId) ? t("menuOffer.validation.itemRequired") : null;
  const qtyError = (attempted || qtyTouched) && !qtyValid ? t("menuOffer.validation.qtyMin") : null;

  function save() {
    setAttempted(true);
    const item = byId.get(pickId);
    if (!item || !qtyValid) return;
    if (editing === "") onSetEntry(item.id, qtyNumber, item.pricing.price);
    else if (editing) {
      const price = item.id === editing
        ? (offer.entries.find((e) => e.itemId === editing)?.price ?? item.pricing.price)
        : item.pricing.price;
      onReplaceEntry(editing, item.id, qtyNumber, price);
    }
    onTouch("entries");
    setEditing(null);
  }

  const lines = offer.entries.filter((entry) => byId.has(entry.itemId));

  return (
    <div className="flex flex-col gap-4">
      {lines.length > 0 && (
        <ul className="flex flex-col gap-4">
          {lines.map((entry) => {
            // An entry whose item was deleted quotes nothing — pricing.ts drops
            // it too, so the row would only be a line with no dish behind it.
            const item = byId.get(entry.itemId)!;
            return (
              <li key={entry.itemId} className={clsx("flex items-center gap-2 rounded-[4px] border px-2 py-1", LINE)}>
                <span className={clsx("grid size-6 shrink-0 place-items-center", "text-black [[data-theme=dark]_&]:text-[var(--octo-text-primary)]")}>
                  <MenuIcon name="menu-drag.svg" size={12} />
                </span>
                <span className="size-12 shrink-0 overflow-hidden rounded-[4px]">
                  <MediaTile src={item.image} rounded="rounded-[4px]" />
                </span>

                <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-6">
                    <span className={clsx("truncate text-[14px] font-medium leading-[14px]", TEXT)}>{item.name}</span>
                    <div className={clsx("flex shrink-0 items-center gap-6 rounded-[4px] border px-3 py-1", LINE)}>
                      <button
                        type="button"
                        aria-label={`${item.name} −`}
                        // Quantities stop at one: removing the line is the bin's job.
                        disabled={entry.qty <= 1}
                        onClick={() => onSetEntry(entry.itemId, entry.qty - 1, entry.price)}
                        className={clsx("grid size-6 place-items-center rounded-full text-[#687280] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60", SURFACE_SUBTLE)}
                      >
                        <MenuIcon name="menu-minus-bold.svg" size={24} />
                      </button>
                      <span className={clsx("min-w-[9px] text-center text-[14px] leading-none", TEXT)}>{entry.qty}</span>
                      <button
                        type="button"
                        aria-label={`${item.name} +`}
                        onClick={() => onSetEntry(entry.itemId, entry.qty + 1, entry.price)}
                        className="grid size-6 place-items-center rounded-full bg-[#0D6EFD] text-white hover:opacity-90"
                      >
                        <MenuIcon name="menu-plus.svg" size={24} />
                      </button>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    {/* Line price, not unit price: three drinks cost three drinks. */}
                    <span className={clsx("whitespace-nowrap text-end text-[14px] font-bold leading-[14px]", PRICE_TEXT)}>
                      SAR {entry.price * entry.qty}
                    </span>
                    <button
                      type="button"
                      aria-label={t("menuOffer.editLine").replace("{name}", item.name)}
                      onClick={() => open(entry.itemId)}
                      className={clsx("grid size-6 place-items-center rounded-[4px] hover:bg-[var(--octo-hover)]", TEXT)}
                    >
                      <MenuIcon name="menu-edit.svg" size={24} />
                    </button>
                    <button
                      type="button"
                      aria-label={t("menuOffer.removeLine").replace("{name}", item.name)}
                      onClick={() => {
                        onRemoveEntry(entry.itemId);
                        onTouch("entries");
                      }}
                      className="grid size-6 place-items-center rounded-[4px] text-[#d30202] hover:bg-[#fef0f0] [[data-theme=dark]_&]:hover:bg-[#d30202]/15"
                    >
                      <MenuIcon name="menu-trash.svg" size={24} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className={clsx("flex items-center gap-2 rounded-[8px] px-3 py-2", INFO_STRIP)}>
        <MenuIcon name="menu-info-circle.svg" size={24} />
        <p className="min-w-0 flex-1 text-[14px] font-medium leading-[14px]" aria-live="polite">
          {offer.customerCanChange ? t("menuOffer.canChange") : t("menuOffer.cantChange")}
        </p>
        <button
          type="button"
          aria-pressed={offer.customerCanChange}
          onClick={() => onPatch({ customerCanChange: !offer.customerCanChange })}
          className="shrink-0 whitespace-nowrap text-[14px] font-bold leading-[14px] underline [text-underline-position:from-font]"
        >
          {t("menuOffer.change")}
        </button>
      </div>

      <button
        type="button"
        onClick={() => open("")}
        disabled={!addable}
        className="flex h-10 w-full items-center justify-center gap-3 rounded-[4px] border border-[#0D6EFD] bg-[#f5f9ff] p-2 text-[14px] font-semibold leading-[14px] text-[#0D6EFD] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 [[data-theme=dark]_&]:bg-[#0d6efd]/15"
      >
        <MenuIcon name="menu-plus-line.svg" size={24} />
        {t("menuOffer.addItem")}
      </button>

      {errors.entries && (
        <p role="alert" className="-mt-2 text-[12px] leading-[14px] text-[#d30202]">
          {t(errors.entries)}
        </p>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        backdropClassName="bg-black/60"
        className="!max-w-[738px] !rounded-[12px] !p-6 !shadow-none"
      >
        <form
          noValidate
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <h2 className="text-[24px] font-semibold leading-6 text-[#0e0e0e] [[data-theme=dark]_&]:text-[var(--octo-text-primary)]">
            {t(editing === "" ? "menuOffer.addItem" : "menuOffer.editItem")}
          </h2>

          <Field label={t("menuOffer.itemField")} required error={itemError}>
            <SelectBox
              value={pickId}
              ariaLabel={t("menuOffer.itemField")}
              placeholderShown={pickId === ""}
              invalid={itemError !== null}
              onChange={setPickId}
            >
              <option value="" disabled>
                {t("menuOffer.itemPlaceholder")}
              </option>
              {candidates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} — SAR {item.pricing.price}
                </option>
              ))}
            </SelectBox>
          </Field>

          <Field label={t("menuOffer.qtyField")} required error={qtyError}>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              aria-label={t("menuOffer.qtyField")}
              aria-invalid={qtyError ? true : undefined}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              onBlur={() => setQtyTouched(true)}
              className={clsx(TEXT_INPUT_CLASS, qtyError && FIELD_INVALID)}
            />
          </Field>

          <button type="submit" className={MODAL_SUBMIT}>
            {t(editing === "" ? "menuOffer.addItem" : "menuOffer.saveItem")}
          </button>
        </form>
      </Modal>
    </div>
  );
}
