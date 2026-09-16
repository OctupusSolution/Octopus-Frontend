// apps/merchant/src/pages/orders-list/_shared/csv-export.ts
import type { OrderRecord } from "./types";

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
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
