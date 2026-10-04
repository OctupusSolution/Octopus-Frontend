// The Library tab: everything that can go on the plan. Click a tile to drop
// it in the middle of the view, or drag it to exactly where it belongs.
import { Children, useRef, useState, type DragEvent, type ReactNode } from "react";
import { FileText, ImageUp, Trash2 } from "lucide-react";
import clsx from "clsx";
import {
  OBJECT_PRESETS,
  ZONE_COLORS,
  createObject,
  createTable,
  defaultSeats,
  tableRect,
  type FloorBackground,
  type ObjectType,
  type TableShape,
  type ZoneColor,
} from "@/entities/floor-plan";
import { LIBRARY_MIME, ObjectGlyph, TableGlyph } from "@/widgets/floor-plan-canvas";
import { useI18n } from "@/app/providers/i18n-provider";
import { FLOOR_PLAN_ASSETS } from "@/shared/lib/floor-plan-assets";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { BORDER_300, TEXT_PRIMARY, TEXT_SEC_GRAY } from "../../../_shared/theme";
import { SCRATCH_ASSETS } from "./scratch-assets";

export type LibraryPayload =
  | { kind: "table"; shape: TableShape }
  | { kind: "object"; type: ObjectType }
  | { kind: "zone"; color: ZoneColor };

export const MAX_BACKGROUND_BYTES = 10 * 1024 * 1024;

const PREVIEW_TABLES = (["tabliya", "majlisL", "tent"] as const).map((shape) =>
  createTable("", 0, 0, { shape, size: "small", seats: defaultSeats(shape, "small") })
);

function TablePreview({ shape }: { shape: TableShape }) {
  const table = PREVIEW_TABLES.find((t) => t.shape === shape)!;
  const rect = tableRect(table);
  return (
    // Extra room right and below for the raised look's side face and shadow.
    <svg viewBox={`-0.2 -0.2 ${rect.w + 0.7} ${rect.h + 0.9}`} className="h-full w-full" aria-hidden>
      <TableGlyph table={table} tone="available" showLabel={false} ghost={false} px={0.06} />
    </svg>
  );
}

function ObjectPreview({ type }: { type: ObjectType }) {
  const preset = OBJECT_PRESETS[type];
  const object = createObject(type, 0, 0);
  const pad = Math.max(preset.w, preset.h) * 0.08;
  return (
    <svg viewBox={`${-pad} ${-pad - (preset.h < 1 ? 0.6 : 0)} ${preset.w + pad * 2 + 0.3} ${preset.h + pad * 2 + 0.5 + (preset.h < 1 ? 1.2 : 0)}`} className="h-full w-full" aria-hidden>
      <ObjectGlyph object={object} px={0.05} showLabel={false} />
    </svg>
  );
}

// The frame's own thumbnail artwork. Drawn left-to-right whatever the page
// direction — these are pictures, not layout.
const CHAIR = "h-[10px] w-[7px] border border-[#0f172a] bg-[#b8e8b8]";
const SWING = "rounded-t-[20px] border-x border-t border-[#2e0040]";

const TABLE_ART: Record<"round" | "square" | "rectangle" | "long", ReactNode> = {
  round: <img src={SCRATCH_ASSETS.round} alt="" className="aspect-[41/39] w-full" />,
  square: <span className="h-[33px] w-full rounded border border-black bg-[#9cd09c]" />,
  rectangle: <span className="h-[26px] w-full rounded border border-black bg-[#9cd09c]" />,
  long: (
    <span dir="ltr" className="relative block h-6 w-[32.8px] shrink-0">
      <span className="absolute start-[3.9px] top-[-1px] flex gap-[2px]">
        <span className={`${CHAIR} rounded-t-[2px]`} />
        <span className={`${CHAIR} rounded-t-[2px]`} />
        <span className={`${CHAIR} rounded-t-[2px]`} />
      </span>
      <span className="absolute start-[3.9px] top-[15px] flex gap-[2px]">
        <span className={`${CHAIR} rounded-b-[2px]`} />
        <span className={`${CHAIR} rounded-b-[2px]`} />
        <span className={`${CHAIR} rounded-b-[2px]`} />
      </span>
      <span className="absolute start-0 top-[4.8px] h-[15.2px] w-[32.8px] rounded-[2px] border border-black bg-[#94c794]" />
    </span>
  ),
};

