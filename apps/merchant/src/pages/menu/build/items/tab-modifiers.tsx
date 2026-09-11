// The Modifiers tab: the group list, and the selected group's Edit Group form
// over its Options table.
//
// Renders its two columns as siblings so the step can lay them out beside the
// customer preview in one three-column grid, as the frames do.
//
// Three states, all with frames — no groups yet, a group with no options, and a
// group with a filled options table.
import { useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
import clsx from "clsx";
import { Check, GripVertical, Layers, ListPlus, PencilLine, Plus, SquarePen, Trash2 } from "lucide-react";
import { Checkbox, Select } from "@ui/primitives";
import type { Item, ModifierGroup, ModifierOption } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { ModifierGroupModal, ModifierOptionModal, Switch } from "./modifier-modals";

const inputClass =
  "mt-2 w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2.5 text-[14.5px] text-[var(--octo-text-primary)]";

const fieldLabel = "text-[16px] font-medium text-[var(--octo-text-primary)]";

/** The frame's Add buttons: a solid 1px accent outline on the card colour. */
const outlineButton =
  "flex items-center justify-center gap-2 rounded-[8px] border border-[var(--octo-accent)] bg-[var(--octo-card)] px-4 py-2.5 text-[15px] font-medium text-[var(--octo-accent)] hover:bg-[var(--octo-selected)]";

const PRICE_TYPE_KEY: Record<ModifierOption["priceType"], string> = {
  "no-change": "menuWiz.mod.priceType.noChange",
  "add-amount": "menuWiz.mod.priceType.add",
  fixed: "menuWiz.mod.priceType.fixed",
};

function range(from: number, to: number): number[] {
  return Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);
}

function Illustration({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      className="mx-auto grid h-[150px] w-[150px] place-items-center rounded-full bg-[var(--octo-selected)] text-[var(--octo-text-faint)]"
    >
      {children}
    </span>
  );
}

function Pill({ required }: { required: boolean }) {
  const { t } = useI18n();
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium",
        required
          ? "bg-[var(--octo-tone-warning-bg)] text-[var(--octo-tone-warning-text)]"
          : "bg-[var(--octo-tone-success-bg)] text-[var(--octo-tone-success-text)]"
      )}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {t(required ? "menuWiz.mod.required" : "menuWiz.mod.optional")}
    </span>
  );
}

/** Drag-and-drop plus an Alt+Arrow fallback for one reorderable list.
 *
 *  Only the grip is draggable — a whole draggable row would fight the inputs
 *  inside it for text selection — but the drag image is the row, so it still
 *  reads as moving the row. After a keyboard move the grip is refocused by id:
 *  React moves the DOM node, and a moved node drops focus. */
function useReorder(onMove: (from: number, to: number) => void, count: number) {
  const dragFrom = useRef<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  return {
    over,
    handleProps(index: number, focusId: string) {
      return {
        draggable: true,
        "data-grip": focusId,
        onDragStart(e: DragEvent<HTMLElement>) {
          dragFrom.current = index;
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", String(index));
          const row = e.currentTarget.closest("[data-row]");
          if (row) e.dataTransfer.setDragImage(row, 16, 16);
        },
        onDragEnd() {
          dragFrom.current = null;
          setOver(null);
        },
        onKeyDown(e: KeyboardEvent<HTMLElement>) {
          if (!e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
          e.preventDefault();
          const to = e.key === "ArrowUp" ? index - 1 : index + 1;
          if (to < 0 || to >= count) return;
          onMove(index, to);
          requestAnimationFrame(() =>
            document.querySelector<HTMLElement>(`[data-grip="${focusId}"]`)?.focus()
          );
        },
      };
    },
    rowProps(index: number) {
      return {
        "data-row": true,
        onDragOver(e: DragEvent<HTMLElement>) {
          if (dragFrom.current === null) return;
          e.preventDefault();
          setOver(index);
        },
        onDrop(e: DragEvent<HTMLElement>) {
          e.preventDefault();
          const from = dragFrom.current;
          dragFrom.current = null;
          setOver(null);
          if (from !== null && from !== index) onMove(from, index);
        },
      };
    },
  };
}

/** A price typed into the table. Holds its own text so "8." survives a
 *  keystroke; the number is committed on every change. */
function PriceCell({
  option,
  onCommit,
}: {
  option: ModifierOption;
  onCommit: (price: number) => void;
}) {
  const [text, setText] = useState(option.price.toFixed(2));
  const [focused, setFocused] = useState(false);
  const noChange = option.priceType === "no-change";
  const shown = noChange ? "0.00" : focused ? text : option.price.toFixed(2);

  return (
    <div className="flex items-center gap-1 text-[14.5px] text-[var(--octo-text-primary)]">
      <span>SAR</span>
      <input
        type="number"
        min={0}
        step="0.01"
        value={shown}
        readOnly={noChange}
        aria-label={`${option.name} ${noChange ? "" : "price"}`.trim()}
        onFocus={() => {
          setText(option.price === 0 ? "" : String(option.price));
          setFocused(true);
        }}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          setText(e.target.value);
          onCommit(Math.max(0, Number(e.target.value) || 0));
        }}
        className="w-full min-w-0 rounded-[6px] bg-transparent px-1 py-1 outline-none [appearance:textfield] focus:bg-[var(--octo-hover)] [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  );
}

