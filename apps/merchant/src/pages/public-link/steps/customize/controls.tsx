// The shared vocabulary every Customize-step inspector is built from. Small,
// purely presentational components — no draft, no dispatch, no i18n — drawn
// to the Figma "Public Link-step 5" frames with the builder's kit (`ui/kit`),
// so the inspectors compose them without ever defining a control of their own.
import type { ReactNode } from "react";
import clsx from "clsx";
import type { TabItem } from "@ui/primitives";
import { PlButton, PlField, PlFieldError, PlIcon, plPanel, plText } from "../../ui/kit";
import { Switch } from "../../ui/switch";

const FOCUS = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40";

/** A label sitting above whatever control it names (14px medium, 12px gap).
 *  `small` is the frames' 12px caption ("Background Type", "Display Style").
 *  `error` replaces `hint` under the control while the field is invalid. */
export function FieldRow({
  label,
  children,
  optional,
  required,
  hint,
  error,
  action,
  small,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  /** "(Optional)"-style 10px suffix after the label. */
  optional?: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  /** Trailing link on the label row (the frames' "Edit"). */
  action?: ReactNode;
  small?: boolean;
  className?: string;
}) {
  if (!small) {
    return (
      <PlField label={label} optional={optional} required={required} hint={hint} error={error} action={action} className={className}>
        {children}
      </PlField>
    );
  }
  return (
    <div className={clsx("flex min-w-0 flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-medium leading-[12px] text-[var(--pl-text)]">
          {label}
          {required && <span className="text-[var(--pl-error)]"> *</span>}
          {optional && <span className="ms-1 text-[10px] font-normal">{optional}</span>}
        </span>
        {action}
      </div>
      <div className="flex flex-col gap-2">
        {children}
        {error ? <PlFieldError>{error}</PlFieldError> : hint ? <p className={plText.hint}>{hint}</p> : null}
      </div>
    </div>
  );
}

/** Label + optional 12px note on the start side, the 32×18 `Switch` on the
 *  end (the frames' "Order Ahead" row). */
export function ToggleRow({
  label,
  note,
  checked,
  onChange,
  className,
}: {
  label: string;
  note?: ReactNode;
  checked: boolean;
  onChange: () => void;
  className?: string;
}) {
  return (
    <div className={clsx("flex items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 flex-col gap-2">
        <span className={plText.h6}>{label}</span>
        {note && <span className="text-[12px] font-medium leading-[1.2] text-[var(--pl-text-2)]">{note}</span>}
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

const CARD_BASE = "flex w-full items-center justify-between gap-3 rounded-[12px] border p-2 text-start transition-colors";
const CARD_ON = "border-[var(--pl-primary)] bg-[var(--pl-primary-soft)]";
const CARD_OFF = "border-[var(--pl-g300)] hover:bg-[var(--pl-g50)]";

function CardText({ title, note, on }: { title: ReactNode; note?: ReactNode; on: boolean }) {
  return (
    <span className="flex min-w-0 flex-col text-[14px] leading-[1.4]">
      <span className={clsx("font-medium", on ? "text-[var(--pl-primary-text)]" : "text-[var(--pl-text)]")}>{title}</span>
      {note && <span className="font-normal text-[var(--pl-text-2)]">{note}</span>}
    </span>
  );
}

/** The frames' 24px radio: blue ring + dot when on, slate ring when off. */
export function RadioMark({ on }: { on: boolean }) {
  return <PlIcon name={on ? "customize-radio-on" : "customize-radio-off"} className={on ? "text-[var(--pl-primary)]" : "text-[#64748B]"} />;
}

/** The frames' 24px checkbox: solid blue square when on, grey outline when off. */
export function CheckMark({ on }: { on: boolean }) {
  return <PlIcon name={on ? "customize-check-on" : "customize-check-off"} className={on ? "text-[var(--pl-primary)]" : "text-[var(--pl-g300)]"} />;
}

/** A bordered, selectable card with a trailing radio — one option among
 *  mutually exclusive choices ("Open Menu Page"). */
export function RadioCard({
  title,
  note,
  selected,
  onSelect,
  className,
}: {
  title: ReactNode;
  note?: ReactNode;
  selected: boolean;
  onSelect: () => void;
  className?: string;
}) {
  return (
    <button type="button" aria-pressed={selected} onClick={onSelect} className={clsx(CARD_BASE, FOCUS, selected ? CARD_ON : CARD_OFF, className)}>
      <CardText title={title} note={note} on={selected} />
      <RadioMark on={selected} />
    </button>
  );
}

/** Same bordered card as `RadioCard`, with a trailing checkbox — one of
 *  several independently toggleable choices ("Highlighted Dishes"). */
export function CheckCard({
  title,
  note,
  checked,
  onToggle,
  className,
}: {
  title: ReactNode;
  note?: ReactNode;
  checked: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button type="button" aria-pressed={checked} onClick={onToggle} className={clsx(CARD_BASE, FOCUS, checked ? CARD_ON : CARD_OFF, className)}>
      <CardText title={title} note={note} on={checked} />
      <CheckMark on={checked} />
    </button>
  );
}

/** The frames' inline radio pill ("Ordering ◉ | Reservation ○ | View ○"):
 *  a 40px bordered chip, label then a 24px radio. Lay several out with
 *  `<RadioPillGroup>`. */
export function RadioPill({
  label,
  selected,
  onSelect,
  className,
}: {
  label: ReactNode;
  selected: boolean;
  onSelect: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={clsx(
        "inline-flex shrink-0 items-center gap-3 rounded-[12px] border p-2 text-[14px] font-medium leading-[14px] transition-colors",
        FOCUS,
        selected ? clsx(CARD_ON, "text-[var(--pl-primary-text)]") : clsx(CARD_OFF, "text-[var(--pl-text-3)]"),
        className
      )}
    >
      {label}
      <RadioMark on={selected} />
    </button>
  );
}

/** The 8px-gapped row the pills sit in; wraps when the panel is narrow. */
export function RadioPillGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

/** The frames' "Background Type" switch: a 48px grey tray holding bordered
 *  4px-radius chips, the active one blue. Wraps when the panel is narrow. */
export function SegmentedChips<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: readonly { id: T; label: ReactNode }[];
  value: T;
  onChange: (id: T) => void;
  /** Accessible name of the group. */
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={clsx(
        "flex min-h-12 flex-wrap items-center justify-between gap-2 rounded-[12px] border border-[var(--pl-g200)] bg-[var(--pl-g50)] p-2",
        className
      )}
    >
      {options.map((option) => {
        const on = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(option.id)}
            className={clsx(
              "rounded-[4px] border p-2 text-[14px] font-medium leading-[14px] transition-colors",
              FOCUS,
              on
                ? "border-[var(--pl-primary)] bg-[var(--pl-primary-soft)] text-[var(--pl-primary)]"
                : "border-[var(--pl-g200)] bg-[var(--pl-surface)] text-[var(--pl-text-2)] hover:text-[var(--pl-text)]"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// ---- The sections column (shared by the sample and the connected lists) ----

/** "Homepage Sections" + the wide outlined "Add Section" button beside it. */
export function SectionsHeader({ title, addLabel, onAdd, disabled }: { title: ReactNode; addLabel: ReactNode; onAdd: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <p className={clsx(plText.h5, "shrink-0")}>{title}</p>
      <PlButton
        variant="outline"
        size="md"
        disabled={disabled}
        onClick={onAdd}
        className="min-w-0 flex-1 bg-[var(--pl-primary-soft)] !text-[18px] !leading-[18px]"
      >
        {addLabel}
      </PlButton>
    </div>
  );
}

/** `className` for the `ReorderList` of section rows: 41px rows (24px content,
 *  8px padding) separated by slate hairlines, closed by one under the last. */
export const SECTION_ROWS =
  "[&>li]:border-t [&>li]:border-[var(--pl-g300)] [&>li]:p-2 [&>li:last-child]:border-b";

/** The row's name: 14px medium, blue while its section is the selected one. */
export function sectionNameClass(selected: boolean) {
  return clsx("min-w-0 flex-1 truncate text-start text-[14px] font-medium leading-[16px]", selected ? "text-[var(--pl-primary)]" : "text-[var(--pl-text)]");
}

/** The 24px edit pencil that opens a row's section in the inspector; it sits
 *  24px before the row's switch. */
export function SectionEditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={clsx("me-4 grid h-6 w-6 shrink-0 place-items-center rounded text-[var(--pl-text)] transition-colors hover:text-[var(--pl-primary)]", FOCUS)}
    >
      <PlIcon name="customize-edit" />
    </button>
  );
}

/** One choice in the "Add Section" dialog. */
export function AddSectionOption({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "flex h-10 w-full items-center gap-2 rounded-[12px] border border-[var(--pl-g300)] px-3 text-start text-[14px] font-medium leading-[14px] text-[var(--pl-text)] transition-colors hover:border-[var(--pl-primary)] hover:bg-[var(--pl-primary-soft)] hover:text-[var(--pl-primary)] disabled:cursor-not-allowed disabled:opacity-50",
        FOCUS
      )}
    >
      {children}
    </button>
  );
}

/** The white "Selected Section" panel in the middle column. */
export function InspectorPanel({ title, children, className }: { title: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={clsx(plPanel, "flex min-w-0 flex-col gap-4 px-3 py-4", className)}>
      <p className={plText.h5}>{title}</p>
      {children}
    </div>
  );
}

// ---- Image picking ----------------------------------------------------------

/** What the builder's image pickers accept. */
export const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";
export const IMAGE_MAX_MB = 10;

/** Why a picked file is refused (a `pl.v.*` key and its variables), or null. */
export function imageFileFailure(file: File, types: string): { key: string; vars?: Record<string, string | number> } | null {
  if (!IMAGE_ACCEPT.split(",").includes(file.type)) return { key: "pl.v.fileType", vars: { types } };
  if (file.size > IMAGE_MAX_MB * 1024 * 1024) return { key: "pl.v.fileSize", vars: { max: IMAGE_MAX_MB } };
  return null;
}

/** The dashed 89px box a picked image sits in (or its empty state). */
export function ImageSlot({ src, empty, invalid }: { src?: string | null; empty?: ReactNode; invalid?: boolean }) {
  return (
    <div className={clsx("flex h-[89px] w-full flex-col justify-center rounded-[12px] border border-dashed p-2", invalid ? "border-[var(--pl-error)]" : "border-[var(--pl-g300)]")}>
      {src ? (
        <img src={src} alt="" className="min-h-0 w-full flex-1 rounded-[12px] object-cover shadow-[0_0_12px_rgba(0,0,0,0.12)]" />
      ) : (
        <span className="grid min-h-0 w-full flex-1 place-items-center rounded-[12px] bg-[var(--pl-g50)] text-[12px] leading-[1.4] text-[var(--pl-text-3)]">{empty}</span>
      )}
    </div>
  );
}

/** The frames' "1- Reservation Module" heading: a numbered 14px title with an
 *  optional 12px note underneath, ahead of a group of fields. */
export function NumberedHeading({ n, title, note, className }: { n: number; title: ReactNode; note?: ReactNode; className?: string }) {
  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      <p className="text-[14px] font-medium leading-[14px] text-[var(--pl-text)]">
        {n}- {title}
      </p>
      {note && <p className="text-[12px] font-normal leading-[1.2] text-[var(--pl-text-2)]">{note}</p>}
    </div>
  );
}

/** Every inspector's Content/Style/Advanced (or Module/Setting/Policies/
 *  Notifications) switch: 14px medium labels 32px apart over a hairline, the
 *  active one blue with a blue underline. */
export function InspectorTabs({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={clsx("flex items-end gap-x-8 overflow-x-auto overflow-y-hidden [scrollbar-width:none] border-b border-[var(--pl-g200)]", className)}>
      {items.map((item) => {
        const on = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(item.id)}
            className={clsx(
              "-mb-px shrink-0 whitespace-nowrap border-b-2 pb-[11px] pt-1 text-[14px] font-medium leading-[14px] transition-colors focus:outline-none focus-visible:text-[var(--pl-primary)]",
              on ? "border-[var(--pl-primary)] text-[var(--pl-primary)]" : "border-transparent text-[var(--pl-text-3)] hover:text-[var(--pl-text)]"
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
