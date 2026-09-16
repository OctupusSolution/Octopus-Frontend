// The restaurant the Floor Plan frames draw: a Terrace with its bar, the Main
// Dining room, a Family Zone and a VIP Area. Offered in the builder as a
// starting point, so a merchant can see a complete plan and edit it rather
// than face an empty grid.
import {
  createObject,
  createTable,
  createZone,
  type FloorObject,
  type FloorPlanDoc,
  type FloorTable,
} from "./model";

export function sampleLayout(name = "Main Dining"): FloorPlanDoc {
  const t = (number: string, x: number, y: number, extra: Partial<FloorTable> = {}): FloorTable => ({
    ...createTable(number, x, y, { seats: 4 }),
    ...extra,
  });

  const tables: FloorTable[] = [
    // Terrace
    t("T4", 3, 4.5, { area: "outdoor", smoking: "smoking" }),
    t("T5", 9.5, 4.5, { area: "outdoor", smoking: "smoking" }),
    t("T6", 2, 13, { area: "outdoor" }),
    t("T7", 8.5, 13, { area: "outdoor", blocked: true, reservable: false, note: "Umbrella repair" }),
    t("T8", 1.5, 21, { area: "outdoor" }),
    t("T9", 8.5, 21, { area: "outdoor" }),
    // Main Dining
    t("T11", 17.5, 3),
    t("T24", 24, 3),
    t("T25", 30.5, 3),
    t("T12", 17.5, 10),
    t("T22", 24, 10),
    t("T23", 30.5, 10),
    t("T13", 17.5, 17.5, { seats: 6, size: "medium", shape: "square" }),
    t("T20", 24, 17.5),
    t("T21", 30.5, 17.5),
    // Family Zone
    t("T14", 17, 25.5, { largePartyOnly: false, seats: 6 }),
    t("T19", 23, 25.5, { seats: 6 }),
    t("T18", 29, 25.5, { walkIn: false, seats: 6 }),
    t("T15", 17, 32, { seats: 6 }),
    t("T16", 23, 32, { seats: 6 }),
    t("T17", 29, 32, { seats: 6 }),
    // VIP Area
    t("T26", 38, 3, { area: "vip" }),
    t("T27", 40.5, 10, { area: "vip" }),
    t("T28", 38, 18, { area: "vip", blocked: true, reservable: false, note: "Private event setup" }),
    t("T29", 40.5, 25.5, { area: "vip", largePartyOnly: true, seats: 6 }),
  ];

  const plant = (x: number, y: number): FloorObject => createObject("plantSmall", x, y);

  const objects: FloorObject[] = [
    // The building shell around the indoor rooms, open at the entrance.
    createObject("wall", 16, 0, { w: 32, h: 0.3 }),
    createObject("wall", 47.7, 0, { w: 0.3, h: 38 }),
    createObject("wall", 16, 37.7, { w: 8.3, h: 0.3 }),
    createObject("wall", 28.7, 37.7, { w: 19.3, h: 0.3 }),
    // Main entrance: double doors swinging out of the Family Zone, a pot each side.
    createObject("doubleDoor", 24.3, 37.85, { rotation: 180 }),
    plant(22.5, 38.8), plant(29.1, 38.8),

    // Terrace fence: hedge planters along its open edges and down the room line.
    // Split around the zone's name tag, which sits centred on this edge.
    createObject("planterBox", 1.2, 0, { w: 3.6, h: 1 }),
    createObject("planterBox", 11.2, 0, { w: 3.6, h: 1 }),
    createObject("planterBox", 0, 1.2, { w: 1, h: 18 }),
    createObject("planterBox", 15.2, 1.4, { w: 0.8, h: 9.6 }),
    createObject("planterBox", 15.2, 12.2, { w: 0.8, h: 13 }),
    createObject("tree", 12.4, 9.9, { w: 2.6, h: 2.6 }),
    plant(6.9, 21.6), plant(6.9, 23.4),

    // A low partition between Main Dining and the Family Zone, open in the middle.
    createObject("halfWall", 16.3, 23.85, { w: 5.8, h: 0.3 }),
    createObject("halfWall", 30.6, 23.85, { w: 6.1, h: 0.3 }),

    // Greenery screening the VIP Area.
    plant(35.6, 3), plant(35.6, 5), plant(35.6, 7),
    plant(46.1, 3), plant(46.1, 5), plant(46.1, 7),
    createObject("plantLarge", 38.2, 34.8),
    createObject("plantLarge", 44.6, 34.8),
    // A door draws its wall line along its bottom edge (top edge once turned
    // 180°), so it sits flush on the wall's centre line in the gap between the
    // wall pieces. The terrace door swings toward the bar, clear of T8.
    createObject("door", 1.6, 27.15, { rotation: 180 }),
    createObject("wall", 4.6, 27, { w: 11.4, h: 0.3 }),
    createObject("wall", 0, 27, { w: 1.6, h: 0.3 }),
    createObject("wall", 37, 33, { w: 6, h: 0.3 }),
    createObject("door", 43, 30.55),
    createObject("wall", 46, 33, { w: 2, h: 0.3 }),
    createObject("bar", 1.5, 30.5, { w: 13, h: 5.5, label: "Bar" }),
  ];

  const zones = [
    createZone("Terrace", "green", { x: 0, y: 0, w: 16, h: 38 }),
    createZone("Main Dining", "blue", { x: 16, y: 0, w: 21, h: 24 }),
    createZone("Family Zone", "amber", { x: 16, y: 24, w: 21, h: 14 }),
    createZone("VIP Area", "violet", { x: 37, y: 0, w: 11, h: 38 }),
  ];

  // Matches the blank canvas's own default size, so a merchant who starts
  // from this sample has the same room to extend it that a blank plan does.
  return { name, width: 54, height: 48, zones, tables, objects, background: null };
}
