// The printed card (Figma 2012:190398 preview): table number badge, the
// restaurant's name, the code, the call to action and a "Thank you!" band.
// Printing opens the cards in their own window, laid out per the design step;
// the symbols are the server's own SVGs (print-codes.ts fetches them).
import type { FloorPlanDoc, FloorTable } from "@/entities/floor-plan";

export type TemplateType = "tent" | "sticker" | "square" | "custom";
export type QrStyle = "classic" | "modern" | "minimal" | "rounded";
export type NumberStyle = "circle" | "plain" | "badge";

export interface QrDesign {
  template: TemplateType;
  tentSize: string;
  paper: "A4" | "A5" | "Letter";
  qrSize: "small" | "medium" | "large";
  margins: { top: number; bottom: number; right: number; left: number };
  qrStyle: QrStyle;
  logo: string | null;
  primary: string;
  background: string;
  showMessage: boolean;
  message: string;
  showNumber: boolean;
  numberStyle: NumberStyle;
  perPage: number;
}

export const DEFAULT_DESIGN: QrDesign = {
  template: "tent",
  tentSize: "60x90",
  paper: "A4",
  qrSize: "medium",
  margins: { top: 8, bottom: 8, right: 8, left: 8 },
  qrStyle: "classic",
  logo: null,
  primary: "#08589D",
  background: "#FFFFFF",
  showMessage: false,
  message: "",
  showNumber: true,
  numberStyle: "circle",
  perPage: 12,
};

export const QR_SIZE_PX: Record<QrDesign["qrSize"], number> = { small: 64, medium: 80, large: 96 };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Opened before any request is awaited, so a popup blocker allows it. */
export function openPrintWindow(): Window | null {
  return window.open("", "_blank", "width=900,height=1100");
}

export function writeTents(
  win: Window,
  doc: FloorPlanDoc,
  items: { table: FloorTable; svg: string }[],
  design: QrDesign,
  t: (k: string) => string
) {
  const m = design.margins;
  const qrPx = QR_SIZE_PX[design.qrSize] * 2;
  const cards = items
    .map(({ table, svg }) => {
      const number = design.showNumber
        ? `<div class="num ${design.numberStyle}">${esc(`T${table.number}`)}</div>`
        : "";
      const logo = design.logo ? `<img class="logo" src="${design.logo}" alt="">` : "";
      const msg = design.showMessage && design.message ? `<p class="msg">${esc(design.message)}</p>` : "";
      return `<div class="card">${number}${logo}<h2>${esc(doc.name)}</h2><div class="qr">${svg}</div><p class="cta">${esc(t("floorPlan.qr.card.cta"))}</p>${msg}<div class="thanks">${esc(t("floorPlan.qr.card.thanks"))}</div></div>`;
    })
    .join("");
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(doc.name)} QR</title><style>
@page{size:${design.paper};margin:${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm}
body{margin:0;font-family:Inter,system-ui,sans-serif;color:#0f172a}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6mm}
.card{break-inside:avoid;display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 8px 0;background:${design.background};border:1px solid #e2e8f0;border-radius:${design.template === "sticker" ? "16px" : "4px"};overflow:hidden}
.num{font-weight:700;font-size:12px;color:${design.primary}}
.num.circle{width:30px;height:30px;border:2px solid ${design.primary};border-radius:50%;display:grid;place-items:center}
.num.badge{background:${design.primary};color:#fff;padding:2px 10px;border-radius:999px}
.logo{max-height:28px;max-width:80%}
h2{margin:0;font-size:12px;text-align:center;text-transform:uppercase;color:${design.primary}}
.qr svg{display:block;width:${qrPx / 2}px;height:${qrPx / 2}px}
.cta,.msg{margin:0;font-size:10px;text-align:center}
.thanks{align-self:stretch;margin-top:6px;padding:4px;background:#16213e;color:#fff;font-size:10px;font-style:italic;text-align:center}
</style></head><body><div class="grid">${cards}</div><script>window.onload=()=>{window.print()}</script></body></html>`);
  win.document.close();
}
