// The Library tab: everything that can go on the plan. Click a tile to drop
// it in the middle of the view, or drag it to exactly where it belongs.
import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { FileText, ImageUp, Trash2, Upload } from "lucide-react";
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
import { LIBRARY_MIME, ObjectGlyph, TableGlyph, ZONE_PALETTE } from "@/widgets/floor-plan-canvas";
import { useI18n } from "@/app/providers/i18n-provider";

export type LibraryPayload =
  | { kind: "table"; shape: TableShape }
  | { kind: "object"; type: ObjectType }
  | { kind: "zone"; color: ZoneColor };

export const MAX_BACKGROUND_BYTES = 10 * 1024 * 1024;

const PREVIEW_TABLES = (["round", "square", "rectangle", "long", "tabliya", "majlisL", "tent"] as const).map((shape) =>
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
      className="group flex min-w-0 flex-col items-center gap-1.5"
    >
      {/* White in both themes: the previews are drawn for the plan's paper,
          and a dark tile swallowed the wall and turned the doors into blobs. */}
      <span className="grid h-[58px] w-full place-items-center rounded-lg border border-[var(--octo-border-card)] bg-white p-2 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-colors group-hover:border-[#0D6EFD] group-focus-visible:border-[#0D6EFD]">
        {children}
      </span>
      <span className="w-full truncate text-center text-[12px] text-[var(--octo-text-primary)]">{label}</span>
    </button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-[16px] font-medium text-[var(--octo-text-primary)]">{title}</h3>
      <div className="mt-2.5 grid grid-cols-4 gap-2.5">{children}</div>
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

  return (
    <div className="flex flex-col gap-5">
      <Section title={t("floorPlan.library.tables")}>
        <Tile payload={{ kind: "table", shape: "round" }} label={t("floorPlan.shape.round")} onAdd={onAdd}>
          <TablePreview shape="round" />
        </Tile>
        <Tile payload={{ kind: "table", shape: "square" }} label={t("floorPlan.shape.square")} onAdd={onAdd}>
          <TablePreview shape="square" />
        </Tile>
        <Tile payload={{ kind: "table", shape: "rectangle" }} label={t("floorPlan.shape.rectangle")} onAdd={onAdd}>
          <TablePreview shape="rectangle" />
        </Tile>
        <Tile payload={{ kind: "table", shape: "long" }} label={t("floorPlan.shape.long")} onAdd={onAdd}>
          <TablePreview shape="long" />
        </Tile>
      </Section>

      <Section title={t("floorPlan.library.seating")}>
        {(["chair", "armchair", "sofa"] as const).map((type) => (
          <Tile key={type} payload={{ kind: "object", type }} label={t(`floorPlan.object.${type}`)} onAdd={onAdd}>
            <ObjectPreview type={type} />
          </Tile>
        ))}
      </Section>

      <Section title={t("floorPlan.library.majlis")}>
        <Tile payload={{ kind: "table", shape: "tabliya" }} label={t("floorPlan.shape.tabliya")} onAdd={onAdd}>
          <TablePreview shape="tabliya" />
        </Tile>
        <Tile payload={{ kind: "table", shape: "majlisL" }} label={t("floorPlan.shape.majlisL")} onAdd={onAdd}>
          <TablePreview shape="majlisL" />
        </Tile>
        <Tile payload={{ kind: "table", shape: "tent" }} label={t("floorPlan.shape.tent")} onAdd={onAdd}>
          <TablePreview shape="tent" />
        </Tile>
        <Tile payload={{ kind: "object", type: "majlisFloor" }} label={t("floorPlan.object.majlisFloor")} onAdd={onAdd}>
          <ObjectPreview type="majlisFloor" />
        </Tile>
      </Section>

      <Section title={t("floorPlan.library.walls")}>
        {(["wall", "halfWall", "door", "doubleDoor"] as const).map((type) => (
          <Tile key={type} payload={{ kind: "object", type }} label={t(`floorPlan.object.${type}`)} onAdd={onAdd}>
            <ObjectPreview type={type} />
          </Tile>
        ))}
      </Section>

      <Section title={t("floorPlan.library.decor")}>
        {(["plantSmall", "plantLarge", "planterBox", "tree"] as const).map((type) => (
          <Tile key={type} payload={{ kind: "object", type }} label={t(`floorPlan.object.${type}`)} onAdd={onAdd}>
            <ObjectPreview type={type} />
          </Tile>
        ))}
      </Section>

      <Section title={t("floorPlan.library.bars")}>
        {(["bar", "counter", "hostStand", "station"] as const).map((type) => (
          <Tile key={type} payload={{ kind: "object", type }} label={t(`floorPlan.object.${type}`)} onAdd={onAdd}>
            <ObjectPreview type={type} />
          </Tile>
        ))}
      </Section>

      <section>
        <h3 className="text-[16px] font-medium text-[var(--octo-text-primary)]">{t("floorPlan.library.zones")}</h3>
        <div className="mt-2.5 grid grid-cols-5 gap-2">
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
              className="h-11 rounded-md border-[1.5px] border-dashed transition-transform hover:scale-[1.04]"
              style={{ backgroundColor: ZONE_PALETTE[color].fill, borderColor: ZONE_PALETTE[color].label }}
            />
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-[16px] font-medium text-[var(--octo-text-primary)]">{t("floorPlan.library.background")}</h3>
        {background ? (
          <div className="mt-2.5 rounded-xl border border-[var(--octo-border-card)] p-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-[var(--octo-soft-bg)] text-[var(--octo-text-secondary)]">
                {background.mime.startsWith("image/") ? <img src={background.dataUrl} alt="" className="h-full w-full object-cover" /> : <FileText size={18} />}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--octo-text-primary)]">{background.fileName}</span>
              <button
                type="button"
                onClick={onRemoveBackground}
                aria-label={t("floorPlan.library.removeBackground")}
                className="grid h-8 w-8 place-items-center rounded-lg text-[var(--octo-text-muted)] hover:bg-[#FEE2E2] hover:text-[#DC2626]"
              >
                <Trash2 size={15} />
              </button>
            </div>
            <label className="mt-3 flex items-center gap-3 text-[12.5px] text-[var(--octo-text-secondary)]">
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
                className="flex-1 accent-[#0D6EFD]"
              />
              <span className="w-9 text-end tabular-nums">{Math.round((opacity ?? background.opacity) * 100)}%</span>
            </label>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[var(--octo-border-input)] text-[12.5px] font-medium text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
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
              "mt-2.5 flex w-full flex-col items-center gap-2 rounded-xl border-[1.5px] border-dashed px-4 py-5 text-center transition-colors",
              dragOver ? "border-[#0D6EFD] bg-[#0D6EFD]/5" : "border-[var(--octo-border-input)] hover:border-[#0D6EFD]/60"
            )}
          >
            <Upload size={24} strokeWidth={1.5} className="text-[var(--octo-text-secondary)]" />
            <span className="text-[13px] leading-snug text-[var(--octo-text-secondary)]">{t("floorPlan.library.uploadHint")}</span>
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
