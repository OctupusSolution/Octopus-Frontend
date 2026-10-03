// apps/merchant/src/pages/customers/segments/segment-model.ts
// The segment screens' view model, and the conversion between the rule editor's
// rows and the API's criteria (CrmCustomerCriteriaDto).
import type { CrmCriteriaConditionDto, CrmCriteriaValueDto, CrmCustomerCriteriaDto } from "@octopus/api-client";
import { formatDate, formatSarWhole } from "../_shared/format";

export interface SegmentTrendPoint {
  localDate: string; // yyyy-MM-dd
  members: number;
}

/** One segment as the cards and the details page show it. The figures are null
 *  until the server has computed the segment's stats. */
export interface SegmentView {
  id: string;
  name: string;
  criteria: CrmCustomerCriteriaDto;
  members: number | null;
  ofBasePercent: number | null;
  avgSpendSar: number | null;
  trend: readonly SegmentTrendPoint[];
}

export interface SegmentMemberPreview {
  id: string;
  name: string;
  visits: number;
  totalSpendSar: number;
}

export type MatchMode = CrmCustomerCriteriaDto["match"];

type Translate = (key: string) => string;

// The fields the rule editor can build, with the value kind the core criteria
// catalog expects for each (the same keys crm-api.ts sends).
type FieldKind = "int" | "money" | "date";
export const EDITABLE_FIELDS = ["visit_count", "total_spend", "last_visit_at", "customer_since", "age"] as const;
export type EditableField = (typeof EDITABLE_FIELDS)[number];

const FIELD_KIND: Record<EditableField, FieldKind> = {
  visit_count: "int",
  total_spend: "money",
  last_visit_at: "date",
  customer_since: "date",
  age: "int",
};

export type EditableOperator = "Gte" | "Lte";
export const OPERATOR_SYMBOL: Record<EditableOperator, string> = { Gte: "≥", Lte: "≤" };

/** A row of the rule editor. A condition the editor cannot build (tags, gender,
 *  a range…) is kept exactly as the server sent it and shown read-only. */
export type ConditionDraft =
  | { key: number; kind: "editable"; field: EditableField; operator: EditableOperator; value: string }
  | { key: number; kind: "locked"; condition: CrmCriteriaConditionDto };

let nextKey = 1;

export function fieldInputType(field: EditableField): "number" | "date" {
  return FIELD_KIND[field] === "date" ? "date" : "number";
}

export function emptyCondition(): ConditionDraft {
  return { key: nextKey++, kind: "editable", field: "visit_count", operator: "Gte", value: "" };
}

function isEditableField(field: string): field is EditableField {
  return (EDITABLE_FIELDS as readonly string[]).includes(field);
}

function editableValue(field: EditableField, value: CrmCriteriaValueDto): string | null {
  const kind = FIELD_KIND[field];
  if (kind === "int" && value.kind === "int" && value.int !== undefined) return String(value.int);
  if (kind === "money" && value.kind === "money" && value.amount !== undefined) return String(value.amount);
  if (kind === "date" && value.kind === "date" && value.date) return value.date;
  return null;
}

export function toDrafts(criteria: CrmCustomerCriteriaDto): ConditionDraft[] {
  return criteria.conditions.map((condition): ConditionDraft => {
    const { field, operator } = condition;
    if (isEditableField(field) && (operator === "Gte" || operator === "Lte")) {
      const value = editableValue(field, condition.value);
      if (value !== null) return { key: nextKey++, kind: "editable", field, operator, value };
    }
    return { key: nextKey++, kind: "locked", condition };
  });
}

function toCondition(draft: ConditionDraft): CrmCriteriaConditionDto | null {
  if (draft.kind === "locked") return draft.condition;
  const text = draft.value.trim();
  if (text === "") return null;
  const kind = FIELD_KIND[draft.field];
  if (kind === "date") return { field: draft.field, operator: draft.operator, value: { kind: "date", date: text } };
  const number = Number(text);
  if (!Number.isFinite(number) || number < 0) return null;
  if (kind === "money") return { field: draft.field, operator: draft.operator, value: { kind: "money", amount: number } };
  if (!Number.isInteger(number)) return null;
  return { field: draft.field, operator: draft.operator, value: { kind: "int", int: number } };
}

/** The editor's rows as criteria, or null while any row is still incomplete. */
export function toCriteria(drafts: readonly ConditionDraft[], match: MatchMode): CrmCustomerCriteriaDto | null {
  if (drafts.length === 0) return null;
  const conditions: CrmCriteriaConditionDto[] = [];
  for (const draft of drafts) {
    const condition = toCondition(draft);
    if (!condition) return null;
    conditions.push(condition);
  }
  return { match, conditions };
}

