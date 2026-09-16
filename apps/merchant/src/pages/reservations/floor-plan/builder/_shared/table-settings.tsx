// "Selection" — the inspector for one table, or several at once. With a
// multi-selection each field shows the shared value, or "Mixed" when they
// differ, and a change applies to every selected table.
import { Copy, Lock, LockOpen, RotateCw, Trash2 } from "lucide-react";
import clsx from "clsx";
import {
  MAX_SEATS,
  TABLE_AREAS,
  TABLE_SHAPES,
  TABLE_SIZES,
  type FloorPlanDoc,
  type FloorTable,
  type LiveStatus,
  type SmokingPolicy,
  type TableArea,
  type TableShape,
  type TableSize,
} from "@/entities/floor-plan";
import { TABLE_TONES } from "@/widgets/floor-plan-canvas";
import { useI18n } from "@/app/providers/i18n-provider";
import { Field, NumberStepper, SelectField, TextAreaField, TextField } from "../../_shared/fields";
import { areaLabel, shapeLabel, sizeLabel, tableLine } from "../../_shared/labels";
import { SwitchField } from "../../_shared/switch";

type TablePatch = Partial<Omit<FloorTable, "id" | "kind">>;

function common<T>(tables: FloorTable[], pick: (t: FloorTable) => T): T | null {
  const first = pick(tables[0]);
  return tables.every((t) => pick(t) === first) ? first : null;
}

