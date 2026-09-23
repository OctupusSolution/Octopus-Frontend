// The Allergies tab: which allergens this dish carries, plus free text for the
// things a checkbox cannot say ("fried in the same oil as shellfish").
import { useState } from "react";
import { Check, Plus, Tags } from "lucide-react";
import { Button, Modal } from "@ui/primitives";
import { useMenuLabels, type Item } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { LabelsManager, useLabelName } from "../../labels-manager";
import { useMenuCopy } from "../../copy";

// The three the frame shows are listed by default; `Add Allergens` offers the
// rest — the business's Advisory labels (GET /menu/labels, seeded + its own)
// when they can be read, this fixed list only as the fallback. Anything already on the item is rendered whether or not it appears
// here, so an allergen set elsewhere is never silently dropped.
const DEFAULT_ROWS = ["gluten", "eggs", "dairy"] as const;
const KNOWN = [
  ...DEFAULT_ROWS,
  "nuts", "peanuts", "soy", "fish", "shellfish", "sesame", "mustard", "celery",
] as const;

/** A 22px checkbox — the primitive's 16px box reads as a speck beside the
 *  frame's 16px labels. The native input stays in place for a11y. */
function BigCheck({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <span className="relative inline-grid h-[22px] w-[22px] shrink-0 place-items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer absolute inset-0 cursor-pointer appearance-none rounded-[4px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] checked:border-[var(--octo-accent)] checked:bg-[var(--octo-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--octo-accent)]"
      />
      <Check
        size={15}
        strokeWidth={3}
        aria-hidden
        className="pointer-events-none relative hidden text-white peer-checked:block"
      />
    </span>
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

  function addPicked() {
    const fresh = picked.filter((id) => !selected.includes(id));
    if (fresh.length) {
      onPatch({ allergies: { ...item.allergies, allergens: [...selected, ...fresh] } });
      setExtraRows((rows) => [...rows, ...fresh]);
    }
    setPicked([]);
    setPickerOpen(false);
  }

  return (
    <div className="space-y-3">
      {rows.map((id) => (
        <label
          key={id}
          className="flex cursor-pointer items-center gap-3 rounded-[8px] border border-[var(--octo-border-card)] px-3 py-3"
        >
          <BigCheck checked={selected.includes(id)} onChange={() => toggle(id)} />
          <span className="text-[16px] font-medium text-[var(--octo-accent)]">{label(id)}</span>
        </label>
      ))}

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-[8px] border border-[var(--octo-accent)] bg-[var(--octo-card)] px-3 py-3 text-[16px] font-medium text-[var(--octo-accent)] hover:bg-[var(--octo-hover)]"
      >
        <Plus size={20} aria-hidden />
        {t("menuWiz.item.addAllergens")}
      </button>
      {labels.businessId && (
        <button
          type="button"
          onClick={() => setManageOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-[8px] px-2 py-1.5 text-[13px] text-[var(--octo-accent)] hover:bg-[var(--octo-hover)]"
        >
          <Tags size={15} aria-hidden />
          {c("labels.manage")}
        </button>
      )}

      <Modal open={manageOpen} onClose={() => setManageOpen(false)} title={c("labels.manage")} className="max-w-[600px]">
        <LabelsManager initialKind="Advisory" />
      </Modal>

      <label className="block pt-1">
        <span className="text-[16px] font-medium text-[var(--octo-text-primary)]">
          {t("menuWiz.item.allergenNote")}
        </span>
        <textarea
          rows={3}
          value={item.allergies.note}
          onChange={(e) => onPatch({ allergies: { ...item.allergies, note: e.target.value } })}
          className="mt-1.5 w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2.5 text-[14px] text-[var(--octo-text-primary)]"
        />
      </label>

      <Modal
        open={pickerOpen}
        onClose={() => {
          setPicked([]);
          setPickerOpen(false);
        }}
        title={
          <span className="text-[20px] font-bold text-[var(--octo-text-primary)]">
            {t("menuWiz.item.addAllergens")}
          </span>
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setPicked([]);
                setPickerOpen(false);
              }}
            >
              {t("menuWiz.cancel")}
            </Button>
            <Button disabled={picked.length === 0} onClick={addPicked}>
              {t("menuWiz.item.allergenAdd")}
            </Button>
          </div>
        }
      >
        {available.length === 0 ? (
          <p className="text-[14px] text-[var(--octo-text-secondary)]">
            {t("menuWiz.item.allergenAll")}
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {available.map((id) => (
              <label
                key={id}
                className="flex cursor-pointer items-center gap-3 rounded-[8px] border border-[var(--octo-border-card)] px-3 py-2.5"
              >
                <BigCheck
                  checked={picked.includes(id)}
                  onChange={() =>
                    setPicked((list) =>
                      list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
                    )
                  }
                />
                <span className="text-[15px] text-[var(--octo-text-primary)]">{label(id)}</span>
              </label>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