export function TabModifiers({
  item,
  selectedGroupId,
  onSelectGroup,
  onAddGroup,
  onPatchGroup,
  onRemoveGroup,
  onAddOption,
  onRemoveOption,
  onUpdateOption,
  onMoveGroup,
  onMoveOption,
}: {
  item: Item;
  selectedGroupId: string | null;
  onSelectGroup: (id: string) => void;
  onAddGroup: (group: Pick<ModifierGroup, "name" | "required" | "type">) => void;
  onPatchGroup: (groupId: string, patch: Partial<ModifierGroup>) => void;
  onRemoveGroup: (groupId: string) => void;
  onAddOption: (groupId: string, option: Omit<ModifierOption, "id">) => void;
  onRemoveOption: (groupId: string, optionId: string) => void;
  // Optional so ItemTabs, which predates them, still type-checks when it
  // renders this tab; the step passes all three.
  onUpdateOption?: (groupId: string, optionId: string, patch: Partial<ModifierOption>) => void;
  onMoveGroup?: (from: number, to: number) => void;
  onMoveOption?: (groupId: string, from: number, to: number) => void;
}) {
  const { t } = useI18n();
  const [groupModal, setGroupModal] = useState(false);
  // null = closed, "new" = adding, otherwise the option being edited.
  const [optionModal, setOptionModal] = useState<"new" | ModifierOption | null>(null);

  const groups = item.modifierGroups;
  // Nothing is selected until the merchant picks or adds a group, which is
  // exactly what the "No group selected" frame depicts.
  const group = groups.find((g) => g.id === selectedGroupId) ?? null;
  const groupIndex = group ? groups.indexOf(group) : -1;

  const groupReorder = useReorder((from, to) => onMoveGroup?.(from, to), groups.length);
  const optionReorder = useReorder(
    (from, to) => group && onMoveOption?.(group.id, from, to),
    group?.options.length ?? 0
  );

  const cap = Math.max(1, group?.options.length ?? 0);

  return (
    <>
      <section className="self-start rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
        <h3 className="text-[20px] font-semibold text-[var(--octo-text-primary)]">
          {t("menuWiz.mod.groupsTitle")}
        </h3>

        {groups.length === 0 ? (
          <div className="mt-4 text-center">
            <Illustration>
              <Layers size={64} strokeWidth={1.4} />
            </Illustration>
            <p className="mt-4 text-[16px] font-semibold text-[var(--octo-text-primary)]">
              {t("menuWiz.mod.firstGroupTitle")}
            </p>
            <p className="mx-auto mt-1 max-w-[280px] text-[14px] text-[var(--octo-text-secondary)]">
              {t("menuWiz.mod.firstGroupBody")}
            </p>
          </div>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {groups.map((g, index) => (
              <li
                key={g.id}
                {...groupReorder.rowProps(index)}
                className={clsx(
                  "flex items-center gap-1.5 rounded-[8px] border bg-[var(--octo-card)] pe-2.5",
                  group?.id === g.id
                    ? "border-[var(--octo-accent)]"
                    : "border-[var(--octo-border-card)]",
                  groupReorder.over === index && "ring-2 ring-[var(--octo-accent)]/40"
                )}
              >
                <button
                  type="button"
                  aria-label={`${g.name} — ${t("menuWiz.mod.reorderHint")}`}
                  title={t("menuWiz.mod.reorderHint")}
                  {...groupReorder.handleProps(index, `group-${g.id}`)}
                  className="cursor-grab self-stretch ps-2 text-[var(--octo-text-secondary)] active:cursor-grabbing"
                >
                  <GripVertical size={16} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => onSelectGroup(g.id)}
                  aria-current={group?.id === g.id}
                  className="flex min-w-0 flex-1 items-center gap-2 py-2 text-start"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] text-[var(--octo-text-primary)]">
                      {g.name}
                    </span>
                    <span className="block text-[13px] text-[var(--octo-text-secondary)]">
                      {t("menuWiz.mod.optionCount").replace("{n}", String(g.options.length))}
                    </span>
                  </span>
                  <Pill required={g.required} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => setGroupModal(true)}
          className={clsx(outlineButton, "mt-4 w-full")}
        >
          <Plus size={18} aria-hidden />
          {t("menuWiz.mod.addGroup")}
        </button>
      </section>

      <div className="space-y-4">
        {group ? (
          <>
            <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
              <h3 className="text-[24px] font-bold text-[var(--octo-text-primary)]">
                {t("menuWiz.mod.editGroup")}
              </h3>

              <div className="mt-2 flex items-center gap-3">
                <p className="text-[18px] text-[var(--octo-text-primary)]">
                  {groupIndex + 1}- {group.name}
                </p>
                <Pill required={group.required} />
                <button
                  type="button"
                  aria-label={t("menuWiz.mod.deleteGroup").replace("{name}", group.name)}
                  onClick={() => onRemoveGroup(group.id)}
                  className="ms-auto grid h-9 w-9 place-items-center rounded-[8px] bg-error/10 text-error hover:bg-error/20"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-2">
                <label className="block">
                  <span className={fieldLabel}>
                    {t("menuWiz.mod.groupType")} <span className="text-error">*</span>
                  </span>
                  <Select
                    className="mt-2"
                    value={group.type}
                    onChange={(e) =>
                      onPatchGroup(group.id, { type: e.target.value as ModifierGroup["type"] })
                    }
                  >
                    <option value="single">{t("menuWiz.mod.single")}</option>
                    <option value="multi">{t("menuWiz.mod.multi")}</option>
                  </Select>
                </label>

                <label className="block">
                  <span className={fieldLabel}>
                    {t("menuWiz.mod.itemName")} <span className="text-error">*</span>
                  </span>
                  <input
                    className={inputClass}
                    value={group.name}
                    onChange={(e) => onPatchGroup(group.id, { name: e.target.value })}
                  />
                </label>

                <label className="block">
                  <span className={fieldLabel}>
                    {t("menuWiz.mod.customerLabel")} <span className="text-error">*</span>
                  </span>
                  <input
                    className={inputClass}
                    value={group.customerLabel}
                    onChange={(e) => onPatchGroup(group.id, { customerLabel: e.target.value })}
                  />
                </label>

                <label className="block">
                  <span className={fieldLabel}>
                    {t("menuWiz.mod.helpText")}{" "}
                    <span className="text-[13px] font-normal text-[var(--octo-text-secondary)]">
                      ({t("menuWiz.mod.helpTextHint")})
                    </span>
                    <span className="text-error"> *</span>
                  </span>
                  <input
                    className={inputClass}
                    value={group.helpText}
                    onChange={(e) => onPatchGroup(group.id, { helpText: e.target.value })}
                  />
                </label>
              </div>

              <p className="mt-4 text-[16px] font-medium text-[var(--octo-text-primary)]">
                {t("menuWiz.mod.rules")}
              </p>
              {/* Limited to what the group can actually satisfy: asking for
                  three choices from two options is a group nobody can order. */}
              <div className="mt-1.5 grid gap-x-4 gap-y-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[13.5px] text-[var(--octo-text-primary)]">
                    {t("menuWiz.mod.min")}
                  </span>
                  <Select
                    className="mt-1.5"
                    value={String(Math.min(group.min, cap))}
                    onChange={(e) => onPatchGroup(group.id, { min: Number(e.target.value) })}
                  >
                    {range(0, group.type === "single" ? 1 : cap).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </Select>
                </label>
                <label className="block">
                  <span className="text-[13.5px] text-[var(--octo-text-primary)]">
                    {t("menuWiz.mod.max")}
                  </span>
                  <Select
                    className="mt-1.5"
                    value={String(Math.min(group.max, cap))}
                    disabled={group.type === "single"}
                    onChange={(e) => onPatchGroup(group.id, { max: Number(e.target.value) })}
                  >
                    {range(1, group.type === "single" ? 1 : cap).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </Select>
                </label>
              </div>

              <div className="mt-4 space-y-3">
                <label className="flex items-center gap-2.5">
                  <Checkbox
                    className="[&_input]:h-5 [&_input]:w-5 [&>span]:h-5 [&>span]:w-5"
                    checked={group.required}
                    onChange={() => onPatchGroup(group.id, { required: !group.required })}
                  />
                  <span className="text-[16px] font-medium text-[var(--octo-accent)]">
                    {t("menuWiz.mod.requiredGroup")}
                  </span>
                </label>
                <label className="flex items-center gap-2.5">
                  <Checkbox
                    className="[&_input]:h-5 [&_input]:w-5 [&>span]:h-5 [&>span]:w-5"
                    checked={group.showAsRadio}
                    onChange={() => onPatchGroup(group.id, { showAsRadio: !group.showAsRadio })}
                  />
                  <span className="text-[16px] font-medium text-[var(--octo-accent)]">
                    {t("menuWiz.mod.asRadio")}
                  </span>
                </label>
              </div>
            </section>

            <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[16px] text-[var(--octo-text-primary)]">
                    {t("menuWiz.mod.options")}
                  </h3>
                  {group.options.length > 0 && (
                    <p className="mt-0.5 text-[13.5px] text-[var(--octo-text-secondary)]">
                      {t("menuWiz.mod.dragHint")}
                    </p>
                  )}
                </div>
                {group.options.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setOptionModal("new")}
                    className={outlineButton}
                  >
                    <Plus size={18} aria-hidden />
                    {t("menuWiz.mod.addOption")}
                  </button>
                )}
              </div>

              {group.options.length === 0 ? (
                <>
                  <div className="mt-4 text-center">
                    <Illustration>
                      <ListPlus size={64} strokeWidth={1.4} />
                    </Illustration>
                    <p className="mt-4 text-[16px] font-semibold text-[var(--octo-text-primary)]">
                      {t("menuWiz.mod.emptyTitle")}
                    </p>
                    <p className="mx-auto mt-1 max-w-[440px] text-[14px] text-[var(--octo-text-secondary)]">
                      {t("menuWiz.mod.emptyBody")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOptionModal("new")}
                    className={clsx(outlineButton, "mt-4 w-full")}
                  >
                    <Plus size={18} aria-hidden />
                    {t("menuWiz.mod.addOption")}
                  </button>
                </>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-[10px] border border-[var(--octo-border-card)] p-2.5">
                  <table className="w-full min-w-[640px] border-collapse text-start">
                    <thead>
                      <tr className="bg-[var(--octo-hover)] text-[13.5px] font-medium text-[var(--octo-text-primary)]">
                        <th className="w-6 rounded-s-[6px]" aria-hidden />
                        <th className="px-2 py-2 text-start font-medium">{t("menuWiz.mod.col.options")}</th>
                        <th className="px-2 py-2 text-start font-medium">{t("menuWiz.mod.col.priceType")}</th>
                        <th className="px-2 py-2 text-start font-medium">{t("menuWiz.mod.col.price")}</th>
                        <th className="px-2 py-2 text-center font-medium">{t("menuWiz.mod.col.default")}</th>
                        <th className="px-2 py-2 text-center font-medium">{t("menuWiz.mod.col.availability")}</th>
                        <th className="w-[68px] rounded-e-[6px]" aria-hidden />
                      </tr>
                    </thead>
                    <tbody>
                      {group.options.map((option, index) => {
                        const single = group.type === "single";
                        const patch = (p: Partial<ModifierOption>) =>
                          onUpdateOption?.(group.id, option.id, p);
                        return (
                          <tr
                            key={option.id}
                            {...optionReorder.rowProps(index)}
                            className={clsx(
                              "border-b border-[var(--octo-border-card)] last:border-b-0",
                              optionReorder.over === index && "bg-[var(--octo-selected)]"
                            )}
                          >
                            <td className="align-middle">
                              <button
                                type="button"
                                aria-label={`${option.name} — ${t("menuWiz.mod.reorderHint")}`}
                                title={t("menuWiz.mod.reorderHint")}
                                {...optionReorder.handleProps(index, `option-${option.id}`)}
                                className="cursor-grab p-0.5 text-[var(--octo-text-faint)] active:cursor-grabbing"
                              >
                                <GripVertical size={15} aria-hidden />
                              </button>
                            </td>
                            <td className="px-2 py-2.5">
                              <input
                                value={option.name}
                                aria-label={t("menuWiz.mod.optionName")}
                                onChange={(e) => patch({ name: e.target.value })}
                                className="block w-full min-w-0 rounded-[6px] bg-transparent px-1 text-[15px] text-[var(--octo-text-primary)] outline-none focus:bg-[var(--octo-hover)]"
                              />
                              <input
                                value={option.subLabel}
                                aria-label={t("menuWiz.mod.subLabel")}
                                placeholder={t("menuWiz.mod.subLabelPlaceholder")}
                                onChange={(e) => patch({ subLabel: e.target.value })}
                                className="mt-0.5 block w-full min-w-0 rounded-[6px] bg-transparent px-1 text-[12.5px] text-[var(--octo-text-secondary)] outline-none placeholder:text-[var(--octo-text-faint)] focus:bg-[var(--octo-hover)]"
                              />
                            </td>
                            <td className="px-2 py-2.5">
                              <select
                                value={option.priceType}
                                aria-label={t("menuWiz.mod.col.priceType")}
                                onChange={(e) => {
                                  const priceType = e.target.value as ModifierOption["priceType"];
                                  patch(priceType === "no-change" ? { priceType, price: 0 } : { priceType });
                                }}
                                className="w-[132px] rounded-[6px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2 py-1.5 text-[13px] text-[var(--octo-text-secondary)]"
                              >
                                {(Object.keys(PRICE_TYPE_KEY) as ModifierOption["priceType"][]).map((pt) => (
                                  <option key={pt} value={pt}>{t(PRICE_TYPE_KEY[pt])}</option>
                                ))}
                              </select>
                            </td>
                            <td className="w-[120px] px-2 py-2.5">
                              <PriceCell option={option} onCommit={(price) => patch({ price })} />
                            </td>
                            <td className="px-2 py-2.5 text-center">
                              <button
                                type="button"
                                role={single ? "radio" : "checkbox"}
                                aria-checked={option.isDefault}
                                aria-label={`${option.name} — ${t("menuWiz.mod.col.default")}`}
                                onClick={() => patch({ isDefault: !option.isDefault })}
                                className={clsx(
                                  "mx-auto grid h-5 w-5 place-items-center border",
                                  single ? "rounded-full" : "rounded-[4px]",
                                  option.isDefault
                                    ? single
                                      ? "border-[1.5px] border-[var(--octo-accent)]"
                                      : "border-[var(--octo-accent)] bg-[var(--octo-accent)]"
                                    : "border-[var(--octo-border-input)]"
                                )}
                              >
                                {option.isDefault &&
                                  (single ? (
                                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--octo-accent)]" />
                                  ) : (
                                    <Check size={13} strokeWidth={3} className="text-white" />
                                  ))}
                              </button>
                            </td>
                            <td className="px-2 py-2.5">
                              <div className="flex justify-center">
                                <Switch
                                  checked={option.available}
                                  label={`${option.name} — ${t("menuWiz.mod.availability")}`}
                                  onChange={() => patch({ available: !option.available })}
                                />
                              </div>
                            </td>
                            <td className="py-2.5">
                              <div className="flex justify-end gap-0.5">
                                <button
                                  type="button"
                                  aria-label={t("menuWiz.mod.editOption").replace("{name}", option.name)}
                                  onClick={() => setOptionModal(option)}
                                  className="rounded-[6px] p-1.5 text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
                                >
                                  <SquarePen size={16} />
                                </button>
                                <button
                                  type="button"
                                  aria-label={t("menuWiz.mod.deleteOption").replace("{name}", option.name)}
                                  onClick={() => onRemoveOption(group.id, option.id)}
                                  className="rounded-[6px] p-1.5 text-error hover:bg-error/10"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
            <h3 className="text-[24px] font-bold text-[var(--octo-text-primary)]">
              {t("menuWiz.mod.editGroup")}
            </h3>
            <div className="py-6 text-center">
              <Illustration>
                <PencilLine size={68} strokeWidth={1.4} />
              </Illustration>
              <p className="mt-5 text-[16px] font-semibold text-[var(--octo-text-primary)]">
                {t("menuWiz.mod.noGroupTitle")}
              </p>
              <p className="mx-auto mt-1 max-w-[520px] text-[14px] text-[var(--octo-text-secondary)]">
                {t("menuWiz.mod.noGroupBody")}
              </p>
            </div>
          </section>
        )}
      </div>

      <ModifierGroupModal
        open={groupModal}
        onClose={() => setGroupModal(false)}
        onSave={(g) => {
          onAddGroup(g);
          setGroupModal(false);
        }}
      />
      <ModifierOptionModal
        open={optionModal !== null}
        initial={optionModal === "new" ? null : optionModal}
        onClose={() => setOptionModal(null)}
        onSave={(option) => {
          const editing = optionModal;
          if (group && editing === "new") onAddOption(group.id, option);
          else if (group && typeof editing === "object" && editing)
            onUpdateOption?.(group.id, editing.id, option);
          setOptionModal(null);
        }}
      />
    </>
  );
}
