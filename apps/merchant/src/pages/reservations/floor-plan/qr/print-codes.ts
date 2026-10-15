// Printing and exporting place codes. The backend requires the print run to
// be recorded before any symbol or bundle is fetched for it.
import { getPlaceCodeBundle, getPlaceCodeSymbol, recordPlaceCodePrintRun } from "@octopus/api-client";
import type { FloorPlanDoc, FloorTable } from "@/entities/floor-plan";
import { chunkGuard, errorKey } from "./place-codes-model";
import { openPrintWindow, writeTents, type QrDesign } from "./print";
import { downloadBlob } from "./qr-store";
import type { Notify, PlaceCodesState } from "./use-place-codes";

/** Symbols are rate limited at 30/min per user; past this many, printing
 *  hands over the ZIP bundle instead of fetching one symbol per card. */
const PRINT_WINDOW_LIMIT = 25;

function withCodes(pc: PlaceCodesState, tables: readonly FloorTable[]): { table: FloorTable; codeId: string }[] {
  return tables.flatMap((table) => {
    const codeId = pc.rows.get(table.id)?.codeId;
    return codeId ? [{ table, codeId }] : [];
  });
}

export async function exportCodes(
  pc: PlaceCodesState,
  tables: readonly FloorTable[],
  t: (k: string) => string,
  notify: Notify,
  format: "svg" | "png" = "svg"
): Promise<void> {
  const ids = withCodes(pc, tables).map((i) => i.codeId);
  if (ids.length === 0) return;
  if (!chunkGuard(ids.length)) return notify(t("floorPlan.qr.error.selectionTooLarge"), "error");
  try {
    const run = await pc.run((b) => recordPlaceCodePrintRun(b, { codeIds: ids, format, purpose: "export" }));
    const { blob, fileName } = await getPlaceCodeBundle(pc.businessId, run.runId);
    downloadBlob(fileName ?? `table-qr-codes-${run.runId.slice(0, 8)}.zip`, blob);
  } catch {
    // run() has already said why.
  }
}

export async function printCodes(
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
  if (items.length > PRINT_WINDOW_LIMIT) {
    notify(t("floorPlan.qr.printManyHint"), "info");
    return exportCodes(pc, tables, t, notify);
  }
  const win = openPrintWindow();
  if (!win) return notify(t("floorPlan.qr.popupBlocked"), "error");
  let recorded = false;
  try {
    await pc.run((b) => recordPlaceCodePrintRun(b, { codeIds: items.map((i) => i.codeId), format: "svg", purpose: "print" }));
    recorded = true;
    const svgs = await Promise.all(
      items.map(async (i) => (await getPlaceCodeSymbol(pc.businessId, i.codeId, "svg")).blob.text())
    );
    writeTents(win, doc, items.map((i, n) => ({ table: i.table, svg: svgs[n] })), design, t);
  } catch (e) {
    win.close();
    // run() toasts its own failure; a symbol fetch failing after it does not.
    if (recorded) notify(t(errorKey(e)), "error");
  }
}
