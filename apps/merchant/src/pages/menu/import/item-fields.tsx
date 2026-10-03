// Editor parts both review screens use, drawn from the "Editing: …" panel of
// the import frames: the 14px labelled field with its error line, the image
// row, the price box, tag chips with an add list, the confidence bar and the
// tab strip.
//
// This is a lean editor on purpose rather than the builder's item tabs. A
// detection is not an Item yet (nullable price, confidence, dietary tags), and
// borrowing the builder's tabs would couple the import to fields it does not
// have.
import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { CheckCircle2, MoreVertical } from "lucide-react";
import {
  ALLERGENS,
  DIETARY,
  bandFor,
  openIssues,
  type Band,
  type DetectedItem,
} from "@/entities/menu/ai-import";
import { priceText, type ItemField, type ItemFieldError } from "@/entities/menu/ai-import-forms";
import { useFilePicker } from "@/shared/ui/use-file-picker";
import { useI18n } from "@/app/providers/i18n-provider";
import { CheckBox } from "../_shared/controls";
import { MenuIcon } from "../_shared/menu-icon";
import {
  FIELD_INVALID,
  FOCUS,
  LINE,
  SURFACE_SUBTLE,
  TEXT,
  TEXT_GRAY,
  TEXT_INPUT_CLASS,
} from "../_shared/theme";

/** Kept for the dialogs that still use the earlier input drawing. */
export const inputClass =
  "w-full rounded-[8px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2 text-[13.5px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-faint)] focus:border-[#3D1DF3] focus:outline-none focus:ring-2 focus:ring-[#3D1DF3]/20";

/** The panel's 12px medium description box. */
export const PANEL_TEXTAREA = `w-full resize-none rounded-[12px] border ${LINE} bg-[var(--octo-card)] px-3 py-2 text-[12px] font-medium leading-[1.4] ${TEXT} placeholder:text-[#687280] ${FOCUS}`;

/** What to say under a field for each validation code. */
const ERROR_KEY: Record<ItemField, Partial<Record<ItemFieldError, string>>> = {
  image: { required: "menuAi.error.imageRequired" },
  name: { required: "menuAi.editor.nameRequired" },
  price: {
    required: "menuAi.error.priceRequired",
    "not-a-number": "menuAi.error.priceNumber",
    "not-positive": "menuAi.error.pricePositive",
  },
  description: { required: "menuAi.error.descriptionRequired" },
  section: { required: "menuAi.error.sectionRequired" },
};

export function itemErrorText(t: (key: string) => string, field: ItemField, code: ItemFieldError | null): string | null {
  const key = code ? ERROR_KEY[field][code] : undefined;
  return key ? t(key) : null;
}

/** The panel's field: a 14px medium label (the shared Field's is 16px), the
 *  control, and the error line once the field was touched or a save tried. */
export function PanelField({
  label,
  required,
  hint,
  error,
  htmlFor,
  inset = true,
  children,
}: {
  label: string;
  required?: boolean;
  /** The small aside after a label: "(SAR)". */
  hint?: string;
  error?: string | null;
  htmlFor?: string;
  /** The frames indent text-field labels by 8px and leave the others flush. */
  inset?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={htmlFor} className={clsx("text-[14px] font-medium leading-[14px]", inset && "px-2", TEXT)}>
        {label}
        {hint && <span className="ms-1 text-[12px] font-normal leading-3">{hint}</span>}
        {required && <span className="text-[#d30202]"> *</span>}
      </label>
      {children}
      {error && (
        <span role="alert" className={clsx("-mt-1 text-[12px] leading-[14px] text-[#d30202]", inset && "px-2")}>
          {error}
        </span>
      )}
    </div>
  );
}

/** A price box that keeps exactly what was typed, so "abc" can be reported as
 *  not a number rather than silently dropped. Re-syncs when the stored price
 *  changes underneath it (bulk edit) while it is not being typed in. */
