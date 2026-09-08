// The shared vocabulary every Customize-step inspector is built from. Six
// small, purely presentational components — no draft, no dispatch, no i18n —
// so Tasks 16-18 can compose five different inspectors without ever defining
// a control of their own. Keep each under ~30 lines; a bigger one belongs to
// whichever inspector actually needs it, not here.
import type { ReactNode } from "react";
import clsx from "clsx";
import { Tabs, type TabItem } from "@ui/primitives";
import { Switch } from "../../ui/switch";

/** A label sitting above whatever control it names — the field-with-caption
 *  shape every inspector text/select field uses. */
export function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">{label}</span>
      {children}
    </div>
  );
}

/** Label + optional note on the start side, a `Switch` on the end. */
export function ToggleRow({ label, note, checked, onChange }: { label: string; note?: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">{label}</span>
        {note && <span className="text-[11px] text-[var(--octo-text-muted)]">{note}</span>}
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

/** A bordered, selectable card with a trailing radio dot — one option among
 *  mutually exclusive choices (e.g. hero background type). */
export function RadioCard({ title, note, selected, onSelect }: { title: string; note?: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={clsx(
        "flex items-center justify-between gap-3 rounded-[10px] border px-3 py-2.5 text-start transition-colors",
        selected ? "border-[#0D6EFD] bg-[#0D6EFD]/5" : "border-[var(--octo-border-input)] bg-[var(--octo-card)]"
      )}
    >
      <span className="flex flex-col gap-0.5">
        <span className={clsx("text-[12.5px] font-medium", selected ? "text-[#0D6EFD]" : "text-[var(--octo-text-primary)]")}>{title}</span>
        {note && <span className="text-[11px] text-[var(--octo-text-muted)]">{note}</span>}
      </span>
      <span className={clsx("grid h-4 w-4 shrink-0 place-items-center rounded-full border-2", selected ? "border-[#0D6EFD]" : "border-[var(--octo-border-input)]")}>
        {selected && <span className="h-2 w-2 rounded-full bg-[#0D6EFD]" />}
      </span>
    </button>
  );
}

/** Same bordered card as `RadioCard`, but a trailing checkbox square — one of
 *  several independently toggleable choices. */
export function CheckCard({ title, note, checked, onToggle }: { title: string; note?: string; checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onToggle}
      className={clsx(
        "flex items-center justify-between gap-3 rounded-[10px] border px-3 py-2.5 text-start transition-colors",
        checked ? "border-[#0D6EFD] bg-[#0D6EFD]/5" : "border-[var(--octo-border-input)] bg-[var(--octo-card)]"
      )}
    >
      <span className="flex flex-col gap-0.5">
        <span className={clsx("text-[12.5px] font-medium", checked ? "text-[#0D6EFD]" : "text-[var(--octo-text-primary)]")}>{title}</span>
        {note && <span className="text-[11px] text-[var(--octo-text-muted)]">{note}</span>}
      </span>
      <span className={clsx("grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border-2", checked ? "border-[#0D6EFD] bg-[#0D6EFD]" : "border-[var(--octo-border-input)]")}>
        {checked && <span className="h-1.5 w-1.5 rounded-[1px] bg-[var(--octo-card)]" />}
      </span>
    </button>
  );
}

/** The frames' "1- Reservation Module" heading: a numbered title with an
 *  optional note underneath, ahead of a group of fields. */
export function NumberedHeading({ n, title, note }: { n: number; title: string; note?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">
        {n}- {title}
      </p>
      {note && <p className="text-[11px] text-[var(--octo-text-muted)]">{note}</p>}
    </div>
  );
}

/** Thin wrapper over `Tabs`, named for where it's used — every inspector's
 *  Content/Style/Advanced switch. */
export function InspectorTabs({ items, value, onChange }: { items: TabItem[]; value: string; onChange: (id: string) => void }) {
  return <Tabs items={items} value={value} onChange={onChange} />;
}
