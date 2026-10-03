// Hands the viewer a generated file — the deposit receipt and the calendar
// export, neither of which needs a server. Same approach as the reports
// module's CSV export (pages/reports/_shared/export.ts), generalised to any
// text payload.
export function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke on the next tick: some browsers begin the download asynchronously
  // and abort it if the object URL is revoked synchronously after click().
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Opens an external link (WhatsApp, etc.) in a new tab without giving the
 *  opened page a handle back to this one. */
export function openExternal(href: string): void {
  window.open(href, "_blank", "noopener,noreferrer");
}