const OBJECT_ART: Partial<Record<ObjectType, ReactNode>> = {
  chair: <span className="h-[26px] w-full rounded bg-[#9cd09c]" />,
  armchair: (
    <span dir="ltr" className="relative block aspect-[274/275] w-full overflow-hidden">
      <img src={SCRATCH_ASSETS.seating} alt="" className="absolute start-[-42.34%] top-[-54.91%] h-[208%] w-[373.72%] max-w-none" />
    </span>
  ),
  sofa: (
    <span dir="ltr" className="relative block aspect-[346/285] w-full overflow-hidden">
      <img src={SCRATCH_ASSETS.seating} alt="" className="absolute start-[-155.78%] top-[-49.82%] h-[200.7%] w-[295.95%] max-w-none" />
    </span>
  ),
  wall: <span className="h-2 w-8 shrink-0 border border-[#370202] bg-[#705e5e]" />,
  halfWall: <span className="h-1 w-8 shrink-0 border border-[#370202] bg-[#705e5e]" />,
  door: <span className={`h-[19px] w-[31.9px] shrink-0 ${SWING}`} />,
  doubleDoor: (
    <span className="flex shrink-0 items-center">
      <span className={`h-[9px] w-[15px] ${SWING}`} />
      <span className={`h-[9px] w-[15px] ${SWING}`} />
    </span>
  ),
  plantSmall: (
    <span className="flex h-[14px] w-[18.45px] shrink-0 items-center justify-center">
      <img src={SCRATCH_ASSETS.plantSmall} alt="" className="h-[18.45px] w-[14px] max-w-none flex-none rotate-90" />
    </span>
  ),
  plantLarge: (
    <span className="flex h-6 w-[31.64px] shrink-0 items-center justify-center">
      <img src={SCRATCH_ASSETS.plantLarge} alt="" className="h-[31.64px] w-6 max-w-none flex-none rotate-90" />
    </span>
  ),
  planterBox: (
    <span dir="ltr" className="relative block h-[11px] w-[32.57px] shrink-0">
      <span className="absolute start-0 top-0 flex h-[11px] w-[14.5px] items-center justify-center">
        <img src={SCRATCH_ASSETS.planter1} alt="" className="h-[14.5px] w-[11px] max-w-none flex-none rotate-90" />
      </span>
      <span className="absolute start-[8.64px] top-0 flex h-[11px] w-[14.5px] items-center justify-center">
        <img src={SCRATCH_ASSETS.planter2} alt="" className="h-[14.5px] w-[11px] max-w-none flex-none rotate-90" />
      </span>
      <span className="absolute start-[18.07px] top-0 flex h-[11px] w-[14.5px] items-center justify-center">
        <img src={SCRATCH_ASSETS.planter3} alt="" className="h-[14.5px] w-[11px] max-w-none flex-none rotate-90" />
      </span>
    </span>
  ),
  tree: <img src={SCRATCH_ASSETS.tree} alt="" className="h-[27.14px] w-[22.28px] max-w-none shrink-0" />,
  bar: <img src={FLOOR_PLAN_ASSETS.bar} alt="" className="aspect-[178/92] w-full" />,
  counter: <img src={FLOOR_PLAN_ASSETS.counter} alt="" className="h-[17px] w-[30px] shrink-0" />,
  hostStand: <img src={FLOOR_PLAN_ASSETS.hostStand} alt="" className="h-[33px] w-[30px] max-w-none shrink-0" />,
  station: <img src={FLOOR_PLAN_ASSETS.station} alt="" className="h-5 w-[30px] shrink-0" />,
};

