// The address a published menu is reached at, and the one the Theme step's QR
// codes encode.
//
// The QR encoder (pages/public-link/ui/qr-encode) holds 78 bytes, so every
// part is capped: "https://" (8) + slug (≤28) + ".octopus.app" (12) + "/m/" (3)
// + menu id (≤16) + "?table=NN" (≤9) = 76. A long business name is cut rather
// than producing a code that silently fails to render.

const MAX_SLUG = 28;
const MAX_ID = 16;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, MAX_SLUG)
    .replace(/^-+|-+$/g, "");
}

export function publicMenuUrl(businessName: string, menuId: string): string {
  const host = slugify(businessName) || "restaurant";
  const id = menuId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, MAX_ID) || "menu";
  return `https://${host}.octopus.app/m/${id}`;
}

export function tableQrUrl(menuUrl: string, table: number): string {
  return `${menuUrl}?table=${Math.max(1, Math.min(99, Math.round(table)))}`;
}

/** Rasterises the QR <svg> inside `container` to a PNG and downloads it.
 *  Drawn onto a canvas rather than saved as SVG because the frame promises a
 *  QR "code" a merchant prints or drops into a design tool, where PNG is the
 *  format that works everywhere. */
export function downloadQrPng(container: HTMLElement | null, filename: string, size = 1024): void {
  const svg = container?.querySelector("svg");
  if (!svg) return;
  const markup = new XMLSerializer().serializeToString(svg);
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Crisp modules: a QR scaled with smoothing blurs its edges.
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(image, 0, 0, size, size);
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}
