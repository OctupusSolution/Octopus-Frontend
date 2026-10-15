// Table QR codes: which tables have a code, its id and its print history.
// There is no QR endpoint behind this build yet, so the record lives in this
// browser per tenant, the same way the floor plan keeps its local copy.
import { useCallback, useSyncExternalStore } from "react";
import { useTenantConfig } from "@/app/providers/tenant-config-provider";
import { encodeQr } from "../../../public-link/ui/qr-encode";

export type QrStatus = "active" | "reprint" | "notGenerated" | "disabled";
export const QR_STATUSES: readonly QrStatus[] = ["active", "reprint", "notGenerated", "disabled"];

export interface TableQr {
  code: string;
  disabled: boolean;
  /** Set when the code changed after the last print, so the sticker on the table is stale. */
  needsReprint: boolean;
  generatedAt: number;
  lastPrintedAt: number | null;
  printedCount: number;
  scans: number;
  firstScanAt: number | null;
  lastScanAt: number | null;
}

export type QrRecord = Record<string, TableQr>;

const EMPTY: QrRecord = {};
const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: QrRecord }>();

const storageKey = (tenantId: string) => `octo.tableQr.${tenantId}`;

function read(tenantId: string): QrRecord {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(storageKey(tenantId));
  } catch {
    raw = null;
  }
  const hit = cache.get(tenantId);
  if (hit && hit.raw === raw) return hit.value;
  let value = EMPTY;
  try {
    value = raw ? (JSON.parse(raw) as QrRecord) : EMPTY;
  } catch {
    value = EMPTY;
  }
  cache.set(tenantId, { raw, value });
  return value;
}

function write(tenantId: string, next: QrRecord) {
  try {
    localStorage.setItem(storageKey(tenantId), JSON.stringify(next));
  } catch {
    cache.set(tenantId, { raw: null, value: next });
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function statusOf(qr: TableQr | undefined): QrStatus {
  if (!qr) return "notGenerated";
  if (qr.disabled) return "disabled";
  return qr.needsReprint ? "reprint" : "active";
}

function newCode(tableNumber: string): string {
  const tail = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `QR-T${tableNumber.replace(/[^A-Za-z0-9]/g, "").slice(0, 6)}-${tail}`;
}

const ORIGIN = ((import.meta.env.VITE_PUBLIC_SITE_DEV_ORIGIN as string | undefined) || "https://octopus.app").replace(/\/$/, "");

/** What the printed code opens: the customer app's table scan screen. */
export function qrValue(code: string): string {
  return `${ORIGIN}/table/scan?q=${encodeURIComponent(code)}`;
}

/** The code as a standalone SVG file (dark on white, quiet zone included). */
export function qrSvgMarkup(code: string, size = 512): string {
  let matrix: boolean[][];
  try {
    matrix = encodeQr(qrValue(code));
  } catch {
    return "";
  }
  const q = 4;
  const n = matrix.length + q * 2;
  let path = "";
  matrix.forEach((row, r) => row.forEach((dark, c) => (path += dark ? `M${c} ${r}h1v1h-1z` : "")));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="-${q} -${q} ${n} ${n}" shape-rendering="crispEdges"><rect x="-${q}" y="-${q}" width="${n}" height="${n}" fill="#ffffff"/><path d="${path}" fill="#16161d"/></svg>`;
}

export function downloadFile(name: string, content: string, mime = "image/svg+xml") {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function useTableQr() {
  const { activeTenantId } = useTenantConfig();
  const tenantId = activeTenantId ?? "default";
  const record = useSyncExternalStore(subscribe, () => read(tenantId), () => EMPTY);

  const update = useCallback(
    (fn: (current: QrRecord) => QrRecord): QrRecord => {
      const next = fn(read(tenantId));
      write(tenantId, next);
      return next;
    },
    [tenantId]
  );

  /** Gives each table a code (keeping existing ones unless `fresh`). */
  const generate = useCallback(
    (tables: readonly { id: string; number: string }[], fresh = false) =>
      update((current) => {
        const next = { ...current };
        const now = Date.now();
        for (const t of tables) {
          const existing = next[t.id];
          if (existing && !fresh) {
            next[t.id] = { ...existing, disabled: false };
            continue;
          }
          next[t.id] = {
            code: newCode(t.number),
            disabled: false,
            needsReprint: existing ? existing.printedCount > 0 : false,
            generatedAt: now,
            lastPrintedAt: existing?.lastPrintedAt ?? null,
            printedCount: existing?.printedCount ?? 0,
            scans: 0,
            firstScanAt: null,
            lastScanAt: null,
          };
        }
        return next;
      }),
    [update]
  );

  const markPrinted = useCallback(
    (ids: readonly string[]) =>
      update((current) => {
        const next = { ...current };
        const now = Date.now();
        for (const id of ids) {
          const qr = next[id];
          if (qr) next[id] = { ...qr, needsReprint: false, lastPrintedAt: now, printedCount: qr.printedCount + 1 };
        }
        return next;
      }),
    [update]
  );

  const setDisabled = useCallback(
    (id: string, disabled: boolean) =>
      update((current) => (current[id] ? { ...current, [id]: { ...current[id], disabled } } : current)),
    [update]
  );

  return { record, generate, markPrinted, setDisabled };
}
