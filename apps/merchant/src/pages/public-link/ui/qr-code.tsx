// Renders the matrix `encodeQr` produces as one inline SVG. Colours here are
// hardcoded, not theme tokens: a QR code inverted by dark mode (light modules
// on a dark ground) does not scan reliably, so this stays dark-on-light
// (#16161d on #ffffff) in both themes rather than following the page around.
import { encodeQr } from "./qr-encode";

export interface QrCodeProps {
  value: string;
  size?: number;
}

// ISO/IEC 18004:2015 §6.3.9 requires a "quiet zone" of at least four light
// modules on every side of the symbol — without it, many scanners cannot lock
// onto the finder patterns. Final review finding F3: the symbol used to sit
// flush against its card with none.
const QUIET_ZONE = 4;

export function QrCode({ value, size = 96 }: QrCodeProps) {
  // `encodeQr` throws once `value`'s UTF-8 encoding exceeds this shape's
  // 78-byte capacity. Every caller now caps what it hands in (final review
  // finding F1), but this component's only job is decoration — it must never
  // be able to unmount the rest of the app if a cap is ever missed elsewhere.
  // Render nothing rather than let the throw escape.
  let matrix: boolean[][] | null;
  try {
    matrix = encodeQr(value);
  } catch {
    matrix = null;
  }
  if (!matrix) return null;

  const modules = matrix.length;
  const viewSize = modules + QUIET_ZONE * 2;

  return (
    <svg
      viewBox={`-${QUIET_ZONE} -${QUIET_ZONE} ${viewSize} ${viewSize}`}
      width={size}
      height={size}
      role="img"
      shapeRendering="crispEdges"
    >
      <title>{value}</title>
      <rect x={-QUIET_ZONE} y={-QUIET_ZONE} width={viewSize} height={viewSize} fill="#ffffff" />
      {matrix.map((row, r) =>
        row.map((dark, c) => (dark ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#16161d" /> : null))
      )}
    </svg>
  );
}
