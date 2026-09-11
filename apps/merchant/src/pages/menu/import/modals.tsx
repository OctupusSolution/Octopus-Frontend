// The dialogs behind the review screens' secondary actions. Each one computes
// its effect with a pure transform from entities/menu/ai-import and hands the
// result back; none of them touches the session store directly, so the screen
// that opened a dialog stays the one place that decides what changes.
import { useEffect, useState } from "react";
import clsx from "clsx";
import { AlertTriangle, CheckCircle2, LayoutGrid, ListChecks, ShieldCheck } from "lucide-react";
import { Input, Modal } from "@ui/primitives";
import {
  ISSUE_KINDS,
  adjustPrices,
  findAndReplace,
  summarize,
  type DetectionResult,
  type IssueKind,
  type PriceAdjustment,
} from "@/entities/menu/ai-import";
import { useI18n } from "@/app/providers/i18n-provider";
import { AI, fill, outlineButton } from "./ai-style";
import { ConfidencePill, StatIcon } from "./chrome";

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
  useEffect(() => {
    if (open) setName(initial);
  }, [open, initial]);
  const trimmed = name.trim();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <CancelButton onClick={onClose} />
          <PrimaryButton disabled={!trimmed} onClick={() => onSubmit(trimmed)}>{t("menuAi.save")}</PrimaryButton>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (trimmed) onSubmit(trimmed);
        }}
      >
        <Input
          autoFocus
          label={t("menuAi.sectionName")}
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
        />
      </form>
    </Modal>
  );
}

export function BulkPriceModal({
  open,
  result,
  sectionId,
  onApply,
  onClose,
}: {
  open: boolean;
  result: DetectionResult;
  sectionId: string | null;
  onApply: (next: DetectionResult) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<PriceAdjustment["mode"]>("percent");
  const [raw, setRaw] = useState("");
  useEffect(() => {
    if (open) setRaw("");
  }, [open]);
  const section = result.sections.find((s) => s.id === sectionId) ?? null;
  const amount = Number(raw);
  const valid = raw.trim() !== "" && Number.isFinite(amount) && amount !== 0;
  // Preview the first three so the merchant sees the direction before applying.
  const preview =
    section && valid ? adjustPrices(result, section.id, { mode, amount }).sections.find((s) => s.id === section.id)! : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={section ? fill(t("menuAi.bulk.title"), { section: section.name }) : t("menuAi.bulk.titleNone")}
      footer={
        <>
          <CancelButton onClick={onClose} />
          <PrimaryButton
            disabled={!section || !valid}
            onClick={() => section && onApply(adjustPrices(result, section.id, { mode, amount }))}
          >
            {t("menuAi.bulk.apply")}
          </PrimaryButton>
        </>
      }
    >
      {!section ? (
        <p className="text-[13.5px] text-[var(--octo-text-secondary)]">{t("menuAi.bulk.pickSection")}</p>
      ) : (
        <div className="space-y-3">
          <div role="radiogroup" className="inline-flex rounded-[9px] bg-[var(--octo-seg-bg)] p-1">
            {(["percent", "fixed"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={clsx(
                  "rounded-[7px] px-3 py-1.5 text-[13px] font-medium",
                  mode === m ? "bg-[var(--octo-card)] text-[var(--octo-text-primary)] shadow-sm" : "text-[var(--octo-text-secondary)]"
                )}
              >
                {t(`menuAi.bulk.${m}`)}
              </button>
            ))}
          </div>
          <Input
            autoFocus
            type="number"
            label={mode === "percent" ? t("menuAi.bulk.percentLabel") : t("menuAi.bulk.fixedLabel")}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={mode === "percent" ? "10" : "-5"}
          />
          <p className="text-[12px] text-[var(--octo-text-muted)]">{t("menuAi.bulk.hint")}</p>
          {preview && (
            <ul className="divide-y divide-[var(--octo-divider)] rounded-[9px] border border-[var(--octo-border-card)] text-[13px]">
              {section.items.slice(0, 3).map((item, i) => (
                <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="truncate text-[var(--octo-text-primary)]">{item.name}</span>
                  <span className="shrink-0 tabular-nums text-[var(--octo-text-secondary)]">
                    {item.price ?? "—"} → <b className="text-[var(--octo-text-primary)]">{preview.items[i].price ?? "—"}</b>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
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
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  useEffect(() => {
    if (open) {
      setFind("");
      setReplace("");
    }
  }, [open]);
  const outcome = findAndReplace(result, find, replace);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("menuAi.find.title")}
      footer={
        <>
          <CancelButton onClick={onClose} />
          <PrimaryButton disabled={outcome.count === 0} onClick={() => onApply(outcome.result, outcome.count)}>
            {t("menuAi.find.apply")}
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-3">
        <Input autoFocus label={t("menuAi.find.find")} value={find} onChange={(e) => setFind(e.target.value)} />
        <Input label={t("menuAi.find.replace")} value={replace} onChange={(e) => setReplace(e.target.value)} />
        <p className="text-[12.5px] text-[var(--octo-text-muted)]">
          {find ? fill(t("menuAi.find.matches"), { n: outcome.count }) : t("menuAi.find.hint")}
        </p>
      </div>
    </Modal>
  );
}

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
