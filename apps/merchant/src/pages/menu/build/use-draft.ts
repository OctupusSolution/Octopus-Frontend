// The wizard's draft, and the one seam between it and storage.
//
// Every step reads and writes the menu through this context and nothing else,
// so the day the backend publishes /menus, `save` becomes a mutation and no
// step, panel or dialog is edited. The spec's Persistence section records why
// the draft is in memory for this stage and what that costs.

import { createContext, useContext } from "react";
import type { Menu } from "@/entities/menu";

export interface DraftContextValue {
  draft: Menu;
  /** Replaces the whole draft. Steps compose the pure transforms from
   *  `entities/menu/draft` and hand the result here. */
  setDraft: (next: Menu) => void;
  /** Writes the draft back into the library. Called by Save Draft, and by
   *  Publish once step 4 exists. */
  save: () => void;
}

const DraftContext = createContext<DraftContextValue | null>(null);

export const DraftProvider = DraftContext.Provider;

export function useDraft(): DraftContextValue {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error("useDraft must be used inside the menu builder");
  return ctx;
}
