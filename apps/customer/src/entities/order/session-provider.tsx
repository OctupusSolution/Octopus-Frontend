"use client";

import { createContext, useContext, useEffect, useReducer, useState, type ReactNode } from "react";
import type { OrderLine, OrderLineModifier } from "@octopus/api-client";
import type { FulfillmentChannel, PickupTiming } from "@/shared/lib/fulfillment";

const STORAGE_KEY = "octopus_cart_session";

export interface OrderingSessionState {
  tenantId: string | null;
  channel: FulfillmentChannel | null;
  deliveryAddress: string | null;
  branchId: string | null;
  tableNumber: string | null;
  lines: OrderLine[];
  promoCode: string | null;
  /** Gratuity for the floor staff, chosen on the dine-in screen. */
  tipSar: number;
  /** Whether a collected order is wanted now or at a set time. */
  pickupTiming: PickupTiming | null;
}

const INITIAL_STATE: OrderingSessionState = {
  tenantId: null,
  channel: null,
  deliveryAddress: null,
  branchId: null,
  tableNumber: null,
  lines: [],
  promoCode: null,
  tipSar: 0,
  pickupTiming: null,
};

type Action =
  | { type: "SET_CHANNEL"; tenantId: string; channel: FulfillmentChannel }
  | { type: "SET_DELIVERY_ADDRESS"; address: string }
  | { type: "SET_BRANCH"; branchId: string }
  | { type: "SET_TABLE"; tableNumber: string }
  | { type: "SET_TIP"; tipSar: number }
  | { type: "SET_PICKUP_TIMING"; timing: PickupTiming }
  | {
      type: "ADD_LINE";
      menuItemId: string;
      name: string;
      unitPriceSar: number;
      quantity: number;
      modifiers: OrderLineModifier[];
      notes: string;
      customerImageName?: string;
      customerImageSize?: number;
    }
  | {
      type: "REPLACE_LINE";
      lineId: string;
      menuItemId: string;
      name: string;
      unitPriceSar: number;
      quantity: number;
      modifiers: OrderLineModifier[];
      notes: string;
      customerImageName?: string;
      customerImageSize?: number;
    }
  | { type: "UPDATE_QUANTITY"; lineId: string; quantity: number }
  | { type: "REMOVE_LINE"; lineId: string }
  | { type: "APPLY_PROMO"; code: string | null }
  | { type: "CLEAR_CART" }
  | { type: "HYDRATE"; state: OrderingSessionState };

function generateLineId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function reducer(state: OrderingSessionState, action: Action): OrderingSessionState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;
    case "SET_CHANNEL":
      return { ...state, tenantId: action.tenantId, channel: action.channel };
    case "SET_DELIVERY_ADDRESS":
      return { ...state, deliveryAddress: action.address };
    case "SET_BRANCH":
      return { ...state, branchId: action.branchId };
    case "SET_TABLE":
      return { ...state, tableNumber: action.tableNumber };
    case "SET_TIP":
      return { ...state, tipSar: action.tipSar };
    case "SET_PICKUP_TIMING":
      return { ...state, pickupTiming: action.timing };
    case "ADD_LINE":
      return {
        ...state,
        lines: [
          ...state.lines,
          {
            lineId: generateLineId(),
            menuItemId: action.menuItemId,
            name: action.name,
            unitPriceSar: action.unitPriceSar,
            quantity: action.quantity,
            modifiers: action.modifiers,
            notes: action.notes,
            customerImageName: action.customerImageName,
            customerImageSize: action.customerImageSize,
          },
        ],
      };
    case "REPLACE_LINE":
      // Editing a line comes back through the product page carrying a lineId
      // from the URL. A stale or unknown id leaves the cart untouched rather
      // than throwing — a shared link should not strand the customer.
      return {
        ...state,
        lines: state.lines.map((line) =>
          line.lineId === action.lineId
            ? {
                ...line,
                menuItemId: action.menuItemId,
                name: action.name,
                unitPriceSar: action.unitPriceSar,
                quantity: action.quantity,
                modifiers: action.modifiers,
                notes: action.notes,
                customerImageName: action.customerImageName,
                customerImageSize: action.customerImageSize,
              }
            : line,
        ),
      };
    case "UPDATE_QUANTITY":
      if (action.quantity <= 0) {
        return { ...state, lines: state.lines.filter((line) => line.lineId !== action.lineId) };
      }
      return {
        ...state,
        lines: state.lines.map((line) =>
          line.lineId === action.lineId ? { ...line, quantity: action.quantity } : line,
        ),
      };
    case "REMOVE_LINE":
      return { ...state, lines: state.lines.filter((line) => line.lineId !== action.lineId) };
    case "APPLY_PROMO":
      return { ...state, promoCode: action.code };
    case "CLEAR_CART":
      return { ...state, lines: [], promoCode: null, tipSar: 0 };
    default:
      return state;
  }
}

