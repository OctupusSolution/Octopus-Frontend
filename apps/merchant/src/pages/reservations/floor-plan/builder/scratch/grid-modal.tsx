// "Generate table grid": the server lays out N numbered tables in rows and
// columns (skipping numbers already taken, growing the canvas if it must).
// Preview first (it creates nothing), then generate, and the new tables are
// added to the doc with their server ids so the next save only updates them.
import { useEffect, useMemo, useState } from "react";
import { Grid3x3, X } from "lucide-react";
import { Modal } from "@ui/primitives";
import {
  MAX_QUICK_TABLES,
  METERS_PER_UNIT,
  MAX_SEATS,
  generateGrid,
  previewGrid,
  tableRect,
  type FloorPlanDoc,
  type FloorTable,
  type GridOptions,
  type GridPreview,
  type TableShape,
} from "@/entities/floor-plan";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { useAdminText } from "../../_shared/admin-text";
import { errorText } from "../../_shared/api-error";
import { Field, NumberStepper, SelectField, TextField } from "../../_shared/fields";

/** Shapes that have a server size preset as well as a local drawing. */
const GRID_SHAPES: TableShape[] = ["square", "round", "rectangle", "long"];

function nextNumber(doc: FloorPlanDoc, prefix: string): number {
  const p = prefix.trim().toLowerCase();
  let max = 0;
  for (const table of doc.tables) {
    const n = table.number.trim().toLowerCase();
    if (!n.startsWith(p)) continue;
    const rest = Number(n.slice(p.length));
    if (Number.isInteger(rest)) max = Math.max(max, rest);
  }
  return max + 1;
}

