// The Allergies tab: which allergens this dish carries, plus free text for the
// things a checkbox cannot say ("fried in the same oil as shellfish").
import { useState } from "react";
import clsx from "clsx";
import { Modal } from "@ui/primitives";
import { useMenuLabels, type Item } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { LabelsManager, useLabelName } from "../../labels-manager";
import { useMenuCopy } from "../../copy";
import { MenuIcon } from "../../_shared/menu-icon";
import { FOCUS, LINE, MODAL_SUBMIT, TEXT, TEXT_GRAY } from "../../_shared/theme";
import { ACCENT_TEXT, ADD_BUTTON, CheckGlyph, LABEL_14 } from "./ui";

/** "Manage labels" opens the business's label manager. No frame draws it;
 *  flip this to offer it again under the list. */
const SHOW_MANAGE_LABELS: boolean = false;

// The three the frame shows are listed by default; `Add Allergens` offers the
// rest — the business's Advisory labels (GET /menu/labels, seeded + its own)
// when they can be read, this fixed list only as the fallback. Anything already
// on the item is rendered whether or not it appears here, so an allergen set
// elsewhere is never silently dropped.
const DEFAULT_ROWS = ["gluten", "eggs", "dairy"] as const;
const KNOWN = [
  ...DEFAULT_ROWS,
  "nuts", "peanuts", "soy", "fish", "shellfish", "sesame", "mustard", "celery",
] as const;

/** One bordered row: the frame's 24px checkbox and a blue 14px label. The
 *  native input stays in the tree for keyboard and screen readers. */
function AllergenRow({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className={clsx("flex cursor-pointer items-center gap-2 rounded-[4px] border p-2", LINE)}>
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span className="inline-flex rounded-[4px] peer-focus-visible:ring-2 peer-focus-visible:ring-[#0D6EFD]/40">
        <CheckGlyph checked={checked} />
      </span>
      <span className={clsx("min-w-0 truncate text-[14px] font-semibold leading-[14px]", ACCENT_TEXT)}>{label}</span>
    </label>
  );
}

export function TabAllergies({
  item,
  onPatch,
}: {
  item: Item;
  onPatch: (patch: Partial<Item>) => void;
}) {
  const { t } = useI18n();
  const c = useMenuCopy();
  const labelName = useLabelName();
  const labels = useMenuLabels();
  const [manageOpen, setManageOpen] = useState(false);
  const advisories = (labels.data ?? []).filter((l) => l.kind === "Advisory");
  const known: readonly string[] = advisories.length > 0 ? advisories.map((l) => l.code) : KNOWN;
  const selected = item.allergies.allergens;
  // Rows the merchant pulled in from the picker but has not ticked yet stay
  // listed for this visit, so unticking one does not make it vanish mid-click.
  const [extraRows, setExtraRows] = useState<string[]>([]);
  const rows = Array.from(new Set<string>([...DEFAULT_ROWS, ...extraRows, ...selected]));
  const available = known.filter((id) => !rows.includes(id));

  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

  function label(id: string) {
    const server = advisories.find((l) => l.code === id);
    if (server) return labelName(server);
    const key = `menuWiz.item.allergen.${id}`;
    const text = t(key);
    // Unknown ids (set by an import, say) have no key; show the raw id.
    return text === key ? id : text;
  }

  function toggle(id: string) {
    onPatch({
      allergies: {
        ...item.allergies,
        allergens: selected.includes(id) ? selected.filter((a) => a !== id) : [...selected, id],
      },
    });
  }

  function closePicker() {
    setPicked([]);
    setPickerOpen(false);
  }

  function addPicked() {
    const fresh = picked.filter((id) => !selected.includes(id));
    if (fresh.length) {
      onPatch({ allergies: { ...item.allergies, allergens: [...selected, ...fresh] } });
      setExtraRows((prev) => [...prev, ...fresh]);
    }
    closePicker();
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {rows.map((id) => (
          <AllergenRow key={id} checked={selected.includes(id)} onChange={() => toggle(id)} label={label(id)} />
        ))}

        <button type="button" onClick={() => setPickerOpen(true)} className={clsx(ADD_BUTTON, "h-10 w-full")}>
          <MenuIcon name="menu-plus-line.svg" size={24} />
          {t("menuWiz.item.addAllergens")}
        </button>
        {SHOW_MANAGE_LABELS && labels.businessId && (
          <button
            type="button"
            onClick={() => setManageOpen(true)}
            className="self-start rounded-[4px] px-2 py-1 text-[12px] font-medium leading-3 text-[#0D6EFD] hover:bg-[var(--octo-hover)]"
          >
            {c("labels.manage")}
          </button>
        )}
      </div>

      <label className="flex flex-col gap-2">
        <span className={LABEL_14}>{t("menuWiz.item.allergenNote")}</span>
        <textarea
          rows={2}
          value={item.allergies.note}
          onChange={(e) => onPatch({ allergies: { ...item.allergies, note: e.target.value } })}
          className={clsx(
            "w-full resize-y rounded-[12px] border bg-[var(--octo-card)] px-3 py-2 text-[12px] font-medium leading-[1.4]",
            LINE,
            TEXT,
            FOCUS
          )}
        />
      </label>

      <Modal open={manageOpen} onClose={() => setManageOpen(false)} title={c("labels.manage")} className="max-w-[600px]">
        <LabelsManager initialKind="Advisory" />
      </Modal>

      {/* The frames stop at the button; this dialog borrows the Add Modifier
          dialogs' chrome so it reads as part of the same set. */}
      <Modal open={pickerOpen} onClose={closePicker} backdropClassName="bg-black/60" className="!max-w-[738px] !rounded-[12px] !p-6 !shadow-none">
        <div className="flex flex-col gap-6">
          <h2 className="text-[24px] font-semibold leading-6 text-[#0e0e0e] [[data-theme=dark]_&]:text-[var(--octo-text-primary)]">
            {t("menuWiz.item.addAllergens")}
          </h2>
          {available.length === 0 ? (
            <p className={clsx("text-[14px] leading-[1.4]", TEXT_GRAY)}>{t("menuWiz.item.allergenAll")}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {available.map((id) => (
                <AllergenRow
                  key={id}
                  checked={picked.includes(id)}
                  onChange={() => setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))}
                  label={label(id)}
                />
              ))}
            </div>
          )}
          <button type="button" className={MODAL_SUBMIT} disabled={picked.length === 0} onClick={addPicked}>
            {t("menuWiz.item.allergenAdd")}
          </button>
        </div>
      </Modal>
    </>
  );
}
