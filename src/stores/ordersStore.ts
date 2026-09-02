// src/stores/ordersStore.ts
// The customer's online orders: list + per-id detail cache + the customer-side
// action mutation wrappers (all of which return the updated order, which we
// fold back into both the list and the detail cache).

import { create } from "zustand";
import { userErrorMessage } from "../utils/userError";
import {
  myOnlineOrders,
  onlineOrder,
  onlineOrderTimeline,
  respondToProviderChange,
  cancelOnlineOrder,
  reschedulePickup,
  cancelAfterFailedPickup,
  respondToQualityHold,
  chooseReturnOption,
  scheduleRedelivery,
} from "../services/graphql/orders";
import type { OnlineOrder, OrderEvent, FulfillmentReturnMode } from "../types/api";

interface OrdersState {
  orders: OnlineOrder[];
  detail: Record<string, OnlineOrder>;
  timelines: Record<string, OrderEvent[]>;
  isLoading: boolean;
  actionInFlight: boolean;
  error: string | null;

  loadOrders: () => Promise<void>;
  loadOrder: (id: string) => Promise<OnlineOrder | null>;
  loadTimeline: (orderId: string) => Promise<void>;

  // Action mutations
  approveProviderChange: (orderId: string, approve: boolean) => Promise<void>;
  cancel: (orderId: string, reason: string) => Promise<void>;
  reschedule: (orderId: string) => Promise<void>;
  cancelAfterFailed: (orderId: string) => Promise<void>;
  respondQualityHold: (orderId: string, approve: boolean) => Promise<void>;
  chooseReturn: (orderId: string, returnMode: FulfillmentReturnMode) => Promise<void>;
  scheduleRedeliver: (orderId: string) => Promise<void>;

  reset: () => void;
}

// Safe user-facing error mapping (RISK-H-032) - never raw server text.
function errMsg(err: unknown, fallback: string): string {
  return userErrorMessage(err, fallback);
}

export const useOrdersStore = create<OrdersState>()((set, get) => {
  // Fold an updated order into both the list and the detail cache.
  function applyUpdated(updated: OnlineOrder): void {
    const orders = get().orders.some((o) => o._id === updated._id)
      ? get().orders.map((o) => (o._id === updated._id ? updated : o))
      : [updated, ...get().orders];
    set({ orders, detail: { ...get().detail, [updated._id]: updated } });
  }

  // Shared wrapper for the action mutations.
  async function runAction(
    fn: () => Promise<OnlineOrder>,
    fallback: string,
  ): Promise<void> {
    set({ actionInFlight: true, error: null });
    try {
      applyUpdated(await fn());
    } catch (err) {
      set({ error: errMsg(err, fallback) });
    } finally {
      set({ actionInFlight: false });
    }
  }

  return {
    orders: [],
    detail: {},
    timelines: {},
    isLoading: false,
    actionInFlight: false,
    error: null,

    loadOrders: async () => {
      set({ isLoading: true, error: null });
      try {
        set({ orders: await myOnlineOrders(), isLoading: false });
      } catch (err) {
        set({ error: errMsg(err, "Could not load your orders."), isLoading: false });
      }
    },

    loadOrder: async (id) => {
      set({ error: null });
      try {
        const order = await onlineOrder(id);
        set({ detail: { ...get().detail, [id]: order } });
        return order;
      } catch (err) {
        set({ error: errMsg(err, "Could not load this order.") });
        return null;
      }
    },

    loadTimeline: async (orderId) => {
      try {
        const events = await onlineOrderTimeline(orderId);
        set({ timelines: { ...get().timelines, [orderId]: events } });
      } catch (err) {
        set({ error: errMsg(err, "Could not load the order timeline.") });
      }
    },

    approveProviderChange: (orderId, approve) =>
      runAction(() => respondToProviderChange(orderId, approve), "Could not submit your response."),

    cancel: (orderId, reason) =>
      runAction(() => cancelOnlineOrder(orderId, reason), "Could not cancel the order."),

    reschedule: (orderId) =>
      runAction(() => reschedulePickup(orderId), "Could not reschedule pickup."),

    cancelAfterFailed: (orderId) =>
      runAction(() => cancelAfterFailedPickup(orderId), "Could not cancel the order."),

    respondQualityHold: (orderId, approve) =>
      runAction(() => respondToQualityHold(orderId, approve), "Could not submit your response."),

    chooseReturn: (orderId, returnMode) =>
      runAction(() => chooseReturnOption(orderId, returnMode), "Could not choose a return option."),

    scheduleRedeliver: (orderId) =>
      runAction(() => scheduleRedelivery(orderId), "Could not schedule redelivery."),

    reset: () => set({ orders: [], detail: {}, timelines: {}, isLoading: false, actionInFlight: false, error: null }),
  };
});
