// apps/merchant/src/pages/customers/segments/conditions-editor.tsx
// The "Conditions" + "Customers match" block shared by the Create segment modal
// and the details page's Conditions card.
import clsx from "clsx";
import { X } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { ShellIcon } from "@/shared/ui/shell-icon";
import {
  EDITABLE_FIELDS,
  OPERATOR_SYMBOL,
  describeCondition,
  emptyCondition,
  fieldInputType,
  type ConditionDraft,
  type EditableField,
  type EditableOperator,
  type MatchMode,
} from "./segment-model";

export const FIELD_LABEL_CLASS = "px-2 text-[16px] font-medium leading-[16px] text-[var(--octo-text-primary)]";

export const FIELD_BOX_CLASS =
  "flex h-12 w-full items-center rounded-[12px] border border-[#cbd5e1] bg-[var(--octo-card)] px-2 text-[14px] leading-[14px] text-[var(--octo-text-primary)] transition-colors focus-within:border-[#0d6efd] [[data-theme=dark]_&]:border-[var(--octo-border-input)]";

// The pickers sit inside the frame's single 48px field, so they carry no border of their own.
const BARE_SELECT_CLASS =
  "h-8 shrink-0 cursor-pointer rounded-[6px] bg-transparent text-[14px] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)] focus:outline-none [&>option]:bg-[var(--octo-card)]";

const OPERATORS: readonly EditableOperator[] = ["Gte", "Lte"];
const MATCH_MODES: readonly MatchMode[] = ["All", "Any"];

function ConditionRow({
  draft,
  removable,
  onChange,
  onRemove,
}: {
  draft: ConditionDraft;
  removable: boolean;
  onChange: (next: ConditionDraft) => void;
  onRemove: () => void;
}) {
  const { t, locale } = useI18n();
  return (
    <div className={clsx(FIELD_BOX_CLASS, "gap-1")}>
      {draft.kind === "locked" ? (
        <span className="min-w-0 flex-1 truncate">{describeCondition(draft.condition, t, locale)}</span>
      ) : (
        <>
          <select
            aria-label={t("customers.segments.fieldAria")}
            value={draft.field}
            // The value's type follows the field, so a number typed for Visits cannot survive as a date.
            onChange={(event) => onChange({ ...draft, field: event.target.value as EditableField, value: "" })}
            className={BARE_SELECT_CLASS}
          >
            {EDITABLE_FIELDS.map((field) => (
              <option key={field} value={field}>{t(`customers.segments.field.${field}`)}</option>
            ))}
          </select>
          <select
            aria-label={t("customers.segments.operatorAria")}
            value={draft.operator}
            onChange={(event) => onChange({ ...draft, operator: event.target.value as EditableOperator })}
            className={BARE_SELECT_CLASS}
          >
            {OPERATORS.map((operator) => (
              <option key={operator} value={operator}>{OPERATOR_SYMBOL[operator]}</option>
            ))}
          </select>
          <input
            type={fieldInputType(draft.field)}
            min={0}
            inputMode={fieldInputType(draft.field) === "number" ? "numeric" : undefined}
            aria-label={t("customers.segments.valuePlaceholder")}
            placeholder={t("customers.segments.valuePlaceholder")}
            value={draft.value}
            onChange={(event) => onChange({ ...draft, value: event.target.value })}
            className="h-8 min-w-0 flex-1 bg-transparent ps-1 text-[14px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-secondary)] focus:outline-none"
          />
        </>
      )}
      {removable && (
        <button
          type="button"
          aria-label={t("customers.segments.removeCondition")}
          title={t("customers.segments.removeCondition")}
          onClick={onRemove}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[6px] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

function MatchCard({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className={clsx(
        "flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-[8px] border px-3 py-2 text-[14px] font-medium leading-[14px] transition-colors",
        checked
          ? "border-[#0d6efd] bg-[#f5f9ff] text-[#0d6efd] [[data-theme=dark]_&]:bg-[#0d6efd]/15"
          : "border-[#cbd5e1] text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)] [[data-theme=dark]_&]:border-[var(--octo-border-input)]"
      )}
    >
      <ShellIcon name={checked ? "crm-seg-radio-on.svg" : "crm-seg-radio-off.svg"} className={checked ? undefined : "text-[#a1a6b0]"} />
      <span className="truncate">{label}</span>
    </button>
  );
}

export function ConditionsEditor({
  drafts,
  match,
  onDraftsChange,
  onMatchChange,
}: {
  drafts: readonly ConditionDraft[];
  match: MatchMode;
  onDraftsChange: (next: ConditionDraft[]) => void;
  onMatchChange: (next: MatchMode) => void;
}) {
  const { t } = useI18n();
  return (
    <>
      <div className="flex flex-col gap-3">
        <p className={FIELD_LABEL_CLASS}>{t("customers.segments.conditions")}</p>
        {drafts.map((draft) => (
          <ConditionRow
            key={draft.key}
            draft={draft}
            removable={drafts.length > 1}
            onChange={(next) => onDraftsChange(drafts.map((d) => (d.key === draft.key ? next : d)))}
            onRemove={() => onDraftsChange(drafts.filter((d) => d.key !== draft.key))}
          />
        ))}
        <button
          type="button"
          onClick={() => onDraftsChange([...drafts, emptyCondition()])}
          className="flex items-center gap-1 self-start text-[16px] font-medium leading-[16px] text-[#0d6efd] hover:underline"
        >
          <ShellIcon name="crm-seg-plus.svg" />
          {t("customers.segments.addCondition")}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <p className={FIELD_LABEL_CLASS}>{t("customers.segments.match.label")}</p>
        <div role="radiogroup" aria-label={t("customers.segments.match.label")} className="flex gap-4">
          {MATCH_MODES.map((mode) => (
            <MatchCard
              key={mode}
              label={t(mode === "All" ? "customers.segments.match.all" : "customers.segments.match.any")}
              checked={match === mode}
              onClick={() => onMatchChange(mode)}
            />
          ))}
        </div>
      </div>
    </>
  );
}
