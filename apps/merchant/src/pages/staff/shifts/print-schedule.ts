export interface PrintableSchedule {
  documentTitle: string;
  heading: string;
  subheading: string;
  employeeHeader: string;
  dayHeaders: string[];
  rows: { name: string; detail: string; cells: string[] }[];
  footer: string;
  dir: "ltr" | "rtl";
  lang: string;
}

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function toHtml(s: PrintableSchedule): string {
  const head = `<tr><th>${escape(s.employeeHeader)}</th>${s.dayHeaders.map((d) => `<th>${escape(d)}</th>`).join("")}</tr>`;
  const body = s.rows
    .map(
      (r) =>
        `<tr><td class="who"><strong>${escape(r.name)}</strong><span>${escape(r.detail)}</span></td>${r.cells
          .map((c) => `<td>${escape(c)}</td>`)
          .join("")}</tr>`
    )
    .join("");
  return `<!doctype html><html lang="${s.lang}" dir="${s.dir}"><head><meta charset="utf-8"><title>${escape(s.documentTitle)}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif; color: #16161d; margin: 0; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  p.sub { font-size: 12px; color: #6b6b74; margin: 0 0 12px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11px; }
  th, td { border: 1px solid #d9d9df; padding: 6px 5px; text-align: center; vertical-align: middle; }
  th { background: #f3f4f6; font-weight: 600; }
  th:first-child, td.who { width: 22%; text-align: start; }
  td.who span { display: block; color: #6b6b74; font-size: 10px; margin-top: 1px; }
  tr { break-inside: avoid; }
  footer { margin-top: 10px; font-size: 10px; color: #8b8b93; }
</style></head><body>
<h1>${escape(s.heading)}</h1><p class="sub">${escape(s.subheading)}</p>
<table><thead>${head}</thead><tbody>${body}</tbody></table>
<footer>${escape(s.footer)}</footer></body></html>`;
}

/**
 * Prints through a hidden iframe so only the schedule is printed (not the
 * console chrome) and no popup blocker is involved. "Export PDF" uses the same
 * document; the browser's print dialog offers "Save as PDF" and names the
 * file after the document title.
 */
export function printSchedule(schedule: PrintableSchedule): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;inset-inline-end:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(toHtml(schedule));
  doc.close();

  const previousTitle = document.title;
  document.title = schedule.documentTitle;
  const cleanup = () => {
    document.title = previousTitle;
    window.setTimeout(() => iframe.remove(), 500);
  };
  win.addEventListener("afterprint", cleanup, { once: true });
  window.setTimeout(() => {
    win.focus();
    win.print();
    // Browsers that don't fire afterprint for iframes still need tidying.
    window.setTimeout(cleanup, 60_000);
  }, 60);
}
