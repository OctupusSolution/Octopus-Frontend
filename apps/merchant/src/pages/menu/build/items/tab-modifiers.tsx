// The Modifiers tab: the group list, the selected group's Edit Group form, and
// its Options panel.
//
// Three states, all with frames — no groups yet, a group with no options, and a
// group with a filled options table.
import { useState } from "react";
import clsx from "clsx";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button, Checkbox, Select } from "@ui/primitives";
import type { Item, ModifierGroup, ModifierOption } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { ModifierGroupModal, ModifierOptionModal } from "./modifier-modals";

const inputClass =
  "mt-1.5 w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2.5 text-[14px] text-[var(--octo-text-primary)]";

export function TabModifiers({
  item,
  selectedGroupId,
  onSelectGroup,
  onAddGroup,
  onPatchGroup,
  onRemoveGroup,
  onAddOption,
  onRemoveOption,
}: {
  item: Item;
  selectedGroupId: string | null;
  onSelectGroup: (id: string) => void;
  onAddGroup: (group: Pick<ModifierGroup, "name" | "required" | "type">) => void;
  onPatchGroup: (groupId: string, patch: Partial<ModifierGroup>) => void;
  onRemoveGroup: (groupId: string) => void;
  onAddOption: (groupId: string, option: Omit<ModifierOption, "id">) => void;
  onRemoveOption: (groupId: string, optionId: string) => void;
}) {
  const { t } = useI18n();
  const [groupModal, setGroupModal] = useState(false);
  const [optionModal, setOptionModal] = useState(false);

  const groups = item.modifierGroups;
  const group = groups.find((g) => g.id === selectedGroupId) ?? groups[0] ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <section className="rounded-[10px] border border-[var(--octo-border-card)] p-3">
        <h3 className="text-[14px] font-semibold text-[var(--octo-text-primary)]">
          {t("menuWiz.mod.groupsTitle")}
        </h3>

        <ul className="mt-2.5 space-y-2">
          {groups.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => onSelectGroup(g.id)}
                className={clsx(
                  "flex w-full items-center gap-2 rounded-[9px] border px-2.5 py-2 text-start",
                  group?.id === g.id
                    ? "border-[var(--octo-accent)] bg-[var(--octo-selected)]"
                    : "border-[var(--octo-border-card)]"
                )}
              >
                <GripVertical size={15} className="shrink-0 text-[var(--octo-text-faint)]" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-[var(--octo-text-primary)]">
                    {g.name}
                  </span>
                  <span className="block text-[12.5px] text-[var(--octo-text-secondary)]">
                    {t("menuWiz.mod.optionCount").replace("{n}", String(g.options.length))}
                  </span>
                </span>
                <span
                  className={clsx(
                    "shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-medium",
                    g.required
                      ? "bg-[var(--octo-tone-warning-bg)] text-[var(--octo-tone-warning-text)]"
                      : "bg-[var(--octo-tone-success-bg)] text-[var(--octo-tone-success-text)]"
                  )}
                >
                  {t(g.required ? "menuWiz.mod.required" : "menuWiz.mod.optional")}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setGroupModal(true)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-[var(--octo-accent)] bg-[var(--octo-selected)] px-3 py-2.5 text-[14px] font-medium text-[var(--octo-accent)]"
        >
          <Plus size={16} aria-hidden />
          {t("menuWiz.mod.addGroup")}
        </button>
      </section>

      <div className="space-y-4">
        {group ? (
          <>
            <section className="rounded-[10px] border border-[var(--octo-border-card)] p-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[14px] font-semibold text-[var(--octo-text-primary)]">
                  {t("menuWiz.mod.editGroup")}
                </h3>
                <button
                  type="button"
                  aria-label={group.name}
                  onClick={() => onRemoveGroup(group.id)}
                  className="rounded-[8px] border border-[var(--octo-border-card)] p-1.5 text-error hover:bg-error/10"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <p className="mt-1.5 text-[14px] font-medium text-[var(--octo-text-primary)]">
                1- {group.name}
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[13px] font-medium text-[var(--octo-text-primary)]">
                    {t("menuWiz.mod.groupType")} <span className="text-error">*</span>
                  </span>
                  <Select
                    className="mt-1.5"
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
                  <span className="text-[13px] font-medium text-[var(--octo-text-primary)]">
                    {t("menuWiz.mod.itemName")} <span className="text-error">*</span>
                  </span>
                  <input
                    className={inputClass}
                    value={group.name}
                    onChange={(e) => onPatchGroup(group.id, { name: e.target.value })}
                  />
                </label>

                <label className="block">
                  <span className="text-[13px] font-medium text-[var(--octo-text-primary)]">
                    {t("menuWiz.mod.customerLabel")} <span className="text-error">*</span>
                  </span>
                  <input
                    className={inputClass}
                    value={group.customerLabel}
                    onChange={(e) => onPatchGroup(group.id, { customerLabel: e.target.value })}
                  />
                </label>

                <label className="block">
                  <span className="text-[13px] font-medium text-[var(--octo-text-primary)]">
                    {t("menuWiz.mod.helpText")}{" "}
                    <span className="font-normal text-[var(--octo-text-secondary)]">
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

              <p className="mt-3 text-[13px] font-medium text-[var(--octo-text-primary)]">
                {t("menuWiz.mod.rules")}
              </p>
              <div className="mt-1.5 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[12.5px] text-[var(--octo-text-secondary)]">
                    {t("menuWiz.mod.min")}
                  </span>
                  <Select
                    className="mt-1"
                    value={String(group.min)}
                    onChange={(e) => onPatchGroup(group.id, { min: Number(e.target.value) })}
                  >
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </Select>
                </label>
                <label className="block">
                  <span className="text-[12.5px] text-[var(--octo-text-secondary)]">
                    {t("menuWiz.mod.max")}
                  </span>
                  <Select
                    className="mt-1"
                    value={String(group.max)}
                    onChange={(e) => onPatchGroup(group.id, { max: Number(e.target.value) })}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </Select>
                </label>
              </div>

              <div className="mt-3 space-y-2.5">
                <label className="flex items-center gap-2.5 text-[14px]">
                  <Checkbox
                    checked={group.required}
                    onChange={() => onPatchGroup(group.id, { required: !group.required })}
                  />
                  <span className="font-medium text-[var(--octo-accent)]">
                    {t("menuWiz.mod.requiredGroup")}
                  </span>
                </label>
                <label className="flex items-center gap-2.5 text-[14px]">
                  <Checkbox
                    checked={group.showAsRadio}
                    onChange={() => onPatchGroup(group.id, { showAsRadio: !group.showAsRadio })}
                  />
                  <span className="font-medium text-[var(--octo-accent)]">
                    {t("menuWiz.mod.asRadio")}
                  </span>
                </label>
              </div>
            </section>

            <section className="rounded-[10px] border border-[var(--octo-border-card)] p-3">
              <h3 className="text-[14px] font-semibold text-[var(--octo-text-primary)]">
                {t("menuWiz.mod.options")}
              </h3>

              {group.options.length === 0 ? (
                <div className="mt-3 text-center">
                  <p className="text-[14px] font-semibold text-[var(--octo-text-primary)]">
                    {t("menuWiz.mod.emptyTitle")}
                  </p>
                  <p className="mx-auto mt-1 max-w-[380px] text-[13px] text-[var(--octo-text-secondary)]">
                    {t("menuWiz.mod.emptyBody")}
                  </p>
                </div>
              ) : (
                <ul className="mt-2.5 divide-y divide-[var(--octo-border-card)]">
                  {group.options.map((option) => (
                    <li key={option.id} className="flex items-center gap-2.5 py-2.5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] text-[var(--octo-text-primary)]">
                          {option.name}
                        </span>
                        <span className="block text-[12.5px] text-[var(--octo-text-secondary)]">
                          {t(`menuWiz.mod.priceType.${
                            option.priceType === "no-change"
                              ? "noChange"
                              : option.priceType === "add-amount"
                                ? "add"
                                : "fixed"
                          }`)}
                          {option.isDefault ? ` · ${t("menuWiz.mod.setDefault")}` : ""}
                          {option.available ? "" : ` · ${t("menuWiz.item.status.unavailable")}`}
                        </span>
                      </span>
                      <span className="shrink-0 text-[13.5px] font-semibold text-[var(--octo-text-primary)]">
                        {option.priceType === "add-amount" ? "+" : ""}SAR {option.price}
                      </span>
                      <button
                        type="button"
                        aria-label={option.name}
                        onClick={() => onRemoveOption(group.id, option.id)}
                        className="shrink-0 rounded-[8px] p-1.5 text-error hover:bg-error/10"
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                onClick={() => setOptionModal(true)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-[var(--octo-accent)] bg-[var(--octo-selected)] px-3 py-2.5 text-[14px] font-medium text-[var(--octo-accent)]"
              >
                <Plus size={16} aria-hidden />
                {t("menuWiz.mod.addOption")}
              </button>
            </section>
          </>
        ) : (
          <section className="grid place-items-center rounded-[10px] border border-dashed border-[var(--octo-border-card)] p-10 text-center">
            <div>
              <p className="text-[14px] font-semibold text-[var(--octo-text-primary)]">
                {t("menuWiz.mod.emptyTitle")}
              </p>
              <p className="mx-auto mt-1 max-w-[380px] text-[13px] text-[var(--octo-text-secondary)]">
                {t("menuWiz.mod.emptyBody")}
              </p>
              <Button className="mt-3" onClick={() => setGroupModal(true)} icon={<Plus size={15} />}>
                {t("menuWiz.mod.addGroup")}
              </Button>
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
        open={optionModal}
        onClose={() => setOptionModal(false)}
        onSave={(option) => {
          if (group) onAddOption(group.id, option);
          setOptionModal(false);
        }}
      />
    </div>
  );
}
