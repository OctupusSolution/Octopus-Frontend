"use client";

import { createContext, useContext, type ReactNode } from "react";
import { MOBILE_FLOWS, type MobileFlow } from "./table-flow";

const MobileFlowContext = createContext<MobileFlow>(MOBILE_FLOWS.table);

/** Tells the shared table/pickup screens which flow they are in. A scanned place code passes its
 *  own `flow` (its links live under `/p/{key}`); the others name their `mode`. */
export function MobileFlowProvider({ mode, flow, children }: { mode?: MobileFlow["mode"]; flow?: MobileFlow; children: ReactNode }) {
  return <MobileFlowContext.Provider value={flow ?? MOBILE_FLOWS[mode ?? "table"]}>{children}</MobileFlowContext.Provider>;
}

export const useMobileFlow = (): MobileFlow => useContext(MobileFlowContext);
