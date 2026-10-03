// The dialogs behind the review screens' secondary actions. "Bulk Edit Prices"
// and "Find & Replace" are drawn from their own frames: a 738px white card,
// 24px padding, a 24px semibold title, the module's 40px fields and one
// full-width primary at the foot.
//
// Each one computes its effect with a pure transform from entities/menu and
// hands the result back; none of them touches the session store directly, so
// the screen that opened a dialog stays the one place that decides what
// changes. Their primaries stay enabled: pressing one with a field missing
// reveals the errors instead of saving.
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import clsx from "clsx";
import { AlertTriangle, CheckCircle2, LayoutGrid, ListChecks, ShieldCheck } from "lucide-react";
import { Modal } from "@ui/primitives";
import { ISSUE_KINDS, summarize, type DetectionResult, type IssueKind } from "@/entities/menu/ai-import";
import {
  applyBulkPrices,
  findMatches,
  hasErrors,
  parseSigned,
  replaceInItems,
  splitHighlights,
  validateBulkPrices,
  validateFind,
  type BulkError,
  type FindMatch,
  type FindScope,
} from "@/entities/menu/ai-import-forms";
import { useI18n } from "@/app/providers/i18n-provider";
import { CheckBox, Field, SelectBox } from "../_shared/controls";
import { MenuIcon } from "../_shared/menu-icon";
import {
  FIELD_BORDER,
  FIELD_INVALID,
  FOCUS_WITHIN,
  LINE,
  MODAL_SUBMIT,
  SURFACE_SUBTLE,
  TEXT,
  TEXT_GRAY,
  TEXT_INPUT_CLASS,
  TEXT_SECONDARY,
} from "../_shared/theme";
import { AI, fill, outlineButton } from "./ai-style";
import { ConfidencePill, StatIcon } from "./chrome";
import { useDismiss } from "./item-fields";

/** The frames' dialog card. */
function FrameModal({
  open,
  title,
  onClose,
  onSubmit,
  gap,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  gap: "gap-4" | "gap-6";
  children: ReactNode;
}) {
  return (
    <Modal open={open} onClose={onClose} className="max-h-[calc(100vh-32px)] max-w-[738px] overflow-y-auto !rounded-[12px] !p-6 octo-scroll">
      <form
        noValidate
        aria-label={title}
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          onSubmit();
        }}
        className={clsx("flex flex-col", gap)}
      >
        <h2 className="text-[24px] font-semibold leading-6 text-[#0e0e0e] [[data-theme=dark]_&]:text-[var(--octo-text-primary)]">{title}</h2>
        {children}
      </form>
    </Modal>
  );
}

function PrimaryButton({ onClick, disabled, children, danger }: { onClick: () => void; disabled?: boolean; children: string; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "inline-flex h-10 items-center rounded-[8px] px-4 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        danger ? "bg-[var(--octo-tone-danger-dot)] text-white hover:opacity-90" : AI.solid
      )}
    >
      {children}
    </button>
  );
}

function CancelButton({ onClick }: { onClick: () => void }) {
  const { t } = useI18n();
  return (
    <button type="button" onClick={onClick} className={clsx(outlineButton, "h-10")}>
      {t("menuAi.cancel")}
    </button>
  );
}

export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <CancelButton onClick={onClose} />
          <PrimaryButton danger onClick={onConfirm}>{confirmLabel}</PrimaryButton>
        </>
      }
    >
      <p className="text-[13.5px] text-[var(--octo-text-secondary)]">{body}</p>
    </Modal>
  );
}

