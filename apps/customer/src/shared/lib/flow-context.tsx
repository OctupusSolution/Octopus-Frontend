"use client";

import { createContext, useContext, type ReactNode } from "react";
import { MOBILE_FLOWS, type MobileFlow } from "./table-flow";

const MobileFlowContext = createContext<MobileFlow>(MOBILE_FLOWS.table);

/** The home, menu, product and cart screens are the same in both phone flows;
 *  the layout says which one they are in, and their links follow. */
export function MobileFlowProvider({ mode, children }: { mode: MobileFlow["mode"]; children: ReactNode }) {
  return <MobileFlowContext.Provider value={MOBILE_FLOWS[mode]}>{children}</MobileFlowContext.Provider>;
}

export const useMobileFlow = (): MobileFlow => useContext(MobileFlowContext);
