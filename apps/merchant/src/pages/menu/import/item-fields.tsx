// Editor parts both review screens use: tag chips with an add list, the price
// field, the confidence meter, the "why review" notes, the tab strip, and a
// small kebab menu.
//
// This is a lean editor on purpose rather than the builder's item tabs. A
// detection is not an Item yet (nullable price, confidence, dietary tags), and
// the builder's tabs are being reworked by someone else right now — borrowing
// them would couple the import to a moving target for fields it does not have.
import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { CheckCircle2, MoreVertical, Plus, X } from "lucide-react";
import { Checkbox } from "@ui/primitives";
import {
  ALLERGENS,
  DIETARY,
  bandFor,
  openIssues,
  type DetectedItem,
} from "@/entities/menu/ai-import";
import { useI18n } from "@/app/providers/i18n-provider";
import { AI, BAND_TONE } from "./ai-style";

export const inputClass =
  "w-full rounded-[8px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2 text-[13.5px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-faint)] focus:border-[#3D1DF3] focus:outline-none focus:ring-2 focus:ring-[#3D1DF3]/20";

export function FieldLabel({ children, required, htmlFor }: { children: ReactNode; required?: boolean; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[12.5px] font-medium text-[var(--octo-text-primary)]">
      {children}
      {required && " *"}
    </label>
  );
}

/** Keeps what the merchant typed ("72.00", "7.") while they type, and only
 *  hands a number — or `null` for empty — upward. Re-syncs when the item
 *  changes underneath it (prev/next, bulk edit). */
export function PriceInput({
  id,
  value,
  onChange,
  className,
  ariaLabel,
}: {
  id?: string;
  value: number | null;
  onChange: (next: number | null) => void;
  className?: string;
  ariaLabel?: string;
}) {
  const format = (v: number | null) => (v === null ? "" : String(v));
  const [text, setText] = useState(format(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(format(value));
  }, [value]);
  return (
    <input
      id={id}
      inputMode="decimal"
      aria-label={ariaLabel}
      value={text}
      placeholder="—"
      onFocus={() => (focused.current = true)}
      onBlur={() => {
        focused.current = false;
        setText(format(value));
      }}
      onChange={(e) => {
        const next = e.target.value.replace(/[^\d.]/g, "");
        setText(next);
        if (next === "") onChange(null);
        else if (!Number.isNaN(Number(next))) onChange(Number(next));
      }}
      className={clsx(inputClass, "tabular-nums", className)}
    />
  );
}

