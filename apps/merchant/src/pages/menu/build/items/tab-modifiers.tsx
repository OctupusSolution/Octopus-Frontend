// The Modifiers tab: the group list, and the selected group's Edit Group form
// over its Options table.
//
// Renders its two columns as siblings so the step can lay them out beside the
// customer preview in one three-column grid, as the frames do.
//
// Three states, all with frames — no groups yet, a group with no options, and a
// group with a filled options table.
//
// Group Type, Group Name, Customer label and Help text carry the frames' red
// asterisk. They edit the draft directly, so their messages come from the
// step's form (use-item-form) under the keys `g:<groupId>:<field>` and show
// only once the field has been left or a save was attempted.
import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import clsx from "clsx";
import {
  MODIFIER_NAME_MAX,
  MODIFIER_TEXT_MAX,
  validateModifierOptionForm,
  type Item,
  type ModifierGroup,
  type ModifierOption,
} from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { useMenuCopy } from "../../copy";
import { CheckBox, Field, SelectBox, StatusPill, Switch } from "../../_shared/controls";
import { MenuIcon } from "../../_shared/menu-icon";
import { FIELD_INVALID, LINE, PANEL, SURFACE_SUBTLE, TEXT, TEXT_GRAY, TEXT_SECONDARY } from "../../_shared/theme";
import { ModifierGroupModal, ModifierOptionModal } from "./modifier-modals";
import { ADD_BUTTON, CheckGlyph, EmptyBlock, FIELD_4, FieldError, LABEL_12, LABEL_14, LABEL_16, RadioGlyph, SELECT_4, TRASH_36 } from "./ui";
import type { ItemForm } from "./use-item-form";

/** Per-row Edit / Delete buttons exist in the code but in no frame: the
 *  options table draws only name, price type, price, default and availability.
 *  Flip this to show them again at the end of each row. */
const SHOW_OPTION_ROW_ACTIONS: boolean = true;

const PRICE_TYPE_KEY: Record<ModifierOption["priceType"], string> = {
  "no-change": "menuWiz.mod.priceType.noChange",
  "add-amount": "menuWiz.mod.priceType.add",
  fixed: "menuWiz.mod.priceType.fixed",
};

/** One grid for the table's header and its rows, so the columns line up. */
const OPTION_GRID = SHOW_OPTION_ROW_ACTIONS
  ? "grid grid-cols-[minmax(0,112fr)_minmax(0,128fr)_minmax(0,92fr)_minmax(0,60fr)_minmax(0,72fr)_64px] items-center gap-x-1"
  : "grid grid-cols-[minmax(0,112fr)_minmax(0,128fr)_minmax(0,92fr)_minmax(0,60fr)_minmax(0,72fr)] items-center gap-x-1";

const CHECK_LABEL = "!gap-2 !text-[14px] !font-semibold !leading-[14px] !text-[#0058da] [[data-theme=dark]_&]:!text-[#8ab8ff]";

function range(from: number, to: number): number[] {
  return Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);
}

/** The frames' Required (amber, #de9000) and Optional (green) pills. */
function Pill({ required }: { required: boolean }) {
  const { t } = useI18n();
  return (
    <StatusPill tone={required ? "amber" : "green"} className={required ? "!text-[#de9000]" : undefined}>
      {t(required ? "menuWiz.mod.required" : "menuWiz.mod.optional")}
    </StatusPill>
  );
}

/** Drag-and-drop plus an Alt+Arrow fallback for one reorderable list.
 *
 *  The handle is what starts a drag — a grip for the group rows, the row itself
 *  for the options (which draw no grip) — but the drag image is always the row.
 *  After a keyboard move the handle is refocused by id: React moves the DOM
 *  node, and a moved node drops focus. */
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
  const { t } = useI18n();
  const [text, setText] = useState(option.price.toFixed(2));
  const [focused, setFocused] = useState(false);
  const noChange = option.priceType === "no-change";
  const shown = noChange ? "0.00" : focused ? text : option.price.toFixed(2);

  return (
    <label dir="ltr" className={clsx("flex min-w-0 items-center gap-1 text-[14px] font-medium leading-[14px] rtl:justify-end", TEXT)}>
      <span className="shrink-0">SAR</span>
      <input
        type="number"
        min={0}
        step="0.01"
        value={shown}
        readOnly={noChange}
        aria-label={`${option.name} — ${t("menuWiz.mod.col.price")}`}
        onFocus={() => {
          setText(option.price === 0 ? "" : String(option.price));
          setFocused(true);
        }}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          setText(e.target.value);
          onCommit(Math.max(0, Number(e.target.value) || 0));
        }}
        style={{ width: `${Math.max(4, shown.length) + 1}ch` }}
        className="min-w-0 max-w-full rounded-[4px] bg-transparent font-medium outline-none [appearance:textfield] focus:bg-[var(--octo-hover)] [&::-webkit-inner-spin-button]:appearance-none"
      />
    </label>
  );
}