// The frame's swatches — page chrome, so they follow the design rather than
// the palette the plan itself is drawn with.
const ZONE_SWATCH: Record<ZoneColor, { fill: string; border: string }> = {
  blue: { fill: "#eef1fd", border: "#0d6efd" },
  violet: { fill: "#fcf6ff", border: "#9002cd" },
  amber: { fill: "#fffbf6", border: "#d79900" },
  green: { fill: "#f6fef0", border: "#009a39" },
  slate: { fill: "#f1f5f9", border: "#a1a6b0" },
};

const SECTION_TITLE = `text-[14px] font-medium leading-[14px] ${TEXT_PRIMARY}`;
const PER_ROW = 4;

function Tile({ payload, label, children, onAdd }: { payload: LibraryPayload; label: string; children: ReactNode; onAdd: (payload: LibraryPayload) => void }) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(event: DragEvent) => {
        event.dataTransfer.setData(LIBRARY_MIME, JSON.stringify(payload));
        event.dataTransfer.effectAllowed = "copy";
      }}
      onClick={() => onAdd(payload)}
      title={label}
      className="group flex shrink-0 flex-col items-center justify-center gap-1"
    >
      {/* White in both themes: the artwork is drawn for the plan's paper. */}
      <span
        className={`relative flex h-12 w-[41px] shrink-0 flex-col items-center justify-center rounded border-[0.5px] bg-white px-1 py-2 outline-1 -outline-offset-1 outline-[#0d6efd] group-hover:outline group-focus-visible:outline ${BORDER_300}`}
      >
        {children}
      </span>
      <span className={`whitespace-nowrap text-center text-[10px] font-medium leading-[10px] ${TEXT_PRIMARY}`}>{label}</span>
    </button>
  );
}