/** Chips for what is set, plus an "+ Add" that lists what is not. */
export function TagEditor({
  kind,
  values,
  onChange,
}: {
  kind: "allergen" | "dietary";
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const options = (kind === "allergen" ? ALLERGENS : DIETARY).filter((o) => !values.includes(o));
  useDismiss(ref, open, () => setOpen(false));

  return (
    <div ref={ref} className="relative flex flex-wrap items-center gap-2">
      {values.map((v) => (
        <span key={v} className={clsx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-medium", "bg-[var(--octo-tone-info-bg)] text-[var(--octo-tone-info-text)]")}>
          {t(`menuAi.${kind}.${v}`)}
          <button
            type="button"
            aria-label={`${t("menuAi.removeTag")} ${t(`menuAi.${kind}.${v}`)}`}
            onClick={() => onChange(values.filter((x) => x !== v))}
            className="rounded-full hover:opacity-70"
          >
            <X size={13} aria-hidden />
          </button>
        </span>
      ))}
      {options.length > 0 && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12.5px] font-semibold hover:bg-[var(--octo-hover)]", AI.text)}
        >
          <Plus size={14} aria-hidden />
          {t("menuAi.add")}
        </button>
      )}
      {values.length === 0 && options.length > 0 && !open && (
        <span className="text-[12px] text-[var(--octo-text-muted)]">{t(`menuAi.${kind}.none`)}</span>
      )}
      {open && (
        <ul className="absolute start-0 top-full z-20 mt-1 max-h-[220px] w-[200px] overflow-y-auto rounded-[10px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-1 shadow-lg octo-scroll">
          {options.map((o) => (
            <li key={o}>
              <button
                type="button"
                onClick={() => {
                  onChange([...values, o]);
                  setOpen(false);
                }}
                className="block w-full rounded-[7px] px-2.5 py-1.5 text-start text-[13px] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
              >
                {t(`menuAi.${kind}.${o}`)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ConfidenceMeter({ value, variant }: { value: number; variant: "review" | "edit" }) {
  const { t } = useI18n();
  const band = bandFor(value);
  const tone = BAND_TONE[band];
  const bar = (
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--octo-track)]">
      <div className={clsx("h-full rounded-full", tone.bar)} style={{ width: `${value}%` }} />
    </div>
  );
  if (variant === "edit") {
    return (
      <div>
        <p className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">{t("menuAi.editor.confidence")}</p>
        <p className={clsx("mt-1 text-[13px] font-medium", tone.ink)}>
          {value}% ({t(`menuAi.bandLong.${band}`)})
        </p>
        <div className="mt-1.5 flex">{bar}</div>
      </div>
    );
  }
  return (
    <div>
      <p className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">{t("menuAi.editor.aiConfidence")}</p>
      <div className="mt-2 flex items-center gap-3">
        {bar}
        <span className="text-[14px] font-semibold tabular-nums text-[var(--octo-text-primary)]">{value}%</span>
      </div>
      <p className={clsx("mt-1 text-[12.5px] font-medium", tone.ink)}>{t(`menuAi.bandLong.${band}`)}</p>
    </div>
  );
}

/** The reader's notes on one item, in the two shapes the frames draw. */
export function IssueNotes({ item, variant }: { item: DetectedItem; variant: "review" | "edit" }) {
  const { t } = useI18n();
  const issues = openIssues(item);
  const flagged = issues.length > 0 || (item.confidence < 90 && !item.reviewed);
  const clean = (
    <p className="inline-flex items-center gap-1.5 text-[13px] text-[var(--octo-tone-success-text)]">
      <CheckCircle2 size={15} aria-hidden />
      {item.reviewed && item.confidence < 90 ? t("menuAi.notes.confirmed") : t("menuAi.notes.clean")}
    </p>
  );
  const list = (
    <ul className="mt-1 list-disc space-y-0.5 ps-5 text-[13px] text-[var(--octo-text-primary)]">
      {issues.map((k) => (
        <li key={k}>{t(`menuAi.issueHelp.${k}`)}</li>
      ))}
      {issues.length === 0 && <li>{t("menuAi.issueHelp.lowConfidence")}</li>}
    </ul>
  );

  if (variant === "review") {
    return (
      <div className="rounded-[10px] border border-[var(--octo-tone-warning-border)] bg-[var(--octo-warning-bg)] px-4 py-3">
        <p className="text-[12.5px] font-medium text-[var(--octo-tone-warning-text)]">{t("menuAi.notes.whyTitle")}</p>
        <div className="mt-1.5">{flagged ? list : clean}</div>
      </div>
    );
  }
  return (
    <div
      className={clsx(
        "rounded-[10px] border px-4 py-3",
        flagged
          ? "border-[var(--octo-tone-warning-border)] bg-[var(--octo-warning-bg)]"
          : "border-[var(--octo-tone-success-border)] bg-[var(--octo-tone-success-bg)]"
      )}
    >
      <p className={clsx("text-[12px] font-semibold", flagged ? "text-[var(--octo-tone-warning-text)]" : "text-[var(--octo-tone-success-text)]")}>
        {t("menuAi.notes.aiNotes")}
      </p>
      <div className="mt-1">{flagged ? list : <p className="text-[13px] text-[var(--octo-tone-success-text)]">{t("menuAi.notes.extractedClean")}</p>}</div>
    </div>
  );
}

export function EditorTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly T[];
  active: T;
  onChange: (tab: T) => void;
}) {
  const { t } = useI18n();
  return (
    <div role="tablist" className="flex overflow-x-auto border-b border-[var(--octo-border-card)] octo-scroll">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={active === tab}
          onClick={() => onChange(tab)}
          className={clsx(
            "-mb-px shrink-0 border-b-2 px-2.5 py-2.5 text-[13px] font-medium transition-colors",
            active === tab
              ? clsx(AI.border, AI.text)
              : "border-transparent text-[var(--octo-text-secondary)] hover:text-[var(--octo-text-primary)]"
          )}
        >
          {t(`menuAi.tab.${tab}`)}
        </button>
      ))}
    </div>
  );
}

export function AllergensTab({ item, onChange }: { item: DetectedItem; onChange: (allergens: string[]) => void }) {
  const { t } = useI18n();
  return (
    <div>
      <p className="text-[12.5px] text-[var(--octo-text-secondary)]">{t("menuAi.editor.allergensHint")}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {ALLERGENS.map((a) => (
          <label key={a} className="flex items-center gap-2 rounded-[8px] border border-[var(--octo-border-card)] px-3 py-2 text-[13px] text-[var(--octo-text-primary)]">
            <Checkbox
              checked={item.allergens.includes(a)}
              onChange={() =>
                onChange(item.allergens.includes(a) ? item.allergens.filter((x) => x !== a) : [...item.allergens, a])
              }
            />
            {t(`menuAi.allergen.${a}`)}
          </label>
        ))}
      </div>
    </div>
  );
}

/** Modifiers and nutrition are never on a printed menu in a form the reader can
 *  map, so the import says where they are set instead of showing empty inputs
 *  that would be thrown away. */
export function LaterTab({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[10px] border border-dashed border-[var(--octo-border-card)] bg-[var(--octo-soft-bg)] px-4 py-6 text-center">
      <p className="text-[13.5px] font-medium text-[var(--octo-text-primary)]">{title}</p>
      <p className="mx-auto mt-1 max-w-[280px] text-[12.5px] text-[var(--octo-text-secondary)]">{body}</p>
    </div>
  );
}

/** Closes a popover on outside press or Escape. */
export function useDismiss(ref: React.RefObject<HTMLElement>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, open, close]);
}

export interface KebabAction {
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export function KebabMenu({ label, actions }: { label: string; actions: KebabAction[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="rounded-[6px] p-1.5 text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
      >
        <MoreVertical size={16} aria-hidden />
      </button>
      {open && (
        <ul role="menu" className="absolute end-0 top-full z-30 mt-1 w-[180px] rounded-[10px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-1 shadow-lg">
          {actions.map((a) => (
            <li key={a.label} role="none">
              <button
                type="button"
                role="menuitem"
                disabled={a.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  a.onSelect();
                }}
                className={clsx(
                  "block w-full rounded-[7px] px-2.5 py-1.5 text-start text-[13px] hover:bg-[var(--octo-hover)] disabled:cursor-not-allowed disabled:opacity-40",
                  a.danger ? "text-[var(--octo-tone-danger-text)]" : "text-[var(--octo-text-primary)]"
                )}
              >
                {a.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
