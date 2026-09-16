import type { FloorTable, TableArea, TableShape, TableSize } from "@/entities/floor-plan";

type T = (key: string) => string;

export function seatsLabel(n: number, t: T): string {
  return t(n === 1 ? "floorPlan.common.seatCount" : "floorPlan.common.seatsCount").replace("{n}", String(n));
}

export function shapeLabel(shape: TableShape, t: T): string {
  return t(`floorPlan.shape.${shape}`);
}

export function sizeLabel(size: TableSize, t: T): string {
  return t(`floorPlan.size.${size}`);
}

export function areaLabel(area: TableArea, t: T): string {
  return t(`floorPlan.area.${area}`);
}

/** "Square - 4 Seats - Indoor", as the Selection card reads. */
export function tableLine(table: FloorTable, t: T): string {
  return `${shapeLabel(table.shape, t)} - ${seatsLabel(table.seats, t)} - ${areaLabel(table.area, t)}`;
}