// ---- wording ----------------------------------------------------------------

const FIELD_LABEL_PREFIX = "customers.segments.field.";

function fieldLabel(field: string, t: Translate): string {
  const key = FIELD_LABEL_PREFIX + field;
  const label = t(key);
  if (label !== key) return label;
  // A field the dictionary does not name: "preferred_branch" -> "Preferred branch".
  const words = field.replace(/[_-]/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const SYMBOL: Partial<Record<CrmCriteriaConditionDto["operator"], string>> = {
  Gte: "≥",
  Lte: "≤",
  Equals: "=",
  NotEquals: "≠",
};

function range(min: number | undefined, max: number | undefined): string | null {
  if (min !== undefined && max !== undefined) return `${min}–${max}`;
  if (min !== undefined) return `≥ ${min}`;
  if (max !== undefined) return `≤ ${max}`;
  return null;
}

function valueText(value: CrmCriteriaValueDto, locale: string): string | null {
  switch (value.kind) {
    case "int":
      return value.int === undefined ? null : value.int.toLocaleString("en-US");
    case "number":
      return value.number === undefined ? null : value.number.toLocaleString("en-US");
    case "money":
      return value.amount === undefined ? null : formatSarWhole(value.amount);
    case "date":
      return value.date ? formatDate(value.date, locale) : null;
    case "days":
      return value.days === undefined ? null : String(value.days);
    case "strings":
      return value.values?.length ? value.values.join(", ") : null;
    case "intRange":
    case "numberRange":
    case "moneyRange":
    case "windowCount":
      return range(value.min, value.max);
    default:
      return null;
  }
}

// The backend seeds every business with six segments and names them in Arabic
// only (a segment has one `name`, no per-locale text). Those six are shown in
// the console language instead; a name the merchant typed is left as typed.
const SEEDED_NAME_KEY: Record<string, string> = {
  "كبار العملاء": "customers.segments.seeded.vip",
  "عملاء جدد": "customers.segments.seeded.new",
  "عملاء منتظمون": "customers.segments.seeded.regular",
  "غير نشطين": "customers.segments.seeded.inactive",
  "كبار المنفقين": "customers.segments.seeded.bigSpenders",
  "معرضون للفقدان": "customers.segments.seeded.atRisk",
};

export function segmentDisplayName(name: string, t: Translate): string {
  const key = SEEDED_NAME_KEY[name.trim()];
  return key ? t(key) : name;
}

/** "Visits ≥ 40". A condition whose value has no readable form (tag ids) reads
 *  as its field name alone. */
export function describeCondition(condition: CrmCriteriaConditionDto, t: Translate, locale: string): string {
  const label = fieldLabel(condition.field, t);
  // A day window is a sentence, not a comparison: "Last visit over 90 days ago".
  if (condition.value.kind === "days" && condition.value.days !== undefined) {
    const days = String(condition.value.days);
    if (condition.operator === "WithinLastDays") {
      return t("customers.segments.withinDays").replace("{field}", label).replace("{days}", days);
    }
    if (condition.operator === "NotWithinLastDays") {
      return t("customers.segments.notWithinDays").replace("{field}", label).replace("{days}", days);
    }
  }
  const value = valueText(condition.value, locale);
  if (value === null) return label;
  const symbol = SYMBOL[condition.operator];
  return symbol ? `${label} ${symbol} ${value}` : `${label} ${value}`;
}

/** "Visits ≥ 40 AND Total spent ≥ SAR 5,000". */
export function describeCriteria(criteria: CrmCustomerCriteriaDto, t: Translate, locale: string): string {
  const joiner = t(criteria.match === "All" ? "customers.segments.and" : "customers.segments.or");
  return criteria.conditions.map((c) => describeCondition(c, t, locale)).join(` ${joiner} `);
}

/** "842 members · 6.6% of base", or the pending note while there are no stats. */
export function membersLine(segment: Pick<SegmentView, "members" | "ofBasePercent">, t: Translate): string {
  if (segment.members === null || segment.ofBasePercent === null) return t("customers.segments.statsPending");
  return t("customers.segments.membersOfBase")
    .replace("{members}", segment.members.toLocaleString("en-US"))
    .replace("{percent}", formatPercent(segment.ofBasePercent));
}

export function formatPercent(percent: number): string {
  return String(Math.round(percent * 10) / 10);
}
