// Coloured Library artwork exported from the Build From Scratch frame. Each
// URL is a full literal so Vite resolves exactly that file (same reasoning as
// shared/lib/floor-plan-assets.ts, which holds the rest of the thumbnails).
export const SCRATCH_ASSETS = {
  round: new URL("../../../../../../../assets/Dashboard/icons/fp-scratch-lib-round.svg", import.meta.url).href,
  plantSmall: new URL("../../../../../../../assets/Dashboard/icons/fp-scratch-lib-plant-small.svg", import.meta.url).href,
  plantLarge: new URL("../../../../../../../assets/Dashboard/icons/fp-scratch-lib-plant-large.svg", import.meta.url).href,
  planter1: new URL("../../../../../../../assets/Dashboard/icons/fp-scratch-lib-planter-1.svg", import.meta.url).href,
  planter2: new URL("../../../../../../../assets/Dashboard/icons/fp-scratch-lib-planter-2.svg", import.meta.url).href,
  planter3: new URL("../../../../../../../assets/Dashboard/icons/fp-scratch-lib-planter-3.svg", import.meta.url).href,
  tree: new URL("../../../../../../../assets/Dashboard/icons/fp-scratch-lib-tree.svg", import.meta.url).href,
  /** One sheet holding both the arm chair and the sofa; the tiles crop it. */
  seating: new URL("../../../../../../../assets/Floor Plan/fp-scratch-seating.png", import.meta.url).href,
} as const;
