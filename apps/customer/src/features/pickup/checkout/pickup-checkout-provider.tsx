"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { TableOrder, TablePayment } from "@/features/table/checkout";

const STORAGE_KEY = "octopus_pickup_checkout";

/** A paid order waiting to be collected. It is tracked and invoiced exactly as
 *  a table's order is, so it keeps that shape and adds where it is collected. */
export interface PickupOrder extends TableOrder {
  branchName: string;
  /** The card's last four digits, when it was paid by card. */
  cardLast4: string | null;
}

export interface Reservation {
  /** Null until the deposit is paid. */
  number: string | null;
  name: string;
  phone: string;
  branchName: string;
  /** yyyy-mm-dd */
  date: string;
  /** HH:mm, 24h */
  time: string;
  guests: number;
  tableLabel: string;
  /** i18n key of the section the table is in. */
  zoneKey: string;
  occasionKey: string;
  note: string;
  depositSar: number;
  payment: TablePayment | null;
}

interface CheckoutState {
  order: PickupOrder | null;
  reservation: Reservation | null;
}

const INITIAL: CheckoutState = { order: null, reservation: null };

interface PickupCheckoutValue extends CheckoutState {
  placeOrder: (order: PickupOrder) => void;
  setReservation: (reservation: Reservation | null) => void;
}

const PickupCheckoutContext = createContext<PickupCheckoutValue | null>(null);

/** The pickup order once it is paid, and the table reservation while its
 *  deposit is being collected. Kept for the browser session, as the table
 *  checkout is: there is no customer account for it to outlive the visit in. */
export function PickupCheckoutProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CheckoutState>(INITIAL);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...INITIAL, ...(JSON.parse(raw) as CheckoutState) });
    } catch {
      // Unreadable storage just means a fresh checkout.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    // Skip writes until hydration has run, or the empty initial state would
    // overwrite a checkout saved before this mount.
    if (!hydrated) return;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const value = useMemo<PickupCheckoutValue>(
    () => ({
      ...state,
      placeOrder: (order) => setState((prev) => ({ ...prev, order })),
      setReservation: (reservation) => setState((prev) => ({ ...prev, reservation })),
    }),
    [state],
  );

  return <PickupCheckoutContext.Provider value={value}>{children}</PickupCheckoutContext.Provider>;
}

export function usePickupCheckout(): PickupCheckoutValue {
  const context = useContext(PickupCheckoutContext);
  if (!context) throw new Error("usePickupCheckout must be used within PickupCheckoutProvider");
  return context;
}
