// The Properties tab. Its content follows the selection: the plan itself when
// nothing is selected, the table inspector for tables, and size, position,
// rotation and stacking for everything else.
import { useEffect, useState, type ReactNode } from "react";
import { ArrowDownToLine, ArrowUpToLine, Copy, Keyboard, Lock, LockOpen, RotateCw, Trash2 } from "lucide-react";
import clsx from "clsx";
import {
  METERS_PER_UNIT,
  ZONE_COLORS,
  allItems,
  boundsOf,
  itemRect,
  reorderItem,
  resizeItem,
  round2,
  updateObject,
  updateTable,
  updateZone,
  zoneForTable,
  type FloorItem,
  type FloorObject,
  type FloorPlanDoc,
  type FloorTable,
  type FloorZone,
  type LiveStatus,
} from "@/entities/floor-plan";
import { ZONE_PALETTE } from "@/widgets/floor-plan-canvas";
import { useI18n } from "@/app/providers/i18n-provider";
import { Field, TextField } from "../../_shared/fields";
import { TableSettings } from "../_shared/table-settings";
import { itemIcon, itemName } from "./layers-panel";
import { SpotServerCard } from "./spot-server-card";

function MeterField({ label, units, onChange, min = 0, max }: { label: string; units: number; onChange: (units: number) => void; min?: number; max: number }) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? (units * METERS_PER_UNIT).toFixed(2);
  function commit() {
    if (text === null) return;
    const meters = Number(text.replace(",", "."));
    setText(null);
    if (!Number.isFinite(meters)) return;
    onChange(Math.min(max, Math.max(min, round2(meters / METERS_PER_UNIT))));
  }
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[12.5px] font-medium text-[var(--octo-text-secondary)]">{label}</span>
      <span className="relative">
        <input
          inputMode="decimal"
          value={shown}
          onChange={(event) => setText(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") (event.target as HTMLInputElement).blur();
            if (event.key === "Escape") setText(null);
          }}
          className="h-10 w-full rounded-[10px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] pe-7 ps-3 text-[13.5px] tabular-nums text-[var(--octo-text-primary)] focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/20"
          dir="ltr"
        />
        <span className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[var(--octo-text-muted)]">m</span>
      </span>
    </label>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return <h3 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{children}</h3>;
}

