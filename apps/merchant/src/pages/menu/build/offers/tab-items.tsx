// Items on Offer — what is in the combo, and how many of each.
//
// Adding is a picker over the menu's own items, because an offer entry points
// at an item by id: letting a name be typed here would create a line that
// resolves to nothing and quotes a price for a dish that does not exist.
import { useState } from "react";
import { GripVertical, Info, Minus, Plus, SquarePen, Trash2 } from "lucide-react";
import { Button, Modal, Select } from "@ui/primitives";
import { MediaTile } from "@/shared/ui/media-tile";
import { type Item, type Menu, type Offer } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";

export function TabItems({
  menu,
  offer,
  onSetEntry,
  onRemoveEntry,
  onReplaceEntry,
  onPatch,
}: {
  menu: Menu;
  offer: Offer;
  onSetEntry: (itemId: string, qty: number, price: number) => void;
  onRemoveEntry: (itemId: string) => void;
  /** Swaps one line for another item in place, in a single draft update — a
   *  remove followed by an add would each close over the same stale draft. */
  onReplaceEntry: (fromItemId: string, toItemId: string, qty: number, price: number) => void;
  onPatch: (patch: Partial<Offer>) => void;
}) {
  const { t } = useI18n();
  // null = closed; "" = adding a new line; otherwise the line being edited.
  const [editing, setEditing] = useState<string | null>(null);
  const [pickId, setPickId] = useState("");
  const [qty, setQty] = useState(1);

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
    setQty(entry?.qty ?? 1);
  }

  function save() {
    const item = byId.get(pickId);
    if (item && editing === "") onSetEntry(item.id, qty, item.pricing.price);
    else if (item && editing) {
      const price = item.id === editing
        ? (offer.entries.find((e) => e.itemId === editing)?.price ?? item.pricing.price)
        : item.pricing.price;
      onReplaceEntry(editing, item.id, qty, price);
    }
    setEditing(null);
  }

  return (
    <div className="space-y-3">
      {offer.entries.map((entry) => {
        const item = byId.get(entry.itemId);
        // An entry whose item was deleted quotes nothing — pricing.ts drops it
        // too, so the row would only be a line with no dish behind it.
        if (!item) return null;
        return (
          <div
            key={entry.itemId}
            className="flex items-center gap-3 rounded-[8px] border border-[var(--octo-border-card)] px-3 py-2.5"
          >
            <GripVertical size={16} className="shrink-0 text-[var(--octo-text-secondary)]" aria-hidden />
            <span className="h-12 w-12 shrink-0 overflow-hidden rounded-[8px]">
              <MediaTile src={item.image} rounded="rounded-[8px]" />
            </span>
            <span className="min-w-0 flex-1 truncate text-[16px] text-[var(--octo-text-primary)]">
              {item.name}
            </span>

            <div className="flex shrink-0 items-center gap-4 rounded-[6px] border border-[var(--octo-border-input)] px-2.5 py-1.5">
              <button
                type="button"
                aria-label={`${item.name} −`}
                onClick={() => onSetEntry(entry.itemId, entry.qty - 1, entry.price)}
                className="grid h-6 w-6 place-items-center text-[var(--octo-text-secondary)]"
              >
                <Minus size={16} />
              </button>
              <span className="min-w-[18px] text-center text-[15px] text-[var(--octo-text-primary)]">
                {entry.qty}
              </span>
              <button
                type="button"
                aria-label={`${item.name} +`}
                onClick={() => onSetEntry(entry.itemId, entry.qty + 1, entry.price)}
                className="grid h-6 w-6 place-items-center rounded-full bg-[var(--octo-accent)] text-white"
              >
                <Plus size={15} />
              </button>
            </div>

            {/* Line price, not unit price: three drinks cost three drinks. */}
            <span className="w-[76px] shrink-0 text-end text-[16px] font-semibold text-[var(--octo-accent)]">
              SAR {entry.price * entry.qty}
            </span>
            <button
              type="button"
              aria-label={t("menuOffer.editLine").replace("{name}", item.name)}
              onClick={() => open(entry.itemId)}
              className="shrink-0 rounded-[8px] p-1 text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
            >
              <SquarePen size={20} />
            </button>
            <button
              type="button"
              aria-label={item.name}
              onClick={() => onRemoveEntry(entry.itemId)}
              className="shrink-0 rounded-[8px] p-1 text-error hover:bg-error/10"
            >
              <Trash2 size={20} />
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => open("")}
        disabled={!addable}
        className="flex w-full items-center justify-center gap-2 rounded-[8px] border border-[var(--octo-accent)] bg-[var(--octo-card)] px-3 py-2.5 text-[15px] font-medium text-[var(--octo-accent)] hover:bg-[var(--octo-selected)] disabled:opacity-50"
      >
        <Plus size={18} aria-hidden />
        {t("menuOffer.addItem")}
      </button>

      <div className="flex flex-wrap items-center gap-2.5 rounded-[8px] bg-[var(--octo-selected)] px-3.5 py-3">
        <Info size={20} className="shrink-0 text-[var(--octo-accent)]" aria-hidden />
        <p className="flex-1 text-[15px] text-[var(--octo-accent)]" aria-live="polite">
          {offer.customerCanChange ? t("menuOffer.canChange") : t("menuOffer.cantChange")}
        </p>
        <button
          type="button"
          aria-pressed={offer.customerCanChange}
          onClick={() => onPatch({ customerCanChange: !offer.customerCanChange })}
          className="text-[15px] font-semibold text-[var(--octo-accent)] underline underline-offset-2"
        >
          {t("menuOffer.change")}
        </button>
      </div>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={t("menuOffer.addItem")}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditing(null)}>
              {t("menuWiz.cancel")}
            </Button>
            <Button disabled={pickId === "" || qty < 1} onClick={save}>
              {t("menuOffer.addItem")}
            </Button>
          </div>
        }
      >
        <div className="flex items-center gap-3">
          <Select className="flex-1" value={pickId} onChange={(e) => setPickId(e.target.value)}>
            {candidates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} — SAR {item.pricing.price}
              </option>
            ))}
          </Select>
          <input
            type="number"
            min={1}
            aria-label="qty"
            value={qty}
            onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
            className="w-[72px] rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2 py-[7px] text-[13px] text-[var(--octo-text-primary)]"
          />
        </div>
      </Modal>
    </div>
  );
}
