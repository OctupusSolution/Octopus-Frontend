// Colours sampled from the Floor Plan frames. The plan is a drawing — it keeps
// these light "paper" colours in dark mode too, the way a PDF would, while
// the chrome around it follows the console theme.
import type { LiveStatus, ZoneColor } from "@/entities/floor-plan";

export const PAPER = "#FFFFFF";
/** Tables, chairs and cushions are outlined in black, the way a drawn floor
 *  plan reads — the status colour stays in the fill. */
export const ITEM_OUTLINE = "#111827";
export const BASE_GRID = "#E7E9EE";
export const SELECTION = "#6366F1";
export const CONFLICT = "#EF4444";

export const ZONE_PALETTE: Record<ZoneColor, { fill: string; grid: string; label: string }> = {
  blue: { fill: "#F0F5FF", grid: "#C9DAFA", label: "#2563EB" },
  violet: { fill: "#FCF3FF", grid: "#EDCFF8", label: "#9333EA" },
  amber: { fill: "#FFFBEE", grid: "#F5E0A6", label: "#CA8A04" },
  green: { fill: "#F2FBF3", grid: "#C6E9CB", label: "#22A04B" },
  slate: { fill: "#F5F6F8", grid: "#D9DDE4", label: "#64748B" },
};

export const TABLE_TONES: Record<LiveStatus, { fill: string; stroke: string; text: string; dot: string }> = {
  available: { fill: "#DDFBE2", stroke: "#16A34A", text: "#15803D", dot: "#16A34A" },
  cleaning: { fill: "#DCE8FE", stroke: "#2563EB", text: "#1D4ED8", dot: "#2563EB" },
  reserved: { fill: "#FDF0DE", stroke: "#B7791F", text: "#9A5B13", dot: "#D97706" },
  occupied: { fill: "#FDE4E4", stroke: "#DC2626", text: "#B91C1C", dot: "#DC2626" },
  blocked: { fill: "#A8A8A8", stroke: "#1F1F1F", text: "#111111", dot: "#6B7280" },
};