export function TableSettings({
  doc,
  tables,
  toneFor,
  onPatch,
  onDuplicate,
  onDelete,
  onRotate,
  onToggleLock,
  className,
}: {
  doc: FloorPlanDoc;
  tables: FloorTable[];
  toneFor: (table: FloorTable) => LiveStatus;
  onPatch: (patch: TablePatch) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRotate: () => void;
  onToggleLock: () => void;
  className?: string;
}) {
  const { t } = useI18n();
  if (tables.length === 0) return null;
  const single = tables.length === 1 ? tables[0] : null;
  const mixed = t("floorPlan.common.mixed");
  const allLocked = tables.every((table) => table.locked);

  const duplicateNumber =
    single &&
    single.number.trim() !== "" &&
    doc.tables.some((other) => other.id !== single.id && other.number.trim().toLowerCase() === single.number.trim().toLowerCase());

  const toggles: { key: "reservable" | "walkIn" | "largePartyOnly" | "blocked"; label: string }[] = [
    { key: "reservable", label: t("floorPlan.table.reservable") },
    { key: "walkIn", label: t("floorPlan.table.walkIn") },
    { key: "largePartyOnly", label: t("floorPlan.table.largePartyOnly") },
    { key: "blocked", label: t("floorPlan.table.blocked") },
  ];

  return (
    <div className={clsx("flex flex-col gap-4", className)}>
      {single ? (
        <div className="rounded-[14px] border border-[var(--octo-border-card)] px-3.5 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[17px] font-semibold text-[var(--octo-text-primary)]">{single.number || "—"}</span>
            <span
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12.5px] font-medium"
              style={{ backgroundColor: `${TABLE_TONES[toneFor(single)].dot}1a`, color: TABLE_TONES[toneFor(single)].text }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {t(`floorPlan.status.${toneFor(single)}.summary`)}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-[var(--octo-text-secondary)]">{tableLine(single, t)}</p>
        </div>
      ) : (
        <p className="rounded-[14px] border border-[var(--octo-border-card)] px-3.5 py-3 text-[13px] text-[var(--octo-text-secondary)]">
          {tables.map((table) => table.number).join(", ")}
        </p>
      )}

      <div>
        <h3 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{t("floorPlan.table.quickActions")}</h3>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={onDuplicate}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] border border-[var(--octo-border-input)] text-[15px] font-medium text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]"
          >
            <Copy size={18} />
            {t("floorPlan.tools.duplicate")}
          </button>
          <button
            type="button"
            onClick={onRotate}
            title={`${t("floorPlan.tools.rotate")} (R)`}
            aria-label={t("floorPlan.tools.rotate")}
            className="grid h-11 w-11 place-items-center rounded-[10px] border border-[var(--octo-border-input)] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
          >
            <RotateCw size={18} />
          </button>
          <button
            type="button"
            onClick={onToggleLock}
            title={`${allLocked ? t("floorPlan.tools.unlock") : t("floorPlan.tools.lock")} (L)`}
            aria-label={allLocked ? t("floorPlan.tools.unlock") : t("floorPlan.tools.lock")}
            className="grid h-11 w-11 place-items-center rounded-[10px] border border-[var(--octo-border-input)] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
          >
            {allLocked ? <LockOpen size={18} /> : <Lock size={18} />}
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={t("floorPlan.tools.delete")}
            title={`${t("floorPlan.tools.delete")} (Del)`}
            className="grid h-11 w-11 place-items-center rounded-[10px] bg-[#FEE2E2] text-[#DC2626] transition-colors hover:bg-[#FECACA]"
          >
            <Trash2 size={18} />
          </button>
        </div>
        {allLocked && <p className="mt-2 text-[12px] text-[var(--octo-text-muted)]">{t("floorPlan.table.lockedHint")}</p>}
      </div>

      <div className="flex flex-col gap-3.5">
        <h3 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{t("floorPlan.table.settings")}</h3>
        {single && (
          <TextField
            label={t("floorPlan.table.number")}
            value={single.number}
            maxLength={12}
            onChange={(number) => onPatch({ number })}
            error={
              single.number.trim() === ""
                ? t("floorPlan.table.numberRequired")
                : duplicateNumber
                  ? t("floorPlan.table.numberTaken").replace("{number}", single.number.trim())
                  : undefined
            }
          />
        )}
        <Field label={t("floorPlan.table.seats")}>
          <NumberStepper
            value={common(tables, (x) => x.seats)}
            min={1}
            max={MAX_SEATS}
            label={t("floorPlan.table.seats")}
            onChange={(seats) => onPatch({ seats })}
          />
        </Field>
        <SelectField<TableShape>
          label={t("floorPlan.table.shape")}
          value={common(tables, (x) => x.shape)}
          mixedLabel={mixed}
          onChange={(shape) => onPatch({ shape })}
          options={TABLE_SHAPES.map((value) => ({ value, label: shapeLabel(value, t) }))}
        />
        <SelectField<TableSize>
          label={t("floorPlan.table.size")}
          value={common(tables, (x) => x.size)}
          mixedLabel={mixed}
          onChange={(size) => onPatch({ size })}
          options={TABLE_SIZES.map((value) => ({ value, label: sizeLabel(value, t) }))}
        />
        <SelectField<TableArea>
          label={t("floorPlan.table.area")}
          value={common(tables, (x) => x.area)}
          mixedLabel={mixed}
          onChange={(area) => onPatch({ area })}
          options={TABLE_AREAS.map((value) => ({ value, label: areaLabel(value, t) }))}
        />
        <SelectField<SmokingPolicy>
          label={t("floorPlan.table.smoking")}
          value={common(tables, (x) => x.smoking)}
          mixedLabel={mixed}
          onChange={(smoking) => onPatch({ smoking })}
          options={[
            { value: "nonSmoking", label: t("floorPlan.smoking.nonSmoking") },
            { value: "smoking", label: t("floorPlan.smoking.smoking") },
          ]}
        />
        {single && (
          <TextAreaField label={t("floorPlan.table.note")} value={single.note} placeholder={t("floorPlan.table.notePlaceholder")} onChange={(note) => onPatch({ note })} />
        )}
        <div className="flex flex-col gap-3 pt-1">
          {toggles.map(({ key, label }) => {
            const value = common(tables, (x) => x[key]);
            return (
              <SwitchField
                key={key}
                label={value === null ? `${label} (${mixed})` : label}
                checked={value === true}
                onChange={(next) => {
                  // Blocking a table takes it out of booking; it cannot stay
                  // reservable at the same time.
                  if (key === "blocked" && next) onPatch({ blocked: true, reservable: false });
                  else if (key === "reservable" && next) onPatch({ reservable: true, blocked: false });
                  else onPatch({ [key]: next });
                }}
              />
            );
          })}
          <SwitchField label={t("floorPlan.table.visible")} checked={common(tables, (x) => x.visible) !== false} onChange={(visible) => onPatch({ visible })} />
        </div>
      </div>
    </div>
  );
}
