// Items on Offer — what is in the combo, and how many of each.
//
// Adding is a picker over the menu's own items, because an offer entry points
// at an item by id: letting a name be typed here would create a line that
// resolves to nothing and quotes a price for a dish that does not exist.
import { useState } from "react";
import { GripVertical, Minus, Plus, Trash2 } from "lucide-react";
import { Button, Modal, Select } from "@ui/primitives";
import {
  OFFERS_SECTION_ID,
  offerLines,
  type Item,
  type Menu,
  type Offer,
} from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";

export function TabItems({
  menu,
  offer,
  onSetEntry,
  onRemoveEntry,
  onPatch,
}: {
  menu: Menu;
  offer: Offer;
  onSetEntry: (itemId: string, qty: number, price: number) => void;
  onRemoveEntry: (itemId: string) => void;
  onPatch: (patch: Partial<Offer>) => void;
}) {
  const { t } = useI18n();
  const [picking, setPicking] = useState(false);
  const [pickId, setPickId] = useState("");

  const lines = offerLines(menu, offer);
  const candidates = menu.sections
    .filter((s) => s.id !== OFFERS_SECTION_ID)
    .flatMap((s) => s.entries as Item[])
    .filter((item) => !offer.entries.some((e) => e.itemId === item.id));

  return (
    <div className="max-w-[760px] space-y-2.5">
      {offer.entries.map((entry, index) => {
        const line = lines[index];
        if (!line) return null;
        return (
          <div
            key={entry.itemId}
            className="flex items-center gap-2.5 rounded-[10px] border border-[var(--octo-border-card)] p-2.5"
          >
            <GripVertical size={16} className="shrink-0 text-[var(--octo-text-faint)]" aria-hidden />
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-[#0d2b21] text-center font-serif text-[9px] leading-tight text-white/70"
              aria-hidden
            >
              ME
              <br />
              NU
            </span>
            <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--octo-text-primary)]">
              {line.name}
            </span>

            <div className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--octo-border-card)] px-1.5 py-1">
              <button
                type="button"
                aria-label={`${line.name} −`}
                onClick={() => onSetEntry(entry.itemId, entry.qty - 1, entry.price)}
                className="grid h-6 w-6 place-items-center rounded-full bg-[var(--octo-track)] text-[var(--octo-text-secondary)]"
              >
                <Minus size={13} />
              </button>
              <span className="min-w-[18px] text-center text-[14px] text-[var(--octo-text-primary)]">
                {entry.qty}
              </span>
              <button
                type="button"
                aria-label={`${line.name} +`}
                onClick={() => onSetEntry(entry.itemId, entry.qty + 1, entry.price)}
                className="grid h-6 w-6 place-items-center rounded-full bg-[var(--octo-accent)] text-white"
              >
                <Plus size={13} />
              </button>
            </div>

            {/* Line price, not unit price: three drinks cost three drinks. */}
            <span className="shrink-0 text-[14px] font-semibold text-[var(--octo-accent)]">
              SAR {line.price * line.qty}
            </span>
            <button
              type="button"
              aria-label={line.name}
              onClick={() => onRemoveEntry(entry.itemId)}
              className="shrink-0 rounded-[8px] p-1.5 text-error hover:bg-error/10"
            >
              <Trash2 size={15} />
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => {
          setPickId(candidates[0]?.id ?? "");
          setPicking(true);
        }}
        disabled={candidates.length === 0}
        className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-[var(--octo-accent)] bg-[var(--octo-selected)] px-3 py-2.5 text-[14px] font-medium text-[var(--octo-accent)] disabled:opacity-50"
      >
        <Plus size={16} aria-hidden />
        {t("menuOffer.addItem")}
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-[var(--octo-selected)] px-3.5 py-2.5">
        <p className="text-[13.5px] text-[var(--octo-accent)]">
          {offer.customerCanChange ? t("menuOffer.change") : t("menuOffer.cantChange")}
        </p>
        <button
          type="button"
          onClick={() => onPatch({ customerCanChange: !offer.customerCanChange })}
          className="text-[13.5px] font-semibold text-[var(--octo-accent)] underline"
        >
          {t("menuOffer.change")}
        </button>
      </div>

      <Modal
        open={picking}
        onClose={() => setPicking(false)}
        title={t("menuOffer.addItem")}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPicking(false)}>
              {t("menuWiz.cancel")}
            </Button>
            <Button
              disabled={pickId === ""}
              onClick={() => {
                const item = candidates.find((c) => c.id === pickId);
                if (item) onSetEntry(item.id, 1, item.pricing.price);
                setPicking(false);
              }}
            >
              {t("menuOffer.addItem")}
            </Button>
          </div>
        }
      >
        <Select value={pickId} onChange={(e) => setPickId(e.target.value)}>
          {candidates.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} — SAR {item.pricing.price}
            </option>
          ))}
        </Select>
      </Modal>
    </div>
  );
}
