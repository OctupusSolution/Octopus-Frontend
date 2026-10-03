// A complete restaurant offered in the builder as a starting point, so a
// merchant can see a full plan and edit it rather than face an empty grid.
// Laid out wide (about the shape of a landscape screen) so the live floor
// shows it edge to edge, and it uses every table shape and every kind of
// floor object: a Terrace, the Main Dining room, a Bar, the Lounge at the
// entrance, a Family Majlis with floor seating and tents, and a VIP Area.
import {
  createObject,
  createTable,
  createZone,
  type FloorObject,
  type FloorPlanDoc,
  type FloorTable,
} from "./model";

export const SAMPLE_WIDTH = 96;
export const SAMPLE_HEIGHT = 46;

export function sampleLayout(name = "Main Dining"): FloorPlanDoc {
  const t = (number: string, x: number, y: number, extra: Partial<FloorTable> = {}): FloorTable => ({
    ...createTable(number, x, y, { seats: 4 }),
    ...extra,
  });
  const o = createObject;
  const plant = (x: number, y: number): FloorObject => o("plantSmall", x, y);
  const outdoor = { area: "outdoor", smoking: "smoking" } as const;

  // Every section is laid out on an even, centred grid: equal gaps between
  // tables in a row and between the row and the section's walls.
  const tables: FloorTable[] = [
    // Terrace — open-air, smoking allowed.
    t("T1", 3.3, 3, { ...outdoor, shape: "round", size: "small", seats: 2 }),
    t("T2", 12.3, 3, { ...outdoor, shape: "round", size: "small", seats: 2 }),
    t("T3", 2.9, 11, { ...outdoor }),
    t("T4", 11.9, 11, { ...outdoor, blocked: true, reservable: false, note: "Umbrella repair" }),
    t("T5", 2.05, 19.5, { ...outdoor, shape: "tent", seats: 6 }),
    t("T6", 11.05, 19.5, { ...outdoor, shape: "tent", seats: 6 }),
    t("T7", 2.98, 29.5, { ...outdoor, shape: "tabliya" }),
    t("T8", 11.98, 29.5, { ...outdoor, shape: "tabliya" }),
    t("T9", 2.9, 37.5, { ...outdoor, shape: "round", seats: 5 }),
    t("T10", 11.9, 37.5, { ...outdoor, shape: "round", seats: 5 }),
    // Main Dining
    t("T11", 22.2, 2.5, { shape: "rectangle", seats: 6 }),
    t("T12", 31.3, 2.5, { shape: "rectangle", seats: 6 }),
    t("T13", 40.4, 2.5, { shape: "rectangle", seats: 6 }),
    t("T14", 49.5, 2.9, { shape: "round", size: "small", seats: 2 }),
    t("T15", 21.9, 10.5),
    t("T16", 28.7, 10.5),
    t("T17", 35.5, 10.5),
    t("T18", 42.2, 10.5),
    t("T19", 49, 10.5, { shape: "round", seats: 5 }),
    t("T20", 22, 18.5, { shape: "long", seats: 10, largePartyOnly: true, joinable: true }),
    t("T21", 39.4, 18.5, { shape: "long", seats: 10, joinable: true }),
    // Bar — high tops facing the counter.
    t("B1", 21.8, 38.5, { shape: "round", size: "small", seats: 2 }),
    t("B2", 27.8, 38.5, { shape: "round", size: "small", seats: 2, reservable: false }),
    t("B3", 33.8, 38.5, { shape: "round", size: "small", seats: 2 }),
    // Lounge
    t("L1", 45.8, 30, { shape: "round", size: "small", seats: 3 }),
    t("L2", 45.8, 36, { size: "small", seats: 2 }),
    // Family Majlis — Saudi floor seating.
    t("M1", 57.4, 2, { shape: "majlisL", size: "large", seats: 10 }),
    t("M2", 69.7, 4.1, { shape: "tent", seats: 6 }),
    t("M3", 57.4, 16, { shape: "majlisL", seats: 8 }),
    t("M4", 67.6, 16, { shape: "majlisL", seats: 8 }),
    t("M5", 57.8, 28, { shape: "tabliya" }),
    t("M6", 64.5, 28, { shape: "tabliya" }),
    t("M7", 71.2, 28, { shape: "tabliya" }),
    t("M8", 58.8, 35, { shape: "tent", seats: 6 }),
    t("M9", 68.3, 35, { shape: "tent", seats: 6, blocked: true, reservable: false, note: "Private family booking" }),
    // VIP Area
    t("V1", 82.5, 2, { shape: "rectangle", size: "large", seats: 8, area: "vip" }),
    t("V2", 80.5, 11.5, { shape: "round", area: "vip" }),
    t("V3", 88.1, 11.5, { shape: "round", area: "vip" }),
    t("V4", 80.3, 20, { shape: "long", size: "large", seats: 12, area: "vip", largePartyOnly: true }),
    t("V5", 79.9, 30, { size: "large", seats: 6, area: "vip" }),
    t("V6", 87.8, 30, { size: "large", seats: 6, area: "vip" }),
  ];

  const objects: FloorObject[] = [
    // Building shell around the indoor rooms; the terrace is open-air.
    o("wall", 20, 0, { w: 76, h: 0.3 }),
    o("wall", 95.7, 0, { w: 0.3, h: 46 }),
    o("wall", 19.85, 28, { w: 0.3, h: 17.7 }),
    o("wall", 20, 45.7, { w: 24, h: 0.3 }),
    o("wall", 48.4, 45.7, { w: 47.6, h: 0.3 }),
    // Main entrance into the Lounge. A door draws its wall line along its
    // bottom edge, so it sits flush on the wall's centre line in the gap.
    o("doubleDoor", 44, 43.45),

    // Terrace: hedge planters around its open edges, gaps left for the
    // zone's name tag and the path into the dining room.
    o("planterBox", 1.2, 0, { w: 5, h: 1 }),
    o("planterBox", 13.8, 0, { w: 5, h: 1 }),
    o("planterBox", 0, 1.5, { w: 1, h: 43 }),
    o("planterBox", 1.2, 45, { w: 17.6, h: 1 }),
    o("planterBox", 19.2, 1.5, { w: 0.8, h: 12 }),
    o("planterBox", 19.2, 16, { w: 0.8, h: 11.5 }),
    plant(9.3, 40),

    // Main Dining: a service station between the long tables, greenery at
    // the end of the row, and a low partition screening the Bar.
    o("station", 34.5, 19.9, { label: "Service" }),
    plant(51.5, 20.2), plant(53.6, 20.2),
    o("halfWall", 20.3, 27.85, { w: 17, h: 0.3 }),

    // Bar
    o("bar", 21.5, 30.5, { w: 13, h: 5.5, label: "Bar" }),
    o("counter", 35.2, 30.5, { w: 4.4, h: 2, label: "Coffee" }),
    plant(38.3, 43.8),

    // Lounge: sofas and armchairs around low tables, the host at the door.
    o("sofa", 41.2, 31.3),
    o("sofa", 51, 31.3),
    o("armchair", 43.2, 37.3),
    o("armchair", 51, 37.3),
    o("text", 41.5, 41.4, { label: "Welcome" }),
    o("hostStand", 50.5, 42.2),
    o("plantLarge", 53.2, 43.2),

    // Wall between the Dining room / Lounge and the Majlis, open at the aisle.
    o("wall", 55.85, 0.3, { w: 0.3, h: 11.7 }),
    o("wall", 55.85, 18, { w: 0.3, h: 27.7 }),

    // Family Majlis: floor cushions along the back wall.
    o("majlisFloor", 58.05, 43.8),
    o("majlisFloor", 67.95, 43.8),

    // Wall between the Majlis and the VIP Area, open at the aisle.
    o("wall", 77.85, 0.3, { w: 0.3, h: 19.7 }),
    o("wall", 77.85, 26, { w: 0.3, h: 19.7 }),

    // VIP Area: greenery flanking the head table, a sofa between two palms.
    plant(79.6, 2.2), plant(79.6, 4.6), plant(79.6, 7),
    plant(93, 2.2), plant(93, 4.6), plant(93, 7),
    o("plantLarge", 79.2, 42.8),
    o("sofa", 85.1, 42),
    o("plantLarge", 92.8, 42.8),
  ];

  const zones = [
    createZone("Terrace", "green", { x: 0, y: 0, w: 20, h: 46 }),
    createZone("Main Dining", "blue", { x: 20, y: 0, w: 36, h: 28 }),
    createZone("Bar", "slate", { x: 20, y: 28, w: 20, h: 18 }),
    createZone("Lounge", "slate", { x: 40, y: 28, w: 16, h: 18 }),
    createZone("Family Majlis", "amber", { x: 56, y: 0, w: 22, h: 46 }),
    createZone("VIP Area", "violet", { x: 78, y: 0, w: 18, h: 46 }),
  ];

  // The zones tile the whole canvas, so the plan has no empty margin.
  return { name, width: SAMPLE_WIDTH, height: SAMPLE_HEIGHT, zones, tables, objects, background: null };
}
