// The Floor Plan module's artwork, from apps/assets/Floor Plan. Each URL is a
// full literal rather than a template so Vite resolves exactly that file
// instead of globbing the directory (a file added to a globbed directory while
// the dev server runs 404s until the module is re-transformed).
export const FLOOR_PLAN_ASSETS = {
  welcome: new URL("../../../../assets/Floor Plan/welcome.png", import.meta.url).href,
  fromScratch: new URL("../../../../assets/Floor Plan/from scratch.png", import.meta.url).href,
  withAi: new URL("../../../../assets/Floor Plan/with ai.png", import.meta.url).href,
  quickLayout: new URL("../../../../assets/Floor Plan/quick layout.png", import.meta.url).href,
  floorPlanMark: new URL("../../../../assets/Floor Plan/mdi_floor-plan.png", import.meta.url).href,
  addOneTable: new URL("../../../../assets/Floor Plan/Ellipse 9.png", import.meta.url).href,
  addTenTables: new URL("../../../../assets/Floor Plan/Group 18.png", import.meta.url).href,
  roundTable: new URL("../../../../assets/Floor Plan/Group 52.png", import.meta.url).href,
  station: new URL("../../../../assets/Floor Plan/image 121.png", import.meta.url).href,
  hostStand: new URL("../../../../assets/Floor Plan/image 122.png", import.meta.url).href,
  counter: new URL("../../../../assets/Floor Plan/image 122 (1).png", import.meta.url).href,
  bar: new URL("../../../../assets/Floor Plan/image 122 (2).png", import.meta.url).href,
  plantLarge: new URL("../../../../assets/Floor Plan/Plant Larage.png", import.meta.url).href,
  plantSmall: new URL("../../../../assets/Floor Plan/Plant Small.png", import.meta.url).href,
  planterBox: new URL("../../../../assets/Floor Plan/Planter Box.png", import.meta.url).href,
  tree: new URL("../../../../assets/Floor Plan/Tree-1.png", import.meta.url).href,
} as const;
