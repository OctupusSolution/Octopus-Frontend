// "Selection" — the inspector for one table, or several at once. With a
// multi-selection each field shows the shared value, or "Mixed" when they
// differ, and a change applies to every selected table.
import { Lock, LockOpen, RotateCw } from "lucide-react";
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
import { ShellIcon } from "@/shared/ui/shell-icon";
import { BORDER_300, SURFACE_RED_LIGHT, TEXT_ERROR, TEXT_PRIMARY, TEXT_SEC_GRAY } from "../../../_shared/theme";

type TablePatch = Partial<Omit<FloorTable, "id" | "kind">>;

// The frame's "Available" pill; the other statuses keep the canvas palette so
// a pill always matches the box it describes.
const AVAILABLE_PILL = { backgroundColor: "#dcffef", color: "#009a39" };
const ICON_BUTTON =
  "grid h-9 w-9 shrink-0 place-items-center rounded-[8px] border transition-colors hover:bg-[#f5f9ff] [[data-theme=dark]_&]:hover:bg-[var(--octo-hover)]";

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

  const tone = single ? toneFor(single) : null;

  return (
    <div className={clsx("flex flex-col gap-3", className)}>
      {single && tone ? (
        <div className={clsx("flex flex-col gap-2 rounded-[12px] border p-2", BORDER_300)}>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[14px] font-semibold leading-[14px] text-black [[data-theme=dark]_&]:text-[var(--octo-text-primary)]">
              {single.number || "—"}
            </span>
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[12px] font-medium leading-[12px]"
              style={tone === "available" ? AVAILABLE_PILL : { backgroundColor: `${TABLE_TONES[tone].dot}1a`, color: TABLE_TONES[tone].text }}
            >
              <span className="h-[5px] w-[5px] rounded-full bg-current" />
              {t(`floorPlan.status.${tone}.summary`)}
            </span>
          </div>
          <p className={clsx("text-[12px] font-medium leading-[12px]", TEXT_SEC_GRAY)}>{tableLine(single, t)}</p>
        </div>
      ) : (
        <p className={clsx("rounded-[12px] border p-2 text-[12px] font-medium leading-[16px]", BORDER_300, TEXT_SEC_GRAY)}>
          {tables.map((table) => table.number).join(", ")}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <h3 className={clsx("text-[14px] font-medium leading-[14px]", TEXT_PRIMARY)}>{t("floorPlan.table.quickActions")}</h3>
        <div className="flex items-stretch gap-2">
          <button
            type="button"
            onClick={onDuplicate}
            className={clsx(
              "flex h-9 min-w-0 flex-1 items-center gap-1 rounded-[8px] border px-2 py-1 text-[16px] font-medium leading-[16px] transition-colors hover:bg-[#f5f9ff] [[data-theme=dark]_&]:hover:bg-[var(--octo-hover)]",
              BORDER_300,
              TEXT_PRIMARY
            )}
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center">
              <ShellIcon name="fp-quick-copy.svg" size={22} />
            </span>
            <span className="truncate">{t("floorPlan.tools.duplicate")}</span>
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={t("floorPlan.tools.delete")}
            title={`${t("floorPlan.tools.delete")} (Del)`}
            className={clsx("grid h-9 w-9 shrink-0 place-items-center rounded-[8px] transition-opacity hover:opacity-80", SURFACE_RED_LIGHT, TEXT_ERROR)}
          >
            <ShellIcon name="fp-quick-trash.svg" size={24} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRotate}
            title={`${t("floorPlan.tools.rotate")} (R)`}
            aria-label={t("floorPlan.tools.rotate")}
            className={clsx(ICON_BUTTON, BORDER_300, TEXT_SEC_GRAY)}
          >
            <RotateCw size={18} />
          </button>
          <button
            type="button"
            onClick={onToggleLock}
            title={`${allLocked ? t("floorPlan.tools.unlock") : t("floorPlan.tools.lock")} (L)`}
            aria-label={allLocked ? t("floorPlan.tools.unlock") : t("floorPlan.tools.lock")}
            className={clsx(ICON_BUTTON, BORDER_300, TEXT_SEC_GRAY)}
          >
            {allLocked ? <LockOpen size={18} /> : <Lock size={18} />}
          </button>
        </div>
        {allLocked && <p className={clsx("text-[12px] leading-[16px]", TEXT_SEC_GRAY)}>{t("floorPlan.table.lockedHint")}</p>}
      </div>

      <div className="flex flex-col gap-4">
        <h3 className={clsx("text-[14px] font-medium leading-[14px]", TEXT_PRIMARY)}>{t("floorPlan.table.settings")}</h3>
        <div className="flex flex-col gap-3">
          {single && (
            <TextField
              compact
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
          <Field compact label={t("floorPlan.table.seats")}>
            <NumberStepper
              value={common(tables, (x) => x.seats)}
              min={1}
              max={MAX_SEATS}
              label={t("floorPlan.table.seats")}
              onChange={(seats) => onPatch({ seats })}
            />
          </Field>
          <SelectField<TableShape>
            compact
            label={t("floorPlan.table.shape")}
            value={common(tables, (x) => x.shape)}
            mixedLabel={mixed}
            onChange={(shape) => onPatch({ shape })}
            options={TABLE_SHAPES.map((value) => ({ value, label: shapeLabel(value, t) }))}
          />
          <SelectField<TableSize>
            compact
            label={t("floorPlan.table.size")}
            value={common(tables, (x) => x.size)}
            mixedLabel={mixed}
            onChange={(size) => onPatch({ size })}
            options={TABLE_SIZES.map((value) => ({ value, label: sizeLabel(value, t) }))}
          />
          <SelectField<TableArea>
            compact
            label={t("floorPlan.table.area")}
            value={common(tables, (x) => x.area)}
            mixedLabel={mixed}
            onChange={(area) => onPatch({ area })}
            options={TABLE_AREAS.map((value) => ({ value, label: areaLabel(value, t) }))}
          />
          <SelectField<SmokingPolicy>
            compact
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
            <TextAreaField
              compact
              label={t("floorPlan.table.note")}
              value={single.note}
              placeholder={t("floorPlan.table.notePlaceholder")}
              onChange={(note) => onPatch({ note })}
            />
          )}
          <div className="flex flex-col gap-3">
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
    </div>
  );
}
