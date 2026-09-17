// apps/merchant/src/pages/customers/_shared/csv-export.ts
import { customerName } from "./format";
import type { CustomerRecord } from "./types";

function escapeCsvField(value: string): string {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[",\n]/.test(guarded)) return `"${guarded.replace(/"/g, '""')}"`;
  return guarded;
}

export function customersToCsv(rows: readonly CustomerRecord[]): string {
  const header = ["Name", "Phone", "Email", "Tags", "Visits", "Total Spend (SAR)", "Last Visit"];
  const lines = rows.map((row) =>
    [customerName(row), row.phone, row.email, row.tags.join("; "), String(row.visits), row.totalSpendSar.toFixed(2), row.lastVisit]
      .map(escapeCsvField)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}
