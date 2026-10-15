// Table QR view types and small browser helpers. The codes themselves live on
// the server (use-place-codes.ts); nothing here is persisted.
export type QrStatus = "active" | "reprint" | "notGenerated" | "disabled";
export const QR_STATUSES: readonly QrStatus[] = ["active", "reprint", "notGenerated", "disabled"];

export function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