function ActionRow({
  item,
  onDuplicate,
  onDelete,
  onRotate,
  onToggleLock,
  onReorder,
}: {
  item: FloorItem | null;
  onDuplicate: () => void;
  onDelete: () => void;
  onRotate?: () => void;
  onToggleLock: () => void;
  onReorder?: (to: "front" | "back") => void;
}) {
  const { t } = useI18n();
  const locked = item?.locked ?? false;
  const button = "grid h-10 w-10 place-items-center rounded-[10px] border border-[var(--octo-border-input)] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)] disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={onDuplicate} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[10px] border border-[var(--octo-border-input)] text-[14px] font-medium text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]">
        <Copy size={16} />
        {t("floorPlan.tools.duplicate")}
      </button>
      {onRotate && (
        <button type="button" onClick={onRotate} className={button} title={`${t("floorPlan.tools.rotate")} (R)`} aria-label={t("floorPlan.tools.rotate")} disabled={locked}>
          <RotateCw size={16} />
        </button>
      )}
      {onReorder && (
        <>
          <button type="button" onClick={() => onReorder("front")} className={button} title={t("floorPlan.props.bringFront")} aria-label={t("floorPlan.props.bringFront")}>
            <ArrowUpToLine size={16} />
          </button>
          <button type="button" onClick={() => onReorder("back")} className={button} title={t("floorPlan.props.sendBack")} aria-label={t("floorPlan.props.sendBack")}>
            <ArrowDownToLine size={16} />
          </button>
        </>
      )}
      <button type="button" onClick={onToggleLock} className={button} title={`${locked ? t("floorPlan.tools.unlock") : t("floorPlan.tools.lock")} (L)`} aria-label={locked ? t("floorPlan.tools.unlock") : t("floorPlan.tools.lock")}>
        {locked ? <LockOpen size={16} /> : <Lock size={16} />}
      </button>
      <button type="button" onClick={onDelete} disabled={locked} className="grid h-10 w-10 place-items-center rounded-[10px] bg-[#FEE2E2] text-[#DC2626] hover:bg-[#FECACA] disabled:opacity-40" aria-label={t("floorPlan.tools.delete")} title={`${t("floorPlan.tools.delete")} (Del)`}>
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function Geometry({ doc, item, onDoc }: { doc: FloorPlanDoc; item: FloorObject | FloorZone; onDoc: (doc: FloorPlanDoc) => void }) {
  const { t } = useI18n();
  const rect = itemRect(item);
  const isWall = item.kind === "object" && (item.type === "wall" || item.type === "halfWall");
  const move = (patch: { x?: number; y?: number }) =>
    onDoc(item.kind === "zone" ? updateZone(doc, item.id, patch) : updateObject(doc, item.id, patch));
  return (
    <div className="grid grid-cols-2 gap-3">
      <MeterField label={isWall ? t("floorPlan.props.length") : t("floorPlan.props.width")} units={rect.w} min={0.25} max={doc.width - rect.x} onChange={(w) => onDoc(resizeItem(doc, item.id, { ...rect, w }))} />
      <MeterField label={isWall ? t("floorPlan.props.thickness") : t("floorPlan.props.height")} units={rect.h} min={0.1} max={doc.height - rect.y} onChange={(h) => onDoc(resizeItem(doc, item.id, { ...rect, h }))} />
      <MeterField label={t("floorPlan.props.x")} units={rect.x} max={doc.width - rect.w} onChange={(x) => move({ x })} />
      <MeterField label={t("floorPlan.props.y")} units={rect.y} max={doc.height - rect.h} onChange={(y) => move({ y })} />
    </div>
  );
}

const LABELLED = new Set(["text", "room", "bar"]);

export function PropertiesPanel({
  doc,
  items,
  toneFor,
  onDoc,
  onDuplicate,
  onDelete,
  onRotate,
  onToggleLock,
  toolShortcuts,
}: {
  doc: FloorPlanDoc;
  items: FloorItem[];
  toneFor: (table: FloorTable) => LiveStatus;
  onDoc: (doc: FloorPlanDoc) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRotate: () => void;
  onToggleLock: () => void;
  toolShortcuts: [string, string][];
}) {
  const { t } = useI18n();
  const [planName, setPlanName] = useState(doc.name);
  useEffect(() => setPlanName(doc.name), [doc.name]);

  if (items.length === 0) {
    const content = boundsOf(allItems(doc).map(itemRect));
    const minW = Math.max(12, Math.ceil(content ? content.x + content.w : 0));
    const minH = Math.max(12, Math.ceil(content ? content.y + content.h : 0));
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-xl bg-[var(--octo-soft-bg)] p-3 text-[13px] text-[var(--octo-text-secondary)]">{t("floorPlan.props.nothingSelected")}</p>
        <Heading>{t("floorPlan.props.plan")}</Heading>
        <TextField
          label={t("floorPlan.review.planName")}
          value={planName}
          maxLength={40}
          onChange={setPlanName}
          onBlur={() => {
            const trimmed = planName.trim();
            if (trimmed && trimmed !== doc.name) onDoc({ ...doc, name: trimmed });
            else setPlanName(doc.name);
          }}
        />
        <Field label={t("floorPlan.props.canvasSize")}>
          <div className="grid grid-cols-2 gap-3">
            <MeterField label={t("floorPlan.props.width")} units={doc.width} min={minW} max={160} onChange={(width) => onDoc({ ...doc, width: Math.round(width) })} />
            <MeterField label={t("floorPlan.props.height")} units={doc.height} min={minH} max={160} onChange={(height) => onDoc({ ...doc, height: Math.round(height) })} />
          </div>
          <p className="text-[12px] text-[var(--octo-text-muted)]">{t("floorPlan.props.canvasHint")}</p>
        </Field>
        <div className="rounded-xl border border-[var(--octo-border-card)] p-3.5">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-[var(--octo-text-primary)]">
            <Keyboard size={15} /> {t("floorPlan.tutorial.shortcuts")}
          </p>
          <dl className="mt-2 flex flex-col gap-1.5 text-[12.5px]">
            {toolShortcuts.map(([keys, label]) => (
              <div key={keys} className="flex items-center justify-between gap-2">
                <dt className="text-[var(--octo-text-secondary)]">{label}</dt>
                <dd dir="ltr">
                  <kbd className="rounded-md border border-[var(--octo-border-input)] bg-[var(--octo-soft-bg)] px-1.5 py-0.5 font-sans text-[11px] font-semibold text-[var(--octo-text-primary)]">{keys}</kbd>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    );
  }

  const tables = items.filter((item): item is FloorTable => item.kind === "table");
  if (tables.length === items.length) {
    return (
      <div className="flex flex-col gap-4">
        <TableSettings
          doc={doc}
          tables={tables}
          toneFor={toneFor}
          onPatch={(patch) => {
            let next = doc;
            for (const table of tables) next = updateTable(next, table.id, patch);
            onDoc(next);
          }}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onRotate={onRotate}
          onToggleLock={onToggleLock}
        />
        {tables.length === 1 && <SpotServerCard table={tables[0]} doc={doc} />}
      </div>
    );
  }

  if (items.length > 1) {
    return (
      <div className="flex flex-col gap-4">
        <Heading>{t("floorPlan.props.multi").replace("{n}", String(items.length))}</Heading>
        <ul className="flex flex-wrap gap-1.5">
          {items.map((item) => {
            const Icon = itemIcon(item);
            return (
              <li key={item.id} className="flex items-center gap-1.5 rounded-full bg-[var(--octo-soft-bg)] px-2.5 py-1 text-[12.5px] text-[var(--octo-text-secondary)]">
                <Icon size={13} />
                {itemName(item, t)}
              </li>
            );
          })}
        </ul>
        <ActionRow item={items.every((i) => i.locked) ? items[0] : null} onDuplicate={onDuplicate} onDelete={onDelete} onRotate={onRotate} onToggleLock={onToggleLock} />
      </div>
    );
  }

  const item = items[0];
  const Icon = itemIcon(item);

  if (item.kind === "zone") {
    const count = doc.tables.filter((table) => zoneForTable(doc, table)?.id === item.id).length;
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-[10px]" style={{ backgroundColor: ZONE_PALETTE[item.color].fill, color: ZONE_PALETTE[item.color].label }}>
            <Icon size={18} />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{t("floorPlan.props.zone")}</p>
            <p className="text-[12.5px] text-[var(--octo-text-muted)]">{t("floorPlan.props.tablesInZone").replace("{n}", String(count))}</p>
          </div>
        </div>
        <ZoneNameField zone={item} onRename={(name) => onDoc(updateZone(doc, item.id, { name }))} />
        <Field label={t("floorPlan.props.color")}>
          <div className="flex gap-2" role="radiogroup">
            {ZONE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                role="radio"
                aria-checked={item.color === color}
                aria-label={t(`floorPlan.zoneColor.${color}`)}
                title={t(`floorPlan.zoneColor.${color}`)}
                onClick={() => onDoc(updateZone(doc, item.id, { color }))}
                className={clsx("h-9 w-9 rounded-full border-2 transition-transform", item.color === color ? "scale-110 ring-2 ring-offset-2 ring-offset-[var(--octo-card)]" : "")}
                style={{ backgroundColor: ZONE_PALETTE[color].label, borderColor: ZONE_PALETTE[color].fill, ...(item.color === color ? { ["--tw-ring-color" as string]: ZONE_PALETTE[color].label } : {}) }}
              />
            ))}
          </div>
        </Field>
        <Geometry doc={doc} item={item} onDoc={onDoc} />
        <ActionRow item={item} onDuplicate={onDuplicate} onDelete={onDelete} onToggleLock={onToggleLock} onReorder={(to) => onDoc(reorderItem(doc, item.id, to))} />
      </div>
    );
  }

  const object = item as FloorObject;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-[var(--octo-soft-bg)] text-[var(--octo-text-secondary)]">
          <Icon size={18} />
        </span>
        <div>
          <p className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{t(`floorPlan.object.${object.type}`)}</p>
          <p className="text-[12.5px] text-[var(--octo-text-muted)]">{t("floorPlan.props.rotation").replace("{deg}", String(object.rotation))}</p>
        </div>
      </div>
      {LABELLED.has(object.type) && (
        <ObjectLabelField object={object} onChange={(label) => onDoc(updateObject(doc, object.id, { label }))} />
      )}
      <Geometry doc={doc} item={object} onDoc={onDoc} />
      <ActionRow item={object} onDuplicate={onDuplicate} onDelete={onDelete} onRotate={onRotate} onToggleLock={onToggleLock} onReorder={(to) => onDoc(reorderItem(doc, object.id, to))} />
    </div>
  );
}

function ZoneNameField({ zone, onRename }: { zone: FloorZone; onRename: (name: string) => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(zone.name);
  useEffect(() => setName(zone.name), [zone.id, zone.name]);
  return (
    <TextField
      label={t("floorPlan.props.zoneName")}
      value={name}
      maxLength={32}
      onChange={setName}
      onBlur={() => {
        const trimmed = name.trim();
        if (trimmed && trimmed !== zone.name) onRename(trimmed);
        else setName(zone.name);
      }}
    />
  );
}

function ObjectLabelField({ object, onChange }: { object: FloorObject; onChange: (label: string) => void }) {
  const { t } = useI18n();
  const [label, setLabel] = useState(object.label);
  useEffect(() => setLabel(object.label), [object.id, object.label]);
  return (
    <TextField
      label={object.type === "text" ? t("floorPlan.props.text") : t("floorPlan.props.label")}
      value={label}
      maxLength={40}
      onChange={setLabel}
      onBlur={() => {
        if (label !== object.label) onChange(label.trim());
      }}
    />
  );
}