export function TabModifiers({
  item,
  form,
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
  onReuseGroup,
}: {
  item: Item;
  form: ItemForm;
  selectedGroupId: string | null;
  onSelectGroup: (id: string) => void;
  onAddGroup: (group: Pick<ModifierGroup, "name" | "required" | "type">) => void;
  onPatchGroup: (groupId: string, patch: Partial<ModifierGroup>) => void;
  onRemoveGroup: (groupId: string) => void;
  onAddOption: (groupId: string, option: Omit<ModifierOption, "id">) => void;
  onRemoveOption: (groupId: string, optionId: string) => void;
  onUpdateOption: (groupId: string, optionId: string, patch: Partial<ModifierOption>) => void;
  onMoveGroup: (from: number, to: number) => void;
  onMoveOption: (groupId: string, from: number, to: number) => void;
  /** Opens the picker of the business's existing groups (shared, not copied). */
  onReuseGroup?: () => void;
}) {
  const { t } = useI18n();
  const reuseLabel = useMenuCopy()("groups.reuse");
  const [groupModal, setGroupModal] = useState(false);
  // null = closed, "new" = adding, otherwise the option being edited.
  const [optionModal, setOptionModal] = useState<"new" | ModifierOption | null>(null);
  // While a field in an option row has focus the row stops being draggable, so
  // the mouse selects text in it instead of picking the row up.
  const [editingRow, setEditingRow] = useState<string | null>(null);

  const groups = item.modifierGroups;
  // Nothing is selected until the merchant picks or adds a group, which is
  // exactly what the "No group selected" frame depicts.
  const group = groups.find((g) => g.id === selectedGroupId) ?? null;
  const groupIndex = group ? groups.indexOf(group) : -1;

  const groupReorder = useReorder(onMoveGroup, groups.length);
  const optionReorder = useReorder(
    (from, to) => group && onMoveOption(group.id, from, to),
    group?.options.length ?? 0
  );

  const cap = Math.max(1, group?.options.length ?? 0);
  const hasGroups = groups.length > 0;

  const fieldKey = (name: string) => `g:${group?.id ?? ""}:${name}`;
  const message = (name: string) => {
    const key = form.error(fieldKey(name));
    return key ? t(key) : null;
  };

  return (
    <>
      <section className={clsx("flex flex-col", hasGroups ? "gap-6" : "gap-4", PANEL)}>
        <div className="flex flex-col gap-4">
          <h3 className={clsx(hasGroups ? LABEL_14 : "text-[18px] font-bold leading-[18px]", TEXT)}>
            {t("menuWiz.mod.groupsTitle")}
          </h3>

          {!hasGroups ? (
            <EmptyBlock
              art="modifiers"
              size={161}
              gap="gap-2"
              title={t("menuWiz.mod.firstGroupTitle")}
              body={t("menuWiz.mod.firstGroupBody")}
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {groups.map((g, index) => (
                <li
                  key={g.id}
                  {...groupReorder.rowProps(index)}
                  className={clsx(
                    "flex items-center gap-2 rounded-[4px] border bg-[var(--octo-card)] p-1",
                    LINE,
                    groupReorder.over === index && "ring-2 ring-[#0D6EFD]/40"
                  )}
                >
                  <button
                    type="button"
                    aria-label={`${g.name} — ${t("menuWiz.mod.reorderHint")}`}
                    title={t("menuWiz.mod.reorderHint")}
                    {...groupReorder.handleProps(index, `group-${g.id}`)}
                    className="grid size-6 shrink-0 cursor-grab place-items-center rounded-[4px] text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0D6EFD] active:cursor-grabbing [[data-theme=dark]_&]:text-[var(--octo-text-primary)]"
                  >
                    <MenuIcon name="menu-drag.svg" size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectGroup(g.id)}
                    aria-current={group?.id === g.id ? "true" : undefined}
                    className="flex min-w-0 flex-1 items-center gap-2 text-start"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-2">
                      <span className={clsx("truncate text-[14px] font-medium leading-[14px]", TEXT)}>{g.name}</span>
                      <span className={clsx("text-[12px] leading-3", TEXT_GRAY)}>
                        {t("menuWiz.mod.optionCount").replace("{n}", String(g.options.length))}
                      </span>
                    </span>
                    <Pill required={g.required} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => setGroupModal(true)} className={clsx(ADD_BUTTON, "h-[42px] w-full")}>
            <MenuIcon name="menu-plus-line.svg" size={24} />
            {t("menuWiz.mod.addGroup")}
          </button>
          {onReuseGroup && (
            <button
              type="button"
              onClick={onReuseGroup}
              className="flex h-9 w-full items-center justify-center rounded-[4px] px-3 text-[14px] font-medium leading-[14px] text-[#0D6EFD] hover:bg-[var(--octo-hover)]"
            >
              {reuseLabel}
            </button>
          )}
        </div>
      </section>

      <div className="flex min-w-0 flex-col gap-4">
        {group ? (
          <>
            <section className={clsx("flex flex-col gap-4", PANEL)}>
              <h3 className={clsx("text-[18px] font-bold leading-[18px]", TEXT)}>{t("menuWiz.mod.editGroup")}</h3>

              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-4">
                  <p className={clsx("truncate", LABEL_16)}>
                    {groupIndex + 1}- {group.name}
                  </p>
                  <Pill required={group.required} />
                </div>
                <button
                  type="button"
                  aria-label={t("menuWiz.mod.deleteGroup").replace("{name}", group.name)}
                  onClick={() => onRemoveGroup(group.id)}
                  className={TRASH_36}
                >
                  <MenuIcon name="menu-trash.svg" size={24} />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <div className="grid items-start gap-4 sm:grid-cols-2">
                  {/* Required by the frame's asterisk and always answered: the
                      select has no empty option. */}
                  <Field label={t("menuWiz.mod.groupType")} required className="[&>span:first-child]:!px-0">
                    <SelectBox
                      value={group.type}
                      ariaLabel={t("menuWiz.mod.groupType")}
                      placeholderShown
                      onChange={(value) => onPatchGroup(group.id, { type: value as ModifierGroup["type"] })}
                      className={SELECT_4}
                    >
                      <option value="single">{t("menuWiz.mod.single")}</option>
                      <option value="multi">{t("menuWiz.mod.multi")}</option>
                    </SelectBox>
                  </Field>

                  <Field label={t("menuWiz.mod.groupName")} required error={message("name")}>
                    <input
                      className={clsx(FIELD_4, message("name") && FIELD_INVALID)}
                      value={group.name}
                      maxLength={MODIFIER_NAME_MAX + 20}
                      aria-label={t("menuWiz.mod.groupName")}
                      aria-invalid={message("name") ? true : undefined}
                      onChange={(e) => onPatchGroup(group.id, { name: e.target.value })}
                      onBlur={() => form.touch(fieldKey("name"))}
                    />
                  </Field>
                </div>

                <div className="grid items-start gap-4 sm:grid-cols-2">
                  <Field
                    label={t("menuWiz.mod.customerLabel")}
                    required
                    error={message("customerLabel")}
                    className="[&>span:first-child]:!px-0"
                  >
                    <input
                      className={clsx(FIELD_4, message("customerLabel") && FIELD_INVALID)}
                      value={group.customerLabel}
                      maxLength={MODIFIER_TEXT_MAX + 20}
                      aria-label={t("menuWiz.mod.customerLabel")}
                      aria-invalid={message("customerLabel") ? true : undefined}
                      onChange={(e) => onPatchGroup(group.id, { customerLabel: e.target.value })}
                      onBlur={() => form.touch(fieldKey("customerLabel"))}
                    />
                  </Field>

                  <Field
                    label={t("menuWiz.mod.helpText")}
                    hint={`(${t("menuWiz.mod.helpTextHint")})`}
                    required
                    error={message("helpText")}
                  >
                    <input
                      className={clsx(FIELD_4, message("helpText") && FIELD_INVALID)}
                      value={group.helpText}
                      maxLength={MODIFIER_TEXT_MAX + 20}
                      aria-label={t("menuWiz.mod.helpText")}
                      aria-invalid={message("helpText") ? true : undefined}
                      onChange={(e) => onPatchGroup(group.id, { helpText: e.target.value })}
                      onBlur={() => form.touch(fieldKey("helpText"))}
                    />
                  </Field>
                </div>

                <div className="flex flex-col gap-3">
                  <p className={LABEL_16}>{t("menuWiz.mod.rules")}</p>
                  {/* Limited to what the group can actually satisfy: asking for
                      three choices from two options is a group nobody can order. */}
                  <div className="grid items-start gap-4 sm:grid-cols-2">
                    <div className="flex min-w-0 flex-col gap-2">
                      <span className={LABEL_12}>{t("menuWiz.mod.min")}</span>
                      <SelectBox
                        value={String(Math.min(group.min, cap))}
                        ariaLabel={t("menuWiz.mod.min")}
                        placeholderShown
                        invalid={Boolean(message("min"))}
                        onChange={(value) => onPatchGroup(group.id, { min: Number(value) })}
                        onBlur={() => form.touch(fieldKey("min"))}
                      >
                        {range(0, group.type === "single" ? 1 : cap).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </SelectBox>
                      <FieldError>{message("min")}</FieldError>
                    </div>
                    <div className="flex min-w-0 flex-col gap-2">
                      <span className={LABEL_12}>{t("menuWiz.mod.max")}</span>
                      <SelectBox
                        value={String(Math.min(group.max, cap))}
                        ariaLabel={t("menuWiz.mod.max")}
                        placeholderShown
                        disabled={group.type === "single"}
                        invalid={Boolean(message("max"))}
                        onChange={(value) => onPatchGroup(group.id, { max: Number(value) })}
                        onBlur={() => form.touch(fieldKey("max"))}
                        className="[&>select]:disabled:!opacity-100"
                      >
                        {range(1, group.type === "single" ? 1 : cap).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </SelectBox>
                      <FieldError>{message("max")}</FieldError>
                    </div>
                  </div>
                </div>

                <CheckBox
                  checked={group.required}
                  onChange={(next) => onPatchGroup(group.id, { required: next })}
                  label={t("menuWiz.mod.requiredGroup")}
                  className={CHECK_LABEL}
                />
                <CheckBox
                  checked={group.showAsRadio}
                  onChange={(next) => onPatchGroup(group.id, { showAsRadio: next })}
                  label={t("menuWiz.mod.asRadio")}
                  className={CHECK_LABEL}
                />
              </div>
            </section>

            <section className="flex flex-col gap-4 rounded-[12px] bg-[var(--octo-card)] px-3 py-4 shadow-[0px_0px_8px_0px_rgba(0,0,0,0.05)] [[data-theme=dark]_&]:border [[data-theme=dark]_&]:border-[var(--octo-border-card)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-2">
                  <h3 className={LABEL_14}>{t("menuWiz.mod.options")}</h3>
                  {group.options.length > 0 && (
                    <p className={clsx("text-[12px] font-medium leading-[1.3]", TEXT_SECONDARY)}>{t("menuWiz.mod.dragHint")}</p>
                  )}
                </div>
                {group.options.length > 0 && (
                  <button type="button" onClick={() => setOptionModal("new")} className={clsx(ADD_BUTTON, "h-10 shrink-0")}>
                    <MenuIcon name="menu-plus-line.svg" size={24} />
                    {t("menuWiz.mod.addOption")}
                  </button>
                )}
              </div>

              {group.options.length === 0 ? (
                <div className="flex flex-col gap-4">
                  <EmptyBlock
                    art="modifiers"
                    size={161}
                    gap="gap-2"
                    title={t("menuWiz.mod.emptyTitle")}
                    body={t("menuWiz.mod.emptyBody")}
                  />
                  <button type="button" onClick={() => setOptionModal("new")} className={clsx(ADD_BUTTON, "h-10 w-full")}>
                    <MenuIcon name="menu-plus-line.svg" size={24} />
                    {t("menuWiz.mod.addOption")}
                  </button>
                </div>
              ) : (
                <div className={clsx("overflow-x-auto rounded-[12px] border p-3", LINE)}>
                  <div role="table" className="flex min-w-[440px] flex-col gap-4">
                    <div
                      role="row"
                      className={clsx(OPTION_GRID, "h-6 px-2 text-[12px] font-medium leading-3", SURFACE_SUBTLE, TEXT)}
                    >
                      <span role="columnheader">{t("menuWiz.mod.col.options")}</span>
                      <span role="columnheader" className="ps-2">{t("menuWiz.mod.col.priceType")}</span>
                      <span role="columnheader" className="text-center">{t("menuWiz.mod.col.price")}</span>
                      <span role="columnheader" className="text-center">{t("menuWiz.mod.col.default")}</span>
                      <span role="columnheader" className="text-end">{t("menuWiz.mod.col.availability")}</span>
                      {SHOW_OPTION_ROW_ACTIONS && <span aria-hidden />}
                    </div>

                    <div className="flex flex-col gap-4">
                      {group.options.map((option, index) => {
                        const single = group.type === "single";
                        const last = index === group.options.length - 1;
                        const patch = (p: Partial<ModifierOption>) => onUpdateOption(group.id, option.id, p);
                        const others = group.options.filter((o) => o.id !== option.id).map((o) => o.name);
                        const nameKey = validateModifierOptionForm(
                          { name: option.name, priceType: option.priceType, price: String(option.price) },
                          others
                        ).name;
                        const handle = optionReorder.handleProps(index, `option-${option.id}`);
                        return (
                          <div
                            key={option.id}
                            role="row"
                            tabIndex={0}
                            aria-label={`${option.name} — ${t("menuWiz.mod.reorderHint")}`}
                            {...optionReorder.rowProps(index)}
                            {...handle}
                            draggable={editingRow !== option.id}
                            onFocusCapture={(e) => {
                              if (e.target !== e.currentTarget) setEditingRow(option.id);
                            }}
                            onBlurCapture={() => setEditingRow((id) => (id === option.id ? null : id))}
                            className={clsx(
                              OPTION_GRID,
                              "rounded-[2px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D6EFD]",
                              !last && `border-b pb-2 ${LINE}`,
                              optionReorder.over === index && "bg-[#f5f9ff] [[data-theme=dark]_&]:bg-[#0d6efd]/15"
                            )}
                          >
                            <div role="cell" className="flex min-w-0 flex-col gap-2">
                              <input
                                value={option.name}
                                aria-label={t("menuWiz.mod.optionName")}
                                aria-invalid={nameKey ? true : undefined}
                                title={nameKey ? t(nameKey) : undefined}
                                onChange={(e) => patch({ name: e.target.value })}
                                className={clsx(
                                  "block w-full min-w-0 rounded-[4px] bg-transparent text-[14px] font-medium leading-[14px] outline-none focus:bg-[var(--octo-hover)]",
                                  nameKey ? "text-[#d30202]" : TEXT
                                )}
                              />
                              <input
                                value={option.subLabel}
                                aria-label={t("menuWiz.mod.subLabel")}
                                placeholder={t("menuWiz.mod.subLabelPlaceholder")}
                                onChange={(e) => patch({ subLabel: e.target.value })}
                                className={clsx(
                                  "block w-full min-w-0 rounded-[4px] bg-transparent text-[10px] font-medium leading-[10px] outline-none placeholder:text-[#cbd5e1] focus:bg-[var(--octo-hover)]",
                                  TEXT_GRAY
                                )}
                              />
                              {nameKey && <FieldError className="!text-[10px] !leading-3">{t(nameKey)}</FieldError>}
                            </div>

                            <div role="cell" className="relative w-[98px] max-w-full">
                              <select
                                value={option.priceType}
                                aria-label={t("menuWiz.mod.col.priceType")}
                                onChange={(e) => {
                                  const priceType = e.target.value as ModifierOption["priceType"];
                                  patch(priceType === "no-change" ? { priceType, price: 0 } : { priceType });
                                }}
                                className={clsx(
                                  "h-7 w-full appearance-none truncate rounded-[4px] border bg-[var(--octo-card)] pe-4 ps-1 text-[12px] leading-3 outline-none focus:border-[#0D6EFD]",
                                  LINE,
                                  TEXT_SECONDARY
                                )}
                              >
                                {(Object.keys(PRICE_TYPE_KEY) as ModifierOption["priceType"][]).map((pt) => (
                                  <option key={pt} value={pt}>{t(PRICE_TYPE_KEY[pt])}</option>
                                ))}
                              </select>
                              <MenuIcon
                                name="menu-arrow-down.svg"
                                size={12}
                                className={clsx("pointer-events-none absolute end-1 top-1/2 -translate-y-1/2", TEXT_SECONDARY)}
                              />
                            </div>

                            <div role="cell" className="flex min-w-0 justify-center">
                              <PriceCell option={option} onCommit={(price) => patch({ price })} />
                            </div>

                            <div role="cell" className="flex justify-center">
                              <button
                                type="button"
                                role={single ? "radio" : "checkbox"}
                                aria-checked={option.isDefault}
                                aria-label={`${option.name} — ${t("menuWiz.mod.col.default")}`}
                                onClick={() => patch({ isDefault: !option.isDefault })}
                                className="grid size-6 place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0D6EFD]"
                              >
                                {single ? <RadioGlyph checked={option.isDefault} /> : <CheckGlyph checked={option.isDefault} />}
                              </button>
                            </div>

                            <div role="cell" className="flex justify-end">
                              <Switch
                                checked={option.available}
                                label={`${option.name} — ${t("menuWiz.mod.availability")}`}
                                onChange={(next) => patch({ available: next })}
                              />
                            </div>

                            {SHOW_OPTION_ROW_ACTIONS && (
                              <div role="cell" className="flex justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setOptionModal(option)}
                                  className="rounded-[4px] px-1 py-1 text-[12px] font-medium text-[#0D6EFD] hover:bg-[var(--octo-hover)]"
                                >
                                  {t("menuWiz.mod.editOption").replace("{name}", "").trim()}
                                </button>
                                <button
                                  type="button"
                                  aria-label={t("menuWiz.mod.deleteOption").replace("{name}", option.name)}
                                  onClick={() => onRemoveOption(group.id, option.id)}
                                  className="grid size-6 place-items-center rounded-[4px] text-[#d30202] hover:bg-[#fef0f0]"
                                >
                                  <MenuIcon name="menu-trash.svg" size={16} />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </>
        ) : (
          <section className={clsx("flex flex-col gap-4", PANEL)}>
            <h3 className={clsx("text-[18px] font-bold leading-[18px]", TEXT)}>{t("menuWiz.mod.editGroup")}</h3>
            <EmptyBlock
              art="editGroup"
              size={200}
              gap="gap-4"
              title={t("menuWiz.mod.noGroupTitle")}
              body={t("menuWiz.mod.noGroupBody")}
            />
          </section>
        )}
      </div>

      <ModifierGroupModal
        open={groupModal}
        otherNames={groups.map((g) => g.name)}
        onClose={() => setGroupModal(false)}
        onSave={(g) => {
          onAddGroup(g);
          setGroupModal(false);
        }}
      />
      <ModifierOptionModal
        open={optionModal !== null}
        initial={optionModal === "new" ? null : optionModal}
        otherNames={(group?.options ?? [])
          .filter((o) => !(typeof optionModal === "object" && optionModal && o.id === optionModal.id))
          .map((o) => o.name)}
        onClose={() => setOptionModal(null)}
        onSave={(option) => {
          const editing = optionModal;
          if (group && editing === "new") onAddOption(group.id, option);
          else if (group && typeof editing === "object" && editing) onUpdateOption(group.id, editing.id, option);
          setOptionModal(null);
        }}
      />
    </>
  );
}