interface OrderingSessionContextValue {
  state: OrderingSessionState;
  setChannel: (tenantId: string, channel: FulfillmentChannel) => void;
  setDeliveryAddress: (address: string) => void;
  setBranch: (branchId: string) => void;
  setTable: (tableNumber: string) => void;
  setTip: (tipSar: number) => void;
  setPickupTiming: (timing: PickupTiming) => void;
  addLine: (
    menuItemId: string,
    name: string,
    unitPriceSar: number,
    quantity: number,
    modifiers: OrderLineModifier[],
    notes: string,
    customerImageName?: string,
    customerImageSize?: number,
  ) => void;
  replaceLine: (
    lineId: string,
    menuItemId: string,
    name: string,
    unitPriceSar: number,
    quantity: number,
    modifiers: OrderLineModifier[],
    notes: string,
    customerImageName?: string,
    customerImageSize?: number,
  ) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  removeLine: (lineId: string) => void;
  applyPromo: (code: string | null) => void;
  clearCart: () => void;
}

const OrderingSessionContext = createContext<OrderingSessionContextValue | null>(null);

export function OrderingSessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as OrderingSessionState;
        dispatch({ type: "HYDRATE", state: { ...INITIAL_STATE, ...parsed } });
      } catch {
        // Corrupt local storage — keep the initial empty session.
      }
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Skip writes until hydration has run — otherwise the pre-hydration
    // initial state overwrites whatever was persisted before this mount
    // (and React StrictMode's double-invoked effects turn that into a race
    // that can wipe a real session on reload).
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const value: OrderingSessionContextValue = {
    state,
    setChannel: (tenantId, channel) => dispatch({ type: "SET_CHANNEL", tenantId, channel }),
    setDeliveryAddress: (address) => dispatch({ type: "SET_DELIVERY_ADDRESS", address }),
    setBranch: (branchId) => dispatch({ type: "SET_BRANCH", branchId }),
    setTable: (tableNumber) => dispatch({ type: "SET_TABLE", tableNumber }),
    setTip: (tipSar) => dispatch({ type: "SET_TIP", tipSar }),
    setPickupTiming: (timing) => dispatch({ type: "SET_PICKUP_TIMING", timing }),
    addLine: (menuItemId, name, unitPriceSar, quantity, modifiers, notes, customerImageName, customerImageSize) =>
      dispatch({
        type: "ADD_LINE", menuItemId, name, unitPriceSar, quantity, modifiers, notes,
        customerImageName, customerImageSize,
      }),
    replaceLine: (lineId, menuItemId, name, unitPriceSar, quantity, modifiers, notes, customerImageName, customerImageSize) =>
      dispatch({
        type: "REPLACE_LINE", lineId, menuItemId, name, unitPriceSar, quantity, modifiers, notes,
        customerImageName, customerImageSize,
      }),
    updateQuantity: (lineId, quantity) => dispatch({ type: "UPDATE_QUANTITY", lineId, quantity }),
    removeLine: (lineId) => dispatch({ type: "REMOVE_LINE", lineId }),
    applyPromo: (code) => dispatch({ type: "APPLY_PROMO", code }),
    clearCart: () => dispatch({ type: "CLEAR_CART" }),
  };

  return <OrderingSessionContext.Provider value={value}>{children}</OrderingSessionContext.Provider>;
}

export function useOrderingSession(): OrderingSessionContextValue {
  const context = useContext(OrderingSessionContext);
  if (!context) {
    throw new Error("useOrderingSession must be used within an OrderingSessionProvider");
  }
  return context;
}
