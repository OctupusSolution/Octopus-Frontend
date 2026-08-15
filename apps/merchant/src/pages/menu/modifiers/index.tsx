import { useState } from "react";
import { ChevronDown, GripVertical, Layers, Plus } from "lucide-react";
import { Input, Select } from "@ui/primitives";
import { modifierGroups, type ModifierGroup, type ModifierOption } from "@/shared/api/mock-menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { labelKey } from "@/shared/lib/labels";

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-[#0D6EFD]" : "bg-[var(--octo-switch-off)]"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-[var(--octo-card)] shadow transition-transform ${
          checked ? "translate-x-[15px] rtl:-translate-x-[15px]" : "translate-x-[2px] rtl:-translate-x-[2px]"
        }`}
      />
    </button>
  );
}

export function MenuModifiersPage() {
  const { t } = useI18n();
  const [groups, setGroups] = useState<readonly ModifierGroup[]>(modifierGroups);
  const [activeId, setActiveId] = useState(groups[0]?.id ?? "");
  const [expanded, setExpanded] = useState(false);
  const [newOption, setNewOption] = useState({ nameEn: "", nameAr: "", priceDelta: "" });

  const active = groups.find((g) => g.id === activeId) ?? groups[0];

  function updateActive(updater: (g: ModifierGroup) => ModifierGroup) {
    setGroups((prev) => prev.map((g) => (g.id === active.id ? updater(g) : g)));
  }

  function setDefault(optionId: string) {
    updateActive((g) => ({
      ...g,
      options: g.options.map((o) => ({ ...o, isDefault: o.id === optionId })),
    }));
  }

  function toggleAvailable(optionId: string) {
    updateActive((g) => ({
      ...g,
      options: g.options.map((o) => (o.id === optionId ? { ...o, available: !o.available } : o)),
    }));
  }

  function addOption() {
    if (!newOption.nameEn.trim()) return;
    const delta = newOption.priceDelta.trim() === "" ? null : Number(newOption.priceDelta);
    const option: ModifierOption = {
      id: `${active.id}-opt-${active.options.length + 1}`,
      nameEn: newOption.nameEn.trim(),
      nameAr: newOption.nameAr.trim() || newOption.nameEn.trim(),
      priceDelta: Number.isFinite(delta) ? delta : null,
      isDefault: false,
      available: true,
      linkedItemsCount: 0,
    };
    updateActive((g) => ({ ...g, options: [...g.options, option] }));
    setNewOption({ nameEn: "", nameAr: "", priceDelta: "" });
  }

  if (!active) return null;

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("menu.modifiers.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">{t("menu.modifiers.subtitle")}</p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[220px_1fr] lg:items-start">
        {/* --------------------------------------------------------- groups */}
        <aside className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-2 lg:sticky lg:top-0">
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => { setActiveId(g.id); setExpanded(false); }}
              className={`mb-0.5 flex w-full flex-col items-start rounded-[9px] px-2.5 py-2 text-start transition-colors ${
                g.id === active.id ? "bg-soft-blue text-ocean-blue" : "text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
              }`}
            >
              <span className="text-[12.5px] font-medium">{g.nameEn}</span>
              <span className={`text-[11px] ${g.id === active.id ? "text-ocean-blue/80" : "text-[var(--octo-text-faint)]"}`}>
                {t(labelKey(g.selectionRule))} · {g.options.length} {t("menu.modifiers.options")}
              </span>
            </button>
          ))}
        </aside>

        {/* -------------------------------------------------------- detail */}
        <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
          <div className="flex items-center gap-2">
            <Layers size={15} className="text-[var(--octo-text-muted)]" />
            <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{active.nameEn}</h2>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label={t("menu.modifiers.nameEn")}
              value={active.nameEn}
              onChange={(e) => updateActive((g) => ({ ...g, nameEn: e.target.value }))}
            />
            <Input
              label={t("menu.modifiers.nameAr")}
              value={active.nameAr}
              onChange={(e) => updateActive((g) => ({ ...g, nameAr: e.target.value }))}
              dir="rtl"
            />
            <Select
              label={t("menu.modifiers.selectionRule")}
              value={active.selectionRule}
              onChange={(e) => updateActive((g) => ({ ...g, selectionRule: e.target.value as ModifierGroup["selectionRule"] }))}
            >
              <option value="Single choice">{t("menu.modifiers.rule.single")}</option>
              <option value="Multiple choice">{t("menu.modifiers.rule.multiple")}</option>
            </Select>

            <div className="flex items-end justify-between gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={active.required}
                  onChange={() => updateActive((g) => ({ ...g, required: !g.required }))}
                  label={t("menu.modifiers.required")}
                />
                <span className="text-[12.5px] text-[var(--octo-text-primary)]">{t("menu.modifiers.required")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  label={t("menu.modifiers.min")}
                  type="number"
                  min={0}
                  value={active.minSelect}
                  onChange={(e) => updateActive((g) => ({ ...g, minSelect: Number(e.target.value) }))}
                  className="w-16"
                />
                <Input
                  label={t("menu.modifiers.max")}
                  type="number"
                  min={0}
                  value={active.maxSelect}
                  onChange={(e) => updateActive((g) => ({ ...g, maxSelect: Number(e.target.value) }))}
                  className="w-16"
                />
              </div>
            </div>
          </div>

          <div className="octo-scroll mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-[var(--octo-divider)] text-start">
                  <th className="w-6 px-2 py-2" />
                  <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                    {t("menu.modifiers.col.option")}
                  </th>
                  <th className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                    {t("menu.modifiers.col.priceDelta")}
                  </th>
                  <th className="whitespace-nowrap px-2 py-2 text-center text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                    {t("menu.modifiers.col.default")}
                  </th>
                  <th className="whitespace-nowrap px-2 py-2 text-center text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                    {t("menu.modifiers.col.available")}
                  </th>
                  <th className="whitespace-nowrap px-2 py-2 text-end text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
                    {t("menu.modifiers.col.linkedItems")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {active.options.map((o) => (
                  <tr key={o.id} className="border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]">
                    <td className="px-2 py-2.5">
                      <GripVertical size={13} className="text-[var(--octo-text-faint)]" />
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5">
                      <div className="font-medium text-[var(--octo-text-primary)]">{o.nameEn}</div>
                      <div className="text-[11px] text-[var(--octo-text-faint)]">{o.nameAr}</div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">
                      {o.priceDelta === null ? t("menu.modifiers.free") : `+SAR ${o.priceDelta.toFixed(2)}`}
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <input
                        type="radio"
                        name={`default-${active.id}`}
                        checked={o.isDefault}
                        onChange={() => setDefault(o.id)}
                        aria-label={`${t("menu.modifiers.col.default")}: ${o.nameEn}`}
                        className="h-3.5 w-3.5 cursor-pointer accent-[#0D6EFD]"
                      />
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex justify-center">
                        <Switch checked={o.available} onChange={() => toggleAvailable(o.id)} label={`${t("menu.modifiers.col.available")}: ${o.nameEn}`} />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-end text-[var(--octo-text-secondary)]">{o.linkedItemsCount}</td>
                  </tr>
                ))}

                <tr className="border-t border-dashed border-[var(--octo-border-input)]">
                  <td className="px-2 py-2.5" />
                  <td className="px-2 py-2.5">
                    <div className="flex gap-1.5">
                      <input
                        value={newOption.nameEn}
                        onChange={(e) => setNewOption((s) => ({ ...s, nameEn: e.target.value }))}
                        placeholder={t("menu.modifiers.newOptionEn")}
                        className="w-full rounded-[7px] border border-[var(--octo-border-input)] px-2 py-1 text-[12px]"
                      />
                      <input
                        value={newOption.nameAr}
                        onChange={(e) => setNewOption((s) => ({ ...s, nameAr: e.target.value }))}
                        placeholder={t("menu.modifiers.newOptionAr")}
                        dir="rtl"
                        className="w-full rounded-[7px] border border-[var(--octo-border-input)] px-2 py-1 text-[12px]"
                      />
                    </div>
                  </td>
                  <td className="px-2 py-2.5">
                    <input
                      value={newOption.priceDelta}
                      onChange={(e) => setNewOption((s) => ({ ...s, priceDelta: e.target.value }))}
                      placeholder="0.00"
                      className="w-20 rounded-[7px] border border-[var(--octo-border-input)] px-2 py-1 text-[12px]"
                    />
                  </td>
                  <td colSpan={2} />
                  <td className="px-2 py-2.5 text-end">
                    <button
                      type="button"
                      onClick={addOption}
                      className="inline-flex items-center gap-1 rounded-[7px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2.5 py-1 text-[11.5px] font-medium text-[#0D6EFD] hover:bg-[var(--octo-hover)]"
                    >
                      <Plus size={12} />
                      {t("menu.modifiers.addOption")}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 border-t border-[var(--octo-divider)] pt-3">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--octo-text-primary)]"
            >
              {t("menu.modifiers.appliedTo").replace("{n}", String(active.appliedItemNames.length))}
              <ChevronDown size={13} className={`text-[var(--octo-text-muted)] transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
            {expanded && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {active.appliedItemNames.map((name) => (
                  <span key={name} className="rounded-full bg-[var(--octo-track)] px-2 py-0.5 text-[11px] text-[var(--octo-text-secondary)]">
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