/** Tiles four to a row, spread edge to edge as the frame has them; a shorter
 *  last row keeps the frame's 16px gap instead of stretching. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  const tiles = Children.toArray(children);
  const rows: ReactNode[][] = [];
  for (let i = 0; i < tiles.length; i += PER_ROW) rows.push(tiles.slice(i, i + PER_ROW));
  return (
    <section className="flex flex-col gap-3">
      <h3 className={SECTION_TITLE}>{title}</h3>
      {rows.map((row, index) => (
        <div key={index} className={row.length === PER_ROW ? "flex items-start justify-between" : "flex items-start gap-4"}>
          {row}
        </div>
      ))}
    </section>
  );
}

export function LibraryPanel({
  onAdd,
  background,
  onBackgroundFile,
  onBackgroundOpacity,
  onRemoveBackground,
}: {
  onAdd: (payload: LibraryPayload) => void;
  background: FloorBackground | null;
  onBackgroundFile: (file: File) => void;
  onBackgroundOpacity: (opacity: number) => void;
  onRemoveBackground: () => void;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [opacity, setOpacity] = useState<number | null>(null);

  const objectTile = (type: ObjectType) => (
    <Tile key={type} payload={{ kind: "object", type }} label={t(`floorPlan.object.${type}`)} onAdd={onAdd}>
      {OBJECT_ART[type] ?? <ObjectPreview type={type} />}
    </Tile>
  );

  return (
    <div className="flex flex-col gap-4">
      <Section title={t("floorPlan.library.tables")}>
        {(["round", "square", "rectangle", "long"] as const).map((shape) => (
          <Tile key={shape} payload={{ kind: "table", shape }} label={t(`floorPlan.shape.${shape}`)} onAdd={onAdd}>
            {TABLE_ART[shape]}
          </Tile>
        ))}
      </Section>

      <Section title={t("floorPlan.library.seating")}>{(["chair", "armchair", "sofa"] as const).map(objectTile)}</Section>

      {/* No artwork in the frame for these — they keep the plan's own glyphs. */}
      <Section title={t("floorPlan.library.majlis")}>
        {(["tabliya", "majlisL", "tent"] as const).map((shape) => (
          <Tile key={shape} payload={{ kind: "table", shape }} label={t(`floorPlan.shape.${shape}`)} onAdd={onAdd}>
            <TablePreview shape={shape} />
          </Tile>
        ))}
        {objectTile("majlisFloor")}
      </Section>

      <Section title={t("floorPlan.library.walls")}>{(["wall", "halfWall", "door", "doubleDoor"] as const).map(objectTile)}</Section>
      <Section title={t("floorPlan.library.decor")}>{(["plantSmall", "plantLarge", "planterBox", "tree"] as const).map(objectTile)}</Section>
      <Section title={t("floorPlan.library.bars")}>{(["bar", "counter", "hostStand", "station"] as const).map(objectTile)}</Section>

      <section className="flex flex-col gap-3">
        <h3 className={SECTION_TITLE}>{t("floorPlan.library.zones")}</h3>
        <div className="flex items-center justify-between">
          {ZONE_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData(LIBRARY_MIME, JSON.stringify({ kind: "zone", color } satisfies LibraryPayload));
                event.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => onAdd({ kind: "zone", color })}
              title={t(`floorPlan.zoneColor.${color}`)}
              aria-label={`${t("floorPlan.library.addZone")} — ${t(`floorPlan.zoneColor.${color}`)}`}
              className="h-10 w-10 shrink-0 rounded border border-dashed transition-transform hover:scale-[1.04]"
              style={{ backgroundColor: ZONE_SWATCH[color].fill, borderColor: ZONE_SWATCH[color].border }}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className={SECTION_TITLE}>{t("floorPlan.library.background")}</h3>
        {background ? (
          <div className={`rounded-xl border p-2 ${BORDER_300}`}>
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-[var(--octo-soft-bg)] text-[var(--octo-text-secondary)]">
                {background.mime.startsWith("image/") ? <img src={background.dataUrl} alt="" className="h-full w-full object-cover" /> : <FileText size={18} />}
              </span>
              <span className={`min-w-0 flex-1 truncate text-[12px] font-medium ${TEXT_PRIMARY}`}>{background.fileName}</span>
              <button
                type="button"
                onClick={onRemoveBackground}
                aria-label={t("floorPlan.library.removeBackground")}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--octo-text-muted)] hover:bg-[#FEE2E2] hover:text-[#DC2626]"
              >
                <Trash2 size={15} />
              </button>
            </div>
            <label className={`mt-3 flex items-center gap-2 text-[12px] ${TEXT_SEC_GRAY}`}>
              {t("floorPlan.library.opacity")}
              <input
                type="range"
                min={5}
                max={100}
                value={Math.round((opacity ?? background.opacity) * 100)}
                onChange={(event) => setOpacity(Number(event.target.value) / 100)}
                onPointerUp={() => {
                  if (opacity !== null) onBackgroundOpacity(opacity);
                  setOpacity(null);
                }}
                onKeyUp={() => {
                  if (opacity !== null) onBackgroundOpacity(opacity);
                  setOpacity(null);
                }}
                className="min-w-0 flex-1 accent-[#0D6EFD]"
              />
              <span className="w-8 text-end tabular-nums">{Math.round((opacity ?? background.opacity) * 100)}%</span>
            </label>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={`mt-3 flex h-[34px] w-full items-center justify-center gap-1 rounded-lg border text-[12px] font-medium hover:bg-[#f8fafc] [[data-theme=dark]_&]:hover:bg-[var(--octo-hover)] ${BORDER_300} ${TEXT_PRIMARY}`}
            >
              <ImageUp size={15} />
              {t("floorPlan.library.replaceBackground")}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              const file = event.dataTransfer.files[0];
              if (file) onBackgroundFile(file);
            }}
            className={clsx(
              "flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-2 text-center transition-colors",
              TEXT_SEC_GRAY,
              dragOver ? "border-[#0d6efd] bg-[#f5f9ff] [[data-theme=dark]_&]:bg-[var(--octo-selected)]" : `${BORDER_300} hover:border-[#0d6efd]`
            )}
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center">
              <ShellIcon name="fp-scratch-upload.svg" size={21.5} />
            </span>
            <span className="max-w-[150px] text-[12px] leading-[1.4]">{t("floorPlan.library.uploadHint")}</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,application/pdf"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onBackgroundFile(file);
            event.target.value = "";
          }}
        />
      </section>
    </div>
  );
}