/** Add and rename share one dialog: both are "type a section name". */
export function SectionNameModal({
  open,
  initial,
  title,
  onSubmit,
  onClose,
}: {
  open: boolean;
  initial: string;
  title: string;
  onSubmit: (name: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(initial);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (open) {
      setName(initial);
      setRevealed(false);
    }
  }, [open, initial]);
  const trimmed = name.trim();
  const error = revealed && !trimmed ? t("menuAi.error.sectionRequired") : null;
  return (
    <FrameModal
      open={open}
      title={title}
      onClose={onClose}
      gap="gap-6"
      onSubmit={() => {
        if (trimmed) onSubmit(trimmed);
        else setRevealed(true);
      }}
    >
      <Field label={t("menuAi.sectionName")} required error={error}>
        <input
          autoFocus
          value={name}
          maxLength={60}
          aria-label={t("menuAi.sectionName")}
          aria-invalid={!!error || undefined}
          onBlur={() => setRevealed(true)}
          onChange={(e) => setName(e.target.value)}
          className={clsx(TEXT_INPUT_CLASS, error && FIELD_INVALID)}
        />
      </Field>
      <button type="submit" className={MODAL_SUBMIT}>
        {t("menuAi.save")}
      </button>
    </FrameModal>
  );
}

/* ---------------------------------------------------------- bulk edit prices */

const BULK_ERROR_KEY: Record<BulkError, string> = {
  required: "menuAi.bulk.error.items",
  "not-a-number": "menuAi.bulk.error.number",
  "one-required": "menuAi.bulk.error.oneRequired",
  "non-positive-result": "menuAi.bulk.error.nonPositive",
};

/** The "Items *" dropdown: a 40px select-like trigger that opens a checklist
 *  of every item, grouped by section, with the open section first. */
