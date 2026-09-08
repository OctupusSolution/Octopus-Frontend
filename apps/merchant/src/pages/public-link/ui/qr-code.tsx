// Renders the matrix `encodeQr` produces as one inline SVG. Colours here are
// hardcoded, not theme tokens: a QR code inverted by dark mode (light modules
// on a dark ground) does not scan reliably, so this stays dark-on-light
// (#16161d on #ffffff) in both themes rather than following the page around.
import { encodeQr } from "./qr-encode";

export interface QrCodeProps {
  value: string;
  size?: number;
}

export function QrCode({ value, size = 96 }: QrCodeProps) {
  const matrix = encodeQr(value);
  const modules = matrix.length;

  return (
    <svg
      viewBox={`0 0 ${modules} ${modules}`}
      width={size}
      height={size}
      role="img"
      shapeRendering="crispEdges"
    >
      <title>{value}</title>
      <rect x={0} y={0} width={modules} height={modules} fill="#ffffff" />
      {matrix.map((row, r) =>
        row.map((dark, c) => (dark ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#16161d" /> : null))
      )}
    </svg>
  );
}
