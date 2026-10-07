"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { OrderLine } from "@octopus/api-client";
import type { TableBill } from "@/shared/lib/table-flow";
import { EMPTY_SPLIT, type SplitMode, type SplitPerson, type SplitState } from "@/shared/lib/table-split";

const STORAGE_KEY = "octopus_table_checkout";

export interface TablePayment {
  /** i18n key of the method's short name — "Apple Pay", "نقدًا لدى الكاشير". */
  methodNameKey: string;
  paidAt: string;
}

/** The order a table sent to the kitchen, as its tracking and invoice screens
 *  show it. A snapshot: the cart it came from is emptied once it is sent. */
export interface TableOrder {
  orderNumber: string;
  placedAt: string;
  table: string | null;
  lines: OrderLine[];
  bill: TableBill;
  /** Null while it is still to be paid ("pay later"). */
  payment: TablePayment | null;
}

interface CheckoutState {
  split: SplitState;
  /** The person whose share the payment screen is collecting, in a split. */
  payingPersonId: string | null;
  order: TableOrder | null;
  /** The rating prompt is shown once per order. */
  ratedOrder: string | null;
}

const INITIAL: CheckoutState = { split: EMPTY_SPLIT, payingPersonId: null, order: null, ratedOrder: null };

interface TableCheckoutValue extends CheckoutState {
  setSplitMode: (mode: SplitMode) => void;
  addPerson: (name: string, amountSar?: number) => string;
  updatePerson: (id: string, name: string, amountSar?: number) => void;
  removePerson: (id: string) => void;
  toggleAssignment: (lineId: string, personId: string) => void;
  markShared: (id: string) => void;
  markPaid: (id: string) => void;
  setPayingPerson: (id: string | null) => void;
  placeOrder: (order: TableOrder) => void;
  markRated: (orderNumber: string) => void;
}

const TableCheckoutContext = createContext<TableCheckoutValue | null>(null);

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const newOrderNumber = (): string => `#${Math.floor(100000 + Math.random() * 900000)}`;

/** The table's checkout in progress — who is splitting the bill and how, and the
 *  order once it is sent. Kept for the browser session only: a table session
 *  ends when the guests leave, and nothing here should outlive it. */
export function TableCheckoutProvider({ children }: { children: ReactNode }) {
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

  const value = useMemo<TableCheckoutValue>(() => {
    const setPeople = (update: (people: SplitPerson[]) => SplitPerson[]) =>
      setState((prev) => ({ ...prev, split: { ...prev.split, people: update(prev.split.people) } }));

    return {
      ...state,
      setSplitMode: (mode) =>
        setState((prev) =>
          // A different way of splitting starts from an empty table of people:
          // amounts and item choices from one mode mean nothing in another.
          prev.split.mode === mode ? prev : { ...prev, payingPersonId: null, split: { ...EMPTY_SPLIT, mode } },
        ),
      addPerson: (name, amountSar) => {
        const id = newId();
        setPeople((people) => [...people, { id, name, amountSar, status: "unpaid" }]);
        return id;
      },
      updatePerson: (id, name, amountSar) =>
        setPeople((people) => people.map((p) => (p.id === id ? { ...p, name, amountSar } : p))),
      removePerson: (id) =>
        setState((prev) => ({
          ...prev,
          split: {
            ...prev.split,
            people: prev.split.people.filter((p) => p.id !== id),
            assignments: Object.fromEntries(
              Object.entries(prev.split.assignments).map(([lineId, ids]) => [lineId, ids.filter((x) => x !== id)]),
            ),
          },
        })),
      toggleAssignment: (lineId, personId) =>
        setState((prev) => {
          const current = prev.split.assignments[lineId] ?? [];
          const next = current.includes(personId)
            ? current.filter((id) => id !== personId)
            : [...current, personId];
          return { ...prev, split: { ...prev.split, assignments: { ...prev.split.assignments, [lineId]: next } } };
        }),
      markShared: (id) =>
        setPeople((people) => people.map((p) => (p.id === id && p.status === "unpaid" ? { ...p, status: "shared" } : p))),
      markPaid: (id) => setPeople((people) => people.map((p) => (p.id === id ? { ...p, status: "paid" } : p))),
      setPayingPerson: (id) => setState((prev) => ({ ...prev, payingPersonId: id })),
      placeOrder: (order) =>
        setState((prev) => ({ ...prev, order, payingPersonId: null, split: EMPTY_SPLIT })),
      markRated: (orderNumber) => setState((prev) => ({ ...prev, ratedOrder: orderNumber })),
    };
  }, [state]);

  return <TableCheckoutContext.Provider value={value}>{children}</TableCheckoutContext.Provider>;
}

export function useTableCheckout(): TableCheckoutValue {
  const context = useContext(TableCheckoutContext);
  if (!context) throw new Error("useTableCheckout must be used within TableCheckoutProvider");
  return context;
}