function ItemsSelect({
  result,
  firstSectionId,
  selected,
  invalid,
  onChange,
  onClosed,
}: {
  result: DetectionResult;
  firstSectionId: string | null;
  selected: ReadonlySet<string>;
  invalid: boolean;
  onChange: (next: Set<string>) => void;
  /** Fires when the list closes — the field's "blur". */
  onClosed: () => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = () => {
    setOpen(false);
    onClosed();
  };
  useDismiss(ref, open, close);

  const sections = useMemo(
    () => [...result.sections].sort((a, b) => Number(b.id === firstSectionId) - Number(a.id === firstSectionId)),
    [result.sections, firstSectionId]
  );
  const allIds = sections.flatMap((s) => s.items.map((i) => i.id));
  const allOn = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const toggle = (ids: string[], on: boolean) => {
    const next = new Set(selected);
    ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
    onChange(next);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-bulk-items
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        aria-label={t("menuAi.bulk.items")}
        onClick={() => (open ? close() : setOpen(true))}
        className={clsx(
          `flex h-10 w-full items-center justify-between gap-2 rounded-[12px] ${FIELD_BORDER} bg-[var(--octo-card)] p-2 text-start text-[14px] leading-[14px]`,
          "transition-colors focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/25",
          selected.size === 0 ? TEXT_SECONDARY : TEXT,
          invalid && FIELD_INVALID
        )}
      >
        <span className="truncate">
          {selected.size === 0 ? t("menuAi.bulk.selectItems") : fill(t("menuAi.bulk.selectedN"), { n: selected.size })}
        </span>
        <MenuIcon name="menu-arrow-down.svg" size={24} className={clsx(TEXT_GRAY, open && "rotate-180")} />
      </button>
      {open && (
        <div
          role="listbox"
          aria-multiselectable
          className="absolute inset-x-0 top-full z-20 mt-1 flex max-h-[260px] flex-col gap-2 overflow-y-auto rounded-[12px] bg-[var(--octo-card)] p-3 shadow-[0px_0px_12px_0px_rgba(0,0,0,0.12)] octo-scroll"
        >
          <CheckBox checked={allOn} onChange={(on) => toggle(allIds, on)} label={<span className="font-bold">{t("menuAi.bulk.selectAll")}</span>} />
          {sections.map((section) => {
            const ids = section.items.map((i) => i.id);
            if (ids.length === 0) return null;
            return (
              <div key={section.id} className={clsx("flex flex-col gap-2 border-t pt-2", LINE)}>
                <CheckBox
                  checked={ids.every((id) => selected.has(id))}
                  onChange={(on) => toggle(ids, on)}
                  label={
                    <span className="font-bold">
                      {section.name} <span className={clsx("font-normal", TEXT_GRAY)}>({ids.length})</span>
                    </span>
                  }
                />
                {section.items.map((item) => (
                  <CheckBox
                    key={item.id}
                    className="ps-6"
                    checked={selected.has(item.id)}
                    onChange={(on) => toggle([item.id], on)}
                    label={
                      <span className="flex items-center gap-2">
                        {item.name}
                        <span className={clsx("font-normal tabular-nums", TEXT_GRAY)}>
                          {item.price === null ? t("menuAi.paper.priceUnclear") : `${t("menuAi.bulk.currency")} ${item.price}`}
                        </span>
                      </span>
                    }
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type BulkField = "items" | "percent" | "fixed";

export function BulkPriceModal({
  open,
  result,
  sectionId,
  onApply,
  onClose,
}: {
  open: boolean;
  result: DetectionResult;
  /** The section the table shows; its items lead the list. */
  sectionId: string | null;
  onApply: (next: DetectionResult, count: number) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [percentText, setPercentText] = useState("");
  const [fixedText, setFixedText] = useState("");
  const [touched, setTouched] = useState<ReadonlySet<BulkField>>(new Set());
  const [attempted, setAttempted] = useState(false);
  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setPercentText("");
    setFixedText("");
    setTouched(new Set());
    setAttempted(false);
  }, [open]);

  const itemIds = [...selected];
  const errors = validateBulkPrices(result, { itemIds, percentText, fixedText });
  const touch = (field: BulkField) => setTouched((prev) => (prev.has(field) ? prev : new Set(prev).add(field)));
  function shown(field: BulkField): string | null {
    const code = errors[field];
    if (!code) return null;
    // "Enter a percentage or a fixed amount" is about the pair, so it waits
    // for a save attempt (or for both to have been left empty) rather than
    // appearing the moment the first of the two loses focus.
    if (code === "one-required") return attempted || (touched.has("percent") && touched.has("fixed")) ? t(BULK_ERROR_KEY[code]) : null;
    return attempted || touched.has(field) ? t(BULK_ERROR_KEY[code]) : null;
  }

  function submit() {
    if (hasErrors({ ...errors })) {
      setAttempted(true);
      return;
    }
    onApply(applyBulkPrices(result, itemIds, { percent: parseSigned(percentText) ?? 0, fixed: parseSigned(fixedText) ?? 0 }), itemIds.length);
  }

  return (
    <FrameModal open={open} title={t("menuAi.bulk.titleNone")} onClose={onClose} onSubmit={submit} gap="gap-6">
      <Field label={t("menuAi.bulk.items")} required error={shown("items")}>
        <ItemsSelect
          result={result}
          firstSectionId={sectionId}
          selected={selected}
          invalid={!!shown("items")}
          onChange={setSelected}
          onClosed={() => touch("items")}
        />
      </Field>
      <Field label={t("menuAi.bulk.percentAdjust")} hint={t("menuAi.bulk.percentHint")} error={shown("percent")}>
        <input
          inputMode="decimal"
          value={percentText}
          placeholder={t("menuAi.bulk.percentPlaceholder")}
          aria-label={t("menuAi.bulk.percentAdjust")}
          aria-invalid={!!shown("percent") || undefined}
          onBlur={() => touch("percent")}
          onChange={(e) => setPercentText(e.target.value)}
          className={clsx(TEXT_INPUT_CLASS, shown("percent") && FIELD_INVALID)}
        />
      </Field>
      <Field label={t("menuAi.bulk.fixedAmount")} error={shown("fixed")}>
        <div
          className={clsx(
            `flex h-10 w-full items-center gap-3 rounded-[12px] ${FIELD_BORDER} bg-[var(--octo-card)] px-2 text-[14px] leading-[14px] ${FOCUS_WITHIN}`,
            shown("fixed") && FIELD_INVALID
          )}
        >
          <span className={TEXT}>{t("menuAi.bulk.currency")}</span>
          <input
            inputMode="decimal"
            value={fixedText}
            placeholder={t("menuAi.bulk.fixedPlaceholder")}
            aria-label={t("menuAi.bulk.fixedAmount")}
            aria-invalid={!!shown("fixed") || undefined}
            onBlur={() => touch("fixed")}
            onChange={(e) => setFixedText(e.target.value)}
            className={clsx("h-full min-w-0 flex-1 bg-transparent placeholder:text-[#687280] focus:outline-none", TEXT)}
          />
        </div>
      </Field>
      <button type="submit" data-bulk-save className={MODAL_SUBMIT}>
        {t("menuAi.bulk.save")}
      </button>
    </FrameModal>
  );
}

/* ------------------------------------------------------------ find & replace */

function Highlighted({ text, find, matchCase, on }: { text: string; find: string; matchCase: boolean; on: boolean }) {
  if (!on) return <>{text}</>;
  return (
    <>
      {splitHighlights(text, find, matchCase).map((part, i) =>
        part.match ? (
          <mark key={i} className="bg-[rgba(249,241,12,0.15)] text-[#f59e0b]">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  );
}

interface Search {
  find: string;
  scope: FindScope;
  matchCase: boolean;
  matches: FindMatch[];
}

export function FindReplaceModal({
  open,
  result,
  onApply,
  onClose,
}: {
  open: boolean;
  result: DetectionResult;
  onApply: (next: DetectionResult, count: number) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  // "" is the placeholder; an unset scope searches names and descriptions.
  const [scope, setScope] = useState<FindScope | "">("");
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [findTouched, setFindTouched] = useState(false);
  const [attempted, setAttempted] = useState(false);
  // What the list below shows. Cleared whenever the question changes, so the
  // list can never describe a search other than the one in the boxes.
  const [search, setSearch] = useState<Search | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [noneSelected, setNoneSelected] = useState(false);
  useEffect(() => {
    if (!open) return;
    setScope("");
    setFind("");
    setReplace("");
    setMatchCase(false);
    setFindTouched(false);
    setAttempted(false);
    setSearch(null);
    setSelected(new Set());
    setNoneSelected(false);
  }, [open]);

  const findError = (attempted || findTouched) && validateFind(find) ? t("menuAi.find.error.required") : null;
  const replacing = search !== null && search.matches.length > 0;

  function reset() {
    setSearch(null);
    setNoneSelected(false);
  }

  function submit() {
    if (!replacing) {
      if (validateFind(find)) {
        setAttempted(true);
        return;
      }
      const options = { scope: scope || "all", matchCase } as const;
      const matches = findMatches(result, find, options);
      setSearch({ find, ...options, matches });
      setSelected(new Set(matches.map((m) => m.item.id)));
      return;
    }
    if (selected.size === 0) {
      setNoneSelected(true);
      return;
    }
    const outcome = replaceInItems(result, [...selected], search.find, replace, search);
    onApply(outcome.result, outcome.count);
  }

  return (
    <FrameModal open={open} title={t("menuAi.find.title")} onClose={onClose} onSubmit={submit} gap="gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-4">
          <Field label={t("menuAi.find.scope")}>
            <SelectBox
              value={scope}
              ariaLabel={t("menuAi.find.scope")}
              placeholderShown={scope === ""}
              onChange={(value) => {
                setScope(value as FindScope | "");
                reset();
              }}
            >
              <option value="">{t("menuAi.find.scopePlaceholder")}</option>
              <option value="names">{t("menuAi.find.scope.names")}</option>
              <option value="descriptions">{t("menuAi.find.scope.descriptions")}</option>
              <option value="all">{t("menuAi.find.scope.all")}</option>
            </SelectBox>
          </Field>
          <Field label={t("menuAi.find.find")} error={findError}>
            <input
              autoFocus
              value={find}
              placeholder={t("menuAi.find.findPlaceholder")}
              aria-label={t("menuAi.find.find")}
              aria-invalid={!!findError || undefined}
              onBlur={() => setFindTouched(true)}
              onChange={(e) => {
                setFind(e.target.value);
                reset();
              }}
              className={clsx(TEXT_INPUT_CLASS, findError && FIELD_INVALID)}
            />
          </Field>
          <Field label={t("menuAi.find.replace")}>
            <input
              value={replace}
              placeholder={t("menuAi.find.replacePlaceholder")}
              aria-label={t("menuAi.find.replace")}
              onChange={(e) => setReplace(e.target.value)}
              className={TEXT_INPUT_CLASS}
            />
          </Field>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={matchCase}
          onClick={() => {
            setMatchCase((on) => !on);
            reset();
          }}
          className={clsx("flex items-center gap-2 self-start text-[14px] font-semibold leading-[14px]", TEXT)}
        >
          <MenuIcon
            name={matchCase ? "menu-radio-on.svg" : "menu-radio-off.svg"}
            size={24}
            className={matchCase ? "text-[#0D6EFD]" : "text-[#64748b]"}
          />
          {t("menuAi.find.matchCase")}
        </button>
      </div>

      {search && (
        <div className={clsx("flex flex-col gap-4 border-t pt-4", LINE)}>
          <p role="status" className="px-2 text-[16px] font-medium leading-4 text-[#0058da] [[data-theme=dark]_&]:text-[#8ab8ff]">
            {fill(t("menuAi.find.matchesFound"), { n: search.matches.length })}
          </p>
          {search.matches.length > 0 && (
            <ul className="flex max-h-[325px] flex-col gap-2 overflow-y-auto octo-scroll">
              {search.matches.map((match) => (
                <li key={match.item.id} className={clsx("flex items-start gap-3 border-b pb-2", LINE)}>
                  <CheckBox
                    checked={selected.has(match.item.id)}
                    onChange={(on) => {
                      const next = new Set(selected);
                      if (on) next.add(match.item.id);
                      else next.delete(match.item.id);
                      setSelected(next);
                      setNoneSelected(false);
                    }}
                    label={<span className="sr-only">{fill(t("menuAi.find.selectMatch"), { name: match.item.name })}</span>}
                    className="!gap-0"
                  />
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={clsx("size-12 shrink-0 overflow-hidden rounded-[4px]", SURFACE_SUBTLE)}>
                      {match.item.image && <img src={match.item.image} alt="" className="size-full object-cover" />}
                    </span>
                    <div className="flex min-w-0 flex-col gap-2">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className={clsx("text-[14px] font-medium leading-[14px]", TEXT)}>
                          <Highlighted text={match.item.name} find={search.find} matchCase={search.matchCase} on={match.inName} />
                        </span>
                        <span className="rounded-full bg-[#f5f9ff] px-2 py-1 text-[12px] font-medium leading-3 text-[#0058da] [[data-theme=dark]_&]:bg-[#0d6efd]/15 [[data-theme=dark]_&]:text-[#8ab8ff]">
                          {match.sectionName}
                        </span>
                      </p>
                      <p className={clsx("text-[12px] font-medium leading-[15px]", TEXT_GRAY)}>
                        <Highlighted text={match.item.description} find={search.find} matchCase={search.matchCase} on={match.inDescription} />
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {noneSelected && (
            <span role="alert" className="px-2 text-[12px] leading-[14px] text-[#d30202]">
              {t("menuAi.find.error.noneSelected")}
            </span>
          )}
        </div>
      )}

      <button type="submit" data-find-submit className={MODAL_SUBMIT}>
        {replacing ? t("menuAi.find.replaceSelected") : t("menuAi.find.search")}
      </button>
    </FrameModal>
  );
}

/** The whole-menu summary. The frame has no entry point for it, so the edit
 *  screen no longer opens it; kept for when "View Extraction Summary" returns. */
export function SummaryModal({
  open,
  result,
  onPickIssue,
  onClose,
}: {
  open: boolean;
  result: DetectionResult;
  onPickIssue: (kind: IssueKind) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const s = summarize(result);
  const tiles = [
    { icon: <LayoutGrid size={18} />, tone: "violet" as const, value: s.sections, label: t("menuAi.stat.sections") },
    { icon: <ListChecks size={18} />, tone: "violet" as const, value: s.items, label: t("menuAi.stat.items") },
    { icon: <ShieldCheck size={18} />, tone: "success" as const, value: s.high, label: fill(t("menuAi.stat.highPct"), { pct: s.highPct }) },
    { icon: <AlertTriangle size={18} />, tone: "warning" as const, value: s.needReview, label: fill(t("menuAi.stat.reviewPct"), { pct: s.reviewPct }) },
  ];
  const openIssues = ISSUE_KINDS.filter((k) => s.issues[k] > 0);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("menuAi.summary.title")}
      className="max-w-[640px]"
      footer={<PrimaryButton onClick={onClose}>{t("menuAi.done")}</PrimaryButton>}
    >
      <p className="text-[13px] text-[var(--octo-text-secondary)]">
        {fill(t("menuAi.summary.file"), { file: result.fileName, pages: result.pages })}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-[10px] border border-[var(--octo-border-card)] p-3">
            <StatIcon tone={tile.tone} size={32}>{tile.icon}</StatIcon>
            <p className="mt-2 text-[20px] font-bold text-[var(--octo-text-primary)]">{tile.value}</p>
            <p className="text-[12px] leading-snug text-[var(--octo-text-secondary)]">{tile.label}</p>
          </div>
        ))}
      </div>

      <h3 className={clsx("mt-4 text-[13px] font-semibold", AI.text)}>{t("menuAi.attention.title")}</h3>
      {openIssues.length === 0 ? (
        <p className="mt-1.5 inline-flex items-center gap-2 text-[13px] text-[var(--octo-tone-success-text)]">
          <CheckCircle2 size={16} aria-hidden />
          {t("menuAi.attention.none")}
        </p>
      ) : (
        <ul className="mt-1.5 space-y-1">
          {openIssues.map((kind) => (
            <li key={kind}>
              <button
                type="button"
                onClick={() => onPickIssue(kind)}
                className="inline-flex items-center gap-2 text-[13px] text-[var(--octo-text-primary)] hover:underline"
              >
                <AlertTriangle size={15} className="text-[var(--octo-tone-warning-dot)]" aria-hidden />
                {issueLine(t, kind, s.issues[kind])}
              </button>
            </li>
          ))}
        </ul>
      )}

      <h3 className={clsx("mt-4 text-[13px] font-semibold", AI.text)}>{t("menuAi.summary.bySection")}</h3>
      <div className="mt-1.5 max-h-[220px] overflow-y-auto rounded-[9px] border border-[var(--octo-border-card)] octo-scroll">
        <table className="w-full text-[13px]">
          <tbody>
            {result.sections.map((section) => {
              const avg = section.items.length
                ? Math.round(section.items.reduce((n, i) => n + i.confidence, 0) / section.items.length)
                : null;
              return (
                <tr key={section.id} className="border-b border-[var(--octo-divider)] last:border-0">
                  <td className="px-3 py-2 text-[var(--octo-text-primary)]">{section.name}</td>
                  <td className="px-3 py-2 text-[var(--octo-text-secondary)]">
                    {fill(t("menuAi.count.itemsN"), { n: section.items.length })}
                  </td>
                  <td className="px-3 py-2 text-end">{avg !== null ? <ConfidencePill value={avg} /> : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

/** "2 Items: Price unclear" — the count word is singular for one. */
export function issueLine(t: (key: string) => string, kind: IssueKind, n: number): string {
  const count = n === 1 ? t("menuAi.count.item1") : fill(t("menuAi.count.itemsN"), { n });
  return `${count}: ${t(`menuAi.issue.${kind}`)}`;
}
