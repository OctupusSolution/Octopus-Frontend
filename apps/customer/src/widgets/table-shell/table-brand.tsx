"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface TableBrand {
  /** The restaurant the table belongs to. */
  name: string;
  /** Its own logo; the platform mark until it uploads one. */
  logoUrl: string | null;
  /** The branch the table is in, as the invoice names it. */
  branchName?: string;
  /** The languages its site offers; omitted for the sample storefront (both). */
  languages?: string[];
  /** Its VAT registration number, printed on invoices once the business has one on file. */
  taxNumber?: string;
}

const TableBrandContext = createContext<TableBrand | null>(null);

/** The table bar and the welcome screen both name the restaurant, on every
 *  screen of the flow — so the layout resolves it once and hands it down. */
export function TableBrandProvider({ brand, children }: { brand: TableBrand; children: ReactNode }) {
  return <TableBrandContext.Provider value={brand}>{children}</TableBrandContext.Provider>;
}

export function useTableBrand(): TableBrand {
  const brand = useContext(TableBrandContext);
  if (!brand) throw new Error("useTableBrand must be used within TableBrandProvider");
  return brand;
}

export const TABLE_BRAND_FALLBACK_LOGO = "/images/table/brand-mark.png";
