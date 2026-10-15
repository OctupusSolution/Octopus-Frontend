"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Menu } from "@/shared/api/menu-document";
import type { PlaceOrdering, PlaceScan } from "@/shared/lib/place-order";

/** What a scanned place code resolved to, read once by the `/p/[key]` layout. */
export interface PlaceScanValue {
  key: string;
  scan: PlaceScan;
  /** The storefront menu, with items the order cannot carry marked sold out. */
  menu: Menu;
  /** Null when the code does not take orders right now (browse only). */
  ordering: PlaceOrdering | null;
}

const PlaceScanContext = createContext<PlaceScanValue | null>(null);

export function PlaceScanProvider({ value, children }: { value: PlaceScanValue; children: ReactNode }) {
  return <PlaceScanContext.Provider value={value}>{children}</PlaceScanContext.Provider>;
}

export function usePlaceScan(): PlaceScanValue {
  const value = useContext(PlaceScanContext);
  if (!value) throw new Error("usePlaceScan must be used within PlaceScanProvider");
  return value;
}
