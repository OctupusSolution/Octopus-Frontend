// Printing and exporting place codes. The backend requires the print run to
// be recorded before any symbol or bundle is fetched for it.
import { getPlaceCodeBundle, recordPlaceCodePrintRun } from "@octopus/api-client";
import type { FloorPlanDoc, FloorTable } from "@/entities/floor-plan";
import { isSymbolCached, symbolSvg } from "./parts";
import { chunkGuard, errorKey, oneAtATime } from "./place-codes-model";
import { openPrintWindow, writeTents, type QrDesign } from "./print";
import { downloadBlob } from "./qr-store";
import type { Notify, PlaceCodesState } from "./use-place-codes";

/** Symbols are rate limited at 30/min per user; when a print would need more
 *  new symbol requests than this, it hands over the ZIP bundle instead. */
const PRINT_WINDOW_LIMIT = 20;

function withCodes(pc: PlaceCodesState, tables: readonly FloorTable[]) {
  return tables.flatMap((table) => {
    const row = pc.rows.get(table.id);
    return row?.codeId ? [{ table, codeId: row.codeId, version: row.version }] : [];
  });
}

async function exportNow(
  pc: PlaceCodesState,
  tables: readonly FloorTable[],
  t: (k: string) => string,
  notify: Notify,
  format: "svg" | "png"
): Promise<void> {
  const ids = withCodes(pc, tables).map((i) => i.codeId);
  if (ids.length === 0) return;
  if (!chunkGuard(ids.length)) return notify(t("floorPlan.qr.error.selectionTooLarge"), "error");
  let recorded = false;
  try {
    const run = await pc.run((b) => recordPlaceCodePrintRun(b, { codeIds: ids, format, purpose: "export" }));
    recorded = true;
    const { blob, fileName } = await getPlaceCodeBundle(pc.businessId, run.runId);
    downloadBlob(fileName ?? `table-qr-codes-${run.runId.slice(0, 8)}.zip`, blob);
  } catch (e) {
    // run() toasts its own failure; the download failing after it does not.
    if (recorded) notify(`${t(errorKey(e))} ${t("floorPlan.qr.recordedNotDelivered")}`, "error");
  }
}

async function printNow(
  pc: PlaceCodesState,
  doc: FloorPlanDoc,
  tables: readonly FloorTable[],
  design: QrDesign,
  t: (k: string) => string,
  notify: Notify
): Promise<void> {
  const items = withCodes(pc, tables);
  if (items.length === 0) return;
  if (!chunkGuard(items.length)) return notify(t("floorPlan.qr.error.selectionTooLarge"), "error");
  const uncached = items.filter((i) => !isSymbolCached(pc.businessId, i.codeId, i.version)).length;
  if (uncached > PRINT_WINDOW_LIMIT) {
    notify(t("floorPlan.qr.printAsZip"), "info");
    return exportNow(pc, tables, t, notify, "svg");
  }
  const win = openPrintWindow();
  if (!win) return notify(t("floorPlan.qr.popupBlocked"), "error");
  let recorded = false;
  try {
    await pc.run((b) => recordPlaceCodePrintRun(b, { codeIds: items.map((i) => i.codeId), format: "svg", purpose: "print" }));
    recorded = true;
    const svgs = await Promise.all(items.map((i) => symbolSvg(pc.businessId, i.codeId, i.version)));
    writeTents(win, doc, items.map((i, n) => ({ table: i.table, svg: svgs[n] })), design, t);
  } catch (e) {
    win.close();
    if (recorded) notify(`${t(errorKey(e))} ${t("floorPlan.qr.recordedNotDelivered")}`, "error");
  }
}

// One print or export at a time for the whole page: a double click must not
// record two runs or spend the symbol rate limit twice.
const guarded = oneAtATime(async (job: () => Promise<void>) => job());

export function printCodes(
  pc: PlaceCodesState,
  doc: FloorPlanDoc,
  tables: readonly FloorTable[],
  design: QrDesign,
  t: (k: string) => string,
  notify: Notify
): Promise<void> {
  return guarded(() => printNow(pc, doc, tables, design, t, notify));
}

export function exportCodes(
  pc: PlaceCodesState,
  tables: readonly FloorTable[],
  t: (k: string) => string,
  notify: Notify,
  format: "svg" | "png" = "svg"
): Promise<void> {
  return guarded(() => exportNow(pc, tables, t, notify, format));
}