export function GridModal({
  open,
  onClose,
  doc,
  onGenerated,
}: {
  open: boolean;
  onClose: () => void;
  doc: FloorPlanDoc;
  onGenerated: (tables: FloorTable[], grownTo: { width: number; height: number } | null) => void;
}) {
  const at = useAdminText();
  const { t } = useI18n();
  const { activeBusinessId } = useAuth();
  const [options, setOptions] = useState<GridOptions>(() => ({ count: 8, columns: 4, spacingMeters: 1.2, prefix: "T", startNumber: nextNumber(doc, "T"), shape: "square", seats: 4 }));
  const [spacingText, setSpacingText] = useState("1.2");
  const [preview, setPreview] = useState<GridPreview | null>(null);
  const [busy, setBusy] = useState<"preview" | "generate" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPreview(null);
    setError(null);
    setOptions((o) => ({ ...o, startNumber: nextNumber(doc, o.prefix) }));
    // Only on open: the start number follows the doc as it was then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const patch = (next: Partial<GridOptions>) => {
    setOptions((o) => ({ ...o, ...next }));
    setPreview(null);
  };

  async function runPreview() {
    if (!activeBusinessId) return;
    setBusy("preview");
    setError(null);
    try {
      setPreview(await previewGrid(activeBusinessId, doc, options));
    } catch (err) {
      setError(errorText(err, at));
    } finally {
      setBusy(null);
    }
  }

  async function runGenerate() {
    if (!activeBusinessId) return;
    setBusy("generate");
    setError(null);
    try {
      const result = await generateGrid(activeBusinessId, doc, options);
      onGenerated(result.tables, result.grownTo);
    } catch (err) {
      setError(errorText(err, at));
    } finally {
      setBusy(null);
    }
  }

  const frame = useMemo(() => {
    const width = Math.max(doc.width, preview?.grownTo?.width ?? 0);
    const height = Math.max(doc.height, preview?.grownTo?.height ?? 0);
    return { width, height };
  }, [doc.width, doc.height, preview]);

  return (
    <Modal open={open} onClose={onClose} className="flex max-h-[92vh] max-w-[640px] flex-col p-0">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--octo-border-card)] px-6 py-4">
        <div className="flex items-start gap-2.5">
          <Grid3x3 size={20} className="mt-0.5 text-[var(--octo-text-secondary)]" />
          <div>
            <h2 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">{at("grid.title")}</h2>
            <p className="mt-0.5 text-[12.5px] text-[var(--octo-text-secondary)]">{at("grid.body")}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label={at("common.close")} className="-me-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--octo-text-muted)] hover:bg-[var(--octo-hover)]">
          <X size={16} />
        </button>
      </div>

      <div className="octo-scroll min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={at("grid.count")}>
            <NumberStepper label={at("grid.count")} value={options.count} min={1} max={MAX_QUICK_TABLES} onChange={(count) => patch({ count })} />
          </Field>
          <Field label={at("grid.columns")}>
            <NumberStepper label={at("grid.columns")} value={options.columns} min={1} max={30} onChange={(columns) => patch({ columns })} />
          </Field>
          <SelectField
            label={at("grid.shape")}
            value={options.shape}
            onChange={(shape) => patch({ shape })}
            options={GRID_SHAPES.map((shape) => ({ value: shape, label: t(`floorPlan.shape.${shape}`) }))}
          />
          <Field label={at("grid.capacity")}>
            <NumberStepper label={at("grid.capacity")} value={options.seats} min={1} max={MAX_SEATS} onChange={(seats) => patch({ seats })} />
          </Field>
          <TextField label={at("grid.prefix")} value={options.prefix} maxLength={6} onChange={(prefix) => patch({ prefix })} />
          <Field label={at("grid.start")}>
            <NumberStepper label={at("grid.start")} value={options.startNumber} min={0} max={999} onChange={(startNumber) => patch({ startNumber })} />
          </Field>
          <TextField
            label={at("grid.spacing")}
            value={spacingText}
            inputMode="numeric"
            onChange={setSpacingText}
            onBlur={() => {
              const n = Number(spacingText.replace(",", "."));
              if (Number.isFinite(n) && n > 0) patch({ spacingMeters: Math.round(n * 100) / 100 });
              else setSpacingText(String(options.spacingMeters));
            }}
          />
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-[9px] bg-error/10 px-3 py-2 text-[12.5px] text-error">
            {error}
          </p>
        )}

        <div className="mt-4 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-soft-bg)] p-3">
          {!preview ? (
            <p className="py-6 text-center text-[12.5px] text-[var(--octo-text-muted)]">{at("grid.needPreview")}</p>
          ) : (
            <>
              <svg viewBox={`0 0 ${frame.width} ${frame.height}`} className="max-h-[240px] w-full rounded-lg bg-[var(--octo-card)]" role="img" aria-label={at("grid.planned", { n: preview.spots.length })}>
                <rect x={0} y={0} width={doc.width} height={doc.height} fill="none" stroke="#ececf0" strokeWidth={0.2} />
                {doc.tables.map((table) => {
                  const r = tableRect(table);
                  return <rect key={table.id} x={r.x} y={r.y} width={r.w} height={r.h} rx={0.4} fill="#e8e8ec" />;
                })}
                {preview.spots.map((spot) => (
                  <rect key={spot.code} x={spot.x} y={spot.y} width={spot.w} height={spot.h} rx={0.4} fill="#0D6EFD" fillOpacity={0.35} stroke="#0D6EFD" strokeWidth={0.15} />
                ))}
              </svg>
              <p className="mt-2 text-[12.5px] font-medium text-[var(--octo-text-primary)]">{at("grid.planned", { n: preview.spots.length })}</p>
              {preview.skipped.length > 0 && <p className="mt-0.5 text-[12px] text-[var(--octo-text-secondary)]">{at("grid.skipped", { list: preview.skipped.join(", ") })}</p>}
              {preview.grownTo && (
                <p className="mt-0.5 text-[12px] text-[#B45309]">
                  {at("grid.grows", { w: (preview.grownTo.width * METERS_PER_UNIT).toFixed(2), h: (preview.grownTo.height * METERS_PER_UNIT).toFixed(2) })}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-[var(--octo-border-card)] px-6 py-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void runPreview()}
          className="h-10 rounded-[9px] border border-[var(--octo-border-input)] px-4 text-[13px] font-medium text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)] disabled:opacity-50"
        >
          {busy === "preview" ? at("grid.previewing") : at("grid.preview")}
        </button>
        <button
          type="button"
          disabled={busy !== null || !preview}
          onClick={() => void runGenerate()}
          className="h-10 rounded-[9px] bg-[#0D6EFD] px-5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy === "generate" ? at("grid.generating") : at("grid.generate", { n: options.count })}
        </button>
      </div>
    </Modal>
  );
}