export function PanelPriceInput({
  id,
  value,
  onText,
  onBlur,
  invalid,
}: {
  id?: string;
  value: number | null;
  onText: (text: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
}) {
  const [text, setText] = useState(priceText(value));
  const focused = useRef(false);
  const last = useRef(value);
  useEffect(() => {
    if (focused.current || last.current === value) return;
    last.current = value;
    setText(priceText(value));
  }, [value]);
  return (
    <input
      id={id}
      inputMode="decimal"
      value={text}
      aria-invalid={invalid || undefined}
      onFocus={() => (focused.current = true)}
      onBlur={() => {
        focused.current = false;
        last.current = value;
        onBlur?.();
      }}
      onChange={(event) => {
        setText(event.target.value);
        onText(event.target.value);
      }}
      className={clsx(TEXT_INPUT_CLASS, "tabular-nums", invalid && FIELD_INVALID)}
    />
  );
}

/** "Section Image *": the dashed 82px thumbnail, Change Image, the red bin and
 *  the recommended size. */
export function ImageField({
  image,
  alt,
  error,
  onPick,
  onRemove,
  onTouched,
}: {
  image: string | null;
  alt: string;
  error?: string | null;
  onPick: (url: string) => void;
  onRemove: () => void;
  onTouched?: () => void;
}) {
  const { t } = useI18n();
  const picker = useFilePicker(onPick);
  const pickError = picker.error ? t(`menuAi.imageError.${picker.error}`) : null;
  return (
    <PanelField label={t("menuAi.editor.sectionImage")} inset={false} error={pickError ?? error}>
      {picker.input}
      <div className="flex items-stretch gap-3">
        <div
          className={clsx(
            "flex min-h-[57px] w-[82px] shrink-0 flex-col justify-center rounded-[12px] border border-dashed p-1",
            LINE,
            error && "!border-[#d30202]"
          )}
        >
          {image ? (
            <img src={image} alt={alt} className="min-h-0 w-full flex-1 rounded-[8px] object-cover" />
          ) : (
            <span className={clsx("grid flex-1 place-items-center rounded-[8px]", SURFACE_SUBTLE, TEXT_GRAY)} aria-hidden>
              <MenuIcon name="menu-upload.svg" size={20} />
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => {
                onTouched?.();
                picker.open();
              }}
              className="h-9 min-w-0 flex-1 rounded-[8px] border border-[#0D6EFD] px-3 text-[12px] font-bold leading-3 text-[#0D6EFD] hover:bg-[#f5f9ff] [[data-theme=dark]_&]:hover:bg-[#0d6efd]/15"
            >
              {image ? t("menuAi.editor.changeImage") : t("menuAi.editor.addImage")}
            </button>
            <button
              type="button"
              aria-label={t("menuAi.editor.removeImage")}
              disabled={!image}
              onClick={() => {
                onTouched?.();
                onRemove();
              }}
              className="grid size-9 shrink-0 place-items-center rounded-[8px] bg-[#fef0f0] text-[#d30202] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 [[data-theme=dark]_&]:bg-[#d30202]/15"
            >
              <MenuIcon name="menu-trash.svg" size={24} />
            </button>
          </div>
          <p className={clsx("text-[12px] leading-[1.4]", TEXT_GRAY)}>{t("menuAi.editor.imageHint")}</p>
        </div>
      </div>
    </PanelField>
  );
}

/** Keeps what the merchant typed ("72.00", "7.") while they type, and only
 *  hands a number — or `null` for empty — upward. The earlier price box; the
 *  panels now use PanelPriceInput. */
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

/** Pale-blue chips for what is set, plus an outlined "+ Add Tag" that lists
 *  what is not. A chip is removed by pressing it. */
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
    <div ref={ref} className="relative flex flex-wrap items-start gap-2">
      {values.map((v) => (
        <button
          key={v}
          type="button"
          title={`${t("menuAi.removeTag")} ${t(`menuAi.${kind}.${v}`)}`}
          aria-label={`${t("menuAi.removeTag")} ${t(`menuAi.${kind}.${v}`)}`}
          onClick={() => onChange(values.filter((x) => x !== v))}
          className="inline-flex items-center rounded-full bg-[#f5f9ff] px-2 py-1 text-[12px] font-medium leading-3 text-[#0058da] hover:line-through [[data-theme=dark]_&]:bg-[#0d6efd]/15 [[data-theme=dark]_&]:text-[#8ab8ff]"
        >
          {t(`menuAi.${kind}.${v}`)}
        </button>
      ))}
      {options.length > 0 && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={clsx(
            "inline-flex items-center gap-1 rounded-full border px-[9px] py-[5px] text-[12px] font-medium leading-3 hover:bg-[var(--octo-hover)]",
            LINE,
            TEXT
          )}
        >
          <MenuIcon name="menu-plus-thin.svg" size={16} />
          {t("menuAi.editor.addTag")}
        </button>
      )}
      {open && (
        <ul className="absolute start-0 top-full z-20 mt-1 max-h-[220px] w-[200px] overflow-y-auto rounded-[12px] bg-[var(--octo-card)] p-1 shadow-[0px_0px_12px_0px_rgba(0,0,0,0.12)] octo-scroll">
          {options.map((o) => (
            <li key={o}>
              <button
                type="button"
                onClick={() => {
                  onChange([...values, o]);
                  setOpen(false);
                }}
                className={clsx("block w-full rounded-[8px] px-2 py-1.5 text-start text-[14px] hover:bg-[var(--octo-hover)]", TEXT)}
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

const BAND_BAR: Record<Band, string> = { high: "bg-[#009a39]", medium: "bg-[#de9000]", low: "bg-[#d30202]" };

/** "AI Confidence Score": a 6px bar in the band's colour and the percentage. */
export function ConfidenceMeter({ value }: { value: number; variant?: "review" | "edit" }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-3">
      <p className={clsx("text-[16px] font-medium leading-4", TEXT)}>{t("menuAi.editor.aiConfidence")}</p>
      <div className="flex items-center gap-2">
        <div className={clsx("h-[6px] min-w-0 flex-1 overflow-hidden rounded-full", SURFACE_SUBTLE)}>
          <div className={clsx("h-full rounded-full", BAND_BAR[bandFor(value)])} style={{ width: `${value}%` }} />
        </div>
        <span className={clsx("text-[16px] font-medium leading-4 tabular-nums", TEXT)}>{value}%</span>
      </div>
    </div>
  );
}

/** The reader's notes on one item. Not in the frames, so no screen renders it
 *  today; kept for when the notes come back. */
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

/** Details / Modifiers / Allergens / Nutrition: 14px medium labels spread
 *  across the panel, a grey rule under them and a blue one under the active. */
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
    <div role="tablist" className={clsx("flex items-center justify-between gap-2 overflow-x-auto border-b octo-scroll", LINE)}>
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={active === tab}
          onClick={() => onChange(tab)}
          className={clsx(
            "-mb-px shrink-0 border-b pb-[11px] pt-1 text-center text-[14px] font-medium leading-[14px] transition-colors",
            active === tab ? "border-[#0D6EFD] text-[#0D6EFD]" : clsx("border-transparent hover:text-[#0D6EFD]", TEXT_GRAY)
          )}
        >
          {t(`menuAi.tab.${tab}`)}
        </button>
      ))}
    </div>
  );
}

