// widgets/floor-plan-canvas
// Renders a floor plan document — read-only (PlanViewport) or editable with
// rulers and drawing tools (EditorCanvas).
// This index.ts is the ONLY file other slices/layers may import from.
export { PlanSvg, handlesFor, type HandleId, type ItemKind, type PlanSvgProps } from "./plan-svg";
export { PlanViewport, computeScale, ACTUAL_SIZE_SCALE, type ZoomSetting } from "./viewport";
export { EditorCanvas, LIBRARY_MIME, type EditorCanvasHandle, type EditorCanvasProps, type EditorTool, type Point } from "./editor-canvas";
export { TableGlyph, ObjectGlyph, LockIcon } from "./glyphs";
export { TABLE_TONES, ZONE_PALETTE, SELECTION } from "./palette";
