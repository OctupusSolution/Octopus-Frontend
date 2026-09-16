// apps/merchant/src/pages/orders-list/_shared/csv-export.ts
import type { OrderRecord } from "./types";

function escapeCsvField(value: string): string {
  // Guard against formula injection: a field starting with =, +, -, @, tab,
  // or CR is evaluated as a live formula by Excel/Sheets on open. Prefixing
  // with a literal single quote forces the cell to be read as text. Table
  // numbers in particular come straight from customer input via
  // live-orders-bridge.ts, so they can't be trusted as plain text.
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[",\n]/.test(guarded)) return `"${guarded.replace(/"/g, '""')}"`;
  return guarded;
}

export function ordersToCsv(rows: readonly OrderRecord[]): string {
  const header = ["Order", "Date", "Table", "Guests", "Source", "Payment", "Status", "Total (SAR)"];
  const lines = rows.map((row) =>
    [
      row.id,
      row.date,
      row.table ?? "",
      row.guests != null ? String(row.guests) : "",
      row.source,
      row.payment,
      row.state,
      row.totalSar.toFixed(2),
    ]
      .map(escapeCsvField)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}