export function AllergensTab({ item, onChange }: { item: Pick<DetectedItem, "allergens">; onChange: (allergens: string[]) => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-3">
      <p className={clsx("text-[12px] leading-[1.4]", TEXT_GRAY)}>{t("menuAi.editor.allergensHint")}</p>
      <div className="grid grid-cols-2 gap-2">
        {ALLERGENS.map((a) => (
          <CheckBox
            key={a}
            checked={item.allergens.includes(a)}
            onChange={() => onChange(item.allergens.includes(a) ? item.allergens.filter((x) => x !== a) : [...item.allergens, a])}
            label={t(`menuAi.allergen.${a}`)}
          />
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
    <div className={clsx("rounded-[12px] border border-dashed px-4 py-6 text-center", LINE)}>
      <p className={clsx("text-[14px] font-medium leading-[1.4]", TEXT)}>{title}</p>
      <p className={clsx("mx-auto mt-1 max-w-[280px] text-[12px] leading-[1.4]", TEXT_GRAY)}>{body}</p>
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

/** The earlier inline kebab. The frames' section rows use the shared
 *  PopoverMenu now; kept for the row actions that are hidden, not removed. */
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

/** The old field label, still used by nothing in the frames. */
export function FieldLabel({ children, required, htmlFor }: { children: ReactNode; required?: boolean; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[12.5px] font-medium text-[var(--octo-text-primary)]">
      {children}
      {required && " *"}
    </label>
  );
}
