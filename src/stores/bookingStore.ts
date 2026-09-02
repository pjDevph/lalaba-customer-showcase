// src/stores/bookingStore.ts
// ─────────────────────────────────────────────────────────────────────────────
// BOOKING WIZARD (7 steps)
//   1. provider   → providerId + providerType (set when entering from a profile)
//   2. services   → selected service line(s) with per-line estimatedWeightKg
//   3. bags       → bagCount
//   4. fulfillment→ pickupMode / returnMode / deliverySubMode
//   5. schedule   → pickup date (YYYY-MM-DD) + chosen slot
//   6. payment    → OnlinePaymentMethod choice + PaymentTiming (Pay Later, if the provider allows it)
//   7. review     → instructions + live quote, then submit()
//
// The live `quote` (OrderPricing) is refreshed via refreshQuote() whenever the
// service lines change; submit() creates the order and returns it.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";
import { userErrorMessage } from "../utils/userError";
import {
  quoteOnlineOrder,
  createOnlineOrder,
  type CreateOnlineOrderInput,
  type QuoteOrderInput,
  type OrderInstructionsInput,
} from "../services/graphql/booking";
import { useAddressStore } from "./addressStore";
import type {
  ProviderType,
  OrderPricing,
  OnlineOrder,
  FulfillmentPickupMode,
  FulfillmentReturnMode,
  DeliverySubMode,
  TurnaroundTierCode,
  OnlinePaymentMethod,
  PaymentTiming,
} from "../types/api";

// Pickup slot tier → the BE's pickupSubMode (FREE_BATCH default; a slot with a
// fee is a SCHEDULED_PAID window; EXPRESS is never a pickup tier). Drop-off has
// no pickup leg, so no sub-mode is sent.
/**
 * The tier is now the customer's explicit choice, not something derived.
 *
 * It used to be read off whichever 30-minute window they tapped — the first
 * two of the day were free, the rest paid. With the window gone there is
 * nothing to infer from, and nothing to get wrong: a dropoff has no pickup
 * tier at all, and otherwise we send exactly what they picked.
 */
export function derivePickupSubMode(
  pickupMode: FulfillmentPickupMode,
  tier: DeliverySubMode | null,
): DeliverySubMode | undefined {
  if (pickupMode === "CUSTOMER_DROPOFF") return undefined;
  return tier ?? "FREE_BATCH";
}

// The quote request mirrors the user's current fulfillment selection so the
// server prices pickup/return fees into the quote (GAP-P0-005). Pure — exported
// for unit tests. Returns null when there is nothing to quote yet.
export function buildQuoteInput(s: {
  providerId: string | null;
  providerType: ProviderType | null;
  serviceLines: BookingServiceLine[];
  pickupMode: FulfillmentPickupMode;
  returnMode: FulfillmentReturnMode;
  deliverySubMode: DeliverySubMode | null;
  turnaroundTier: TurnaroundTierCode;
  pickupTier: DeliverySubMode | null;
  promoCode?: string | null;
}): QuoteOrderInput | null {
  if (!s.providerId || !s.providerType || s.serviceLines.length === 0) return null;
  const input: QuoteOrderInput = {
    branchId: s.providerId,
    providerType: s.providerType,
    turnaroundTier: s.turnaroundTier,
    serviceLines: s.serviceLines.map((l) => ({
      serviceRefId: l.serviceRefId,
      estimatedWeightKg: l.estimatedWeightKg,
      estimatedPieceCount: l.estimatedPieceCount,
      replacementProductIds: l.replacementProductIds,
    })),
    pickupMode: s.pickupMode,
    returnMode: s.returnMode,
  };
  const pickupSubMode = derivePickupSubMode(s.pickupMode, s.pickupTier);
  if (pickupSubMode) input.pickupSubMode = pickupSubMode;
  if (s.returnMode === "PROVIDER_DELIVERY" && s.deliverySubMode) {
    input.deliverySubMode = s.deliverySubMode;
  }
  if (s.promoCode?.trim()) input.promoCode = s.promoCode.trim();
  return input;
}

// A service line under construction in the wizard.
export interface BookingServiceLine {
  serviceRefId: string;
  serviceName: string;
  estimatedWeightKg?: number;
  estimatedPieceCount?: number;
  note?: string;
  replacementProductIds?: string[];
}

interface BookingState {
  // 1. provider
  providerId: string | null;
  providerType: ProviderType | null;

  // 2 / 3. services + bags
  serviceLines: BookingServiceLine[];
  bagCount: number;

  // 4. fulfillment
  pickupMode: FulfillmentPickupMode;
  returnMode: FulfillmentReturnMode;
  deliverySubMode: DeliverySubMode | null;
  /** How fast the laundry must be DONE — priced apart from the legs. */
  turnaroundTier: TurnaroundTierCode;

  // 5. schedule
  pickupDate: string | null; // YYYY-MM-DD
  pickupTier: DeliverySubMode | null;

  // 6. payment
  paymentMethod: OnlinePaymentMethod | null;
  /** ON_PICKUP (default) or, when the provider opts in, AT_FINAL_HANDOVER. */
  paymentTiming: PaymentTiming;

  // 7. instructions + live quote
  instructions: OrderInstructionsInput;
  quote: OrderPricing | null;
  isQuoting: boolean;
  isSubmitting: boolean;
  error: string | null;
  /** Applied on the review screen — re-quoted, and re-validated at submit. */
  promoCode: string | null;
  promoError: string | null;

  // Actions
  startBooking: (providerId: string, providerType: ProviderType) => void;
  setServiceLines: (lines: BookingServiceLine[]) => void;
  upsertServiceLine: (line: BookingServiceLine) => void;
  removeServiceLine: (serviceRefId: string) => void;
  setBagCount: (n: number) => void;
  setFulfillment: (f: {
    pickupMode?: FulfillmentPickupMode;
    returnMode?: FulfillmentReturnMode;
    deliverySubMode?: DeliverySubMode | null;
    turnaroundTier?: TurnaroundTierCode;
  }) => void;
  setSchedule: (date: string | null, tier: DeliverySubMode | null) => void;
  setPaymentMethod: (m: OnlinePaymentMethod | null) => void;
  setPaymentTiming: (t: PaymentTiming) => void;
  setInstructions: (i: Partial<OrderInstructionsInput>) => void;
  applyPromoCode: (code: string) => Promise<void>;
  clearPromoCode: () => void;
  refreshQuote: () => Promise<void>;
  submit: () => Promise<OnlineOrder | null>;
  reset: () => void;
}

const INITIAL: Omit<
  BookingState,
  | "startBooking" | "setServiceLines" | "upsertServiceLine" | "removeServiceLine"
  | "setBagCount" | "setFulfillment" | "setSchedule" | "setPaymentMethod" | "setPaymentTiming"
  | "setInstructions" | "applyPromoCode" | "clearPromoCode" | "refreshQuote" | "submit" | "reset"
> = {
  providerId: null,
  providerType: null,
  serviceLines: [],
  bagCount: 1,
  pickupMode: "PROVIDER_PICKUP",
  returnMode: "PROVIDER_DELIVERY",
  deliverySubMode: "FREE_BATCH",
  turnaroundTier: "STANDARD",
  pickupDate: null,
  pickupTier: null,
  paymentMethod: null,
  paymentTiming: "ON_PICKUP",
  instructions: {},
  quote: null,
  isQuoting: false,
  isSubmitting: false,
  error: null,
  promoCode: null,
  promoError: null,
};

export const useBookingStore = create<BookingState>()((set, get) => ({
  ...INITIAL,

  startBooking: (providerId, providerType) =>
    set({ ...INITIAL, providerId, providerType }),

  setServiceLines: (serviceLines) => set({ serviceLines }),

  upsertServiceLine: (line) => {
    const existing = get().serviceLines;
    const idx = existing.findIndex((l) => l.serviceRefId === line.serviceRefId);
    const serviceLines =
      idx >= 0
        ? existing.map((l, i) => (i === idx ? line : l))
        : [...existing, line];
    set({ serviceLines });
  },

  removeServiceLine: (serviceRefId) =>
    set({ serviceLines: get().serviceLines.filter((l) => l.serviceRefId !== serviceRefId) }),

  setBagCount: (n) => set({ bagCount: Math.max(1, Math.floor(n)) }),

  // Fulfillment and schedule changes re-quote automatically: the server prices
  // pickup/return fees into the quote, so the shown total must track them.
  setFulfillment: (f) => {
    set((s) => ({
      pickupMode: f.pickupMode ?? s.pickupMode,
      returnMode: f.returnMode ?? s.returnMode,
      deliverySubMode: f.deliverySubMode !== undefined ? f.deliverySubMode : s.deliverySubMode,
      turnaroundTier: f.turnaroundTier ?? s.turnaroundTier,
    }));
    void get().refreshQuote();
  },

  setSchedule: (pickupDate, pickupTier) => {
    set({ pickupDate, pickupTier });
    void get().refreshQuote();
  },

  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setPaymentTiming: (paymentTiming) => set({ paymentTiming }),

  setInstructions: (i) => set((s) => ({ instructions: { ...s.instructions, ...i } })),

  // The server silently ignores an invalid/expired/ineligible code in the
  // quote (no discount, no error) rather than failing the whole preview — so
  // "did it actually apply" is answered by checking the quote that comes
  // back, not by whether refreshQuote threw.
  applyPromoCode: async (code) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    set({ promoCode: trimmed, promoError: null });
    await get().refreshQuote();
    const quote = get().quote;
    if (!quote?.promoCode) {
      set({
        promoCode: null,
        promoError: "That code isn't valid for this order.",
      });
      await get().refreshQuote();
    }
  },

  clearPromoCode: () => {
    set({ promoCode: null, promoError: null });
    void get().refreshQuote();
  },

  refreshQuote: async () => {
    const input = buildQuoteInput(get());
    if (!input) {
      set({ quote: null });
      return;
    }
    set({ isQuoting: true, error: null });
    try {
      const quote = await quoteOnlineOrder(input);
      set({ quote, isQuoting: false });
    } catch (err) {
      set({
        error: userErrorMessage(err, "Could not price this order."),
        isQuoting: false,
      });
    }
  },

  submit: async () => {
    const s = get();
    const addressId = useAddressStore.getState().selectedAddressId;
    if (!s.providerId || !s.providerType) {
      set({ error: "No provider selected." });
      return null;
    }
    if (!addressId) {
      set({ error: "Select a delivery address first." });
      return null;
    }
    if (s.serviceLines.length === 0) {
      set({ error: "Add at least one service." });
      return null;
    }
    set({ isSubmitting: true, error: null });
    try {
      const input: CreateOnlineOrderInput = {
        branchId: s.providerId,
        providerType: s.providerType,
        addressId,
        pickupMode: s.pickupMode,
        returnMode: s.returnMode,
        // Same derivation as the quote (buildQuoteInput) so create prices
        // exactly what the review screen displayed.
        pickupSubMode: derivePickupSubMode(s.pickupMode, s.pickupTier),
        turnaroundTier: s.turnaroundTier,
        serviceLines: s.serviceLines.map((l) => ({
          serviceRefId: l.serviceRefId,
          estimatedWeightKg: l.estimatedWeightKg,
          estimatedPieceCount: l.estimatedPieceCount,
          note: l.note,
          replacementProductIds: l.replacementProductIds,
        })),
        instructions: s.instructions,
        // GAP-P0-028: ON_PICKUP is the floor — payment (cash or e-wallet
        // transfer outside the app) is collected at weigh/finalize by
        // default. AT_FINAL_HANDOVER only reaches here when the provider
        // opted into Pay Later and the customer chose it on this screen.
        paymentTiming: s.paymentTiming,
      };
      if (s.deliverySubMode) input.deliverySubMode = s.deliverySubMode;
      if (s.promoCode) input.promoCode = s.promoCode;
      // The chosen DAY. The server re-validates it against the provider's
      // booking availability and holds a place in that day, so a day that
      // filled up while the customer was on the review screen is rejected here
      // rather than silently overbooked. It is mandatory server-side: day
      // capacity is counted on this date, so an order without one would occupy
      // a real place while counting toward nothing.
      if (s.pickupDate) {
        input.scheduledPickup = { date: s.pickupDate };
      }

      const order = await createOnlineOrder(input);
      set({ isSubmitting: false });
      return order;
    } catch (err) {
      set({
        error: userErrorMessage(err, "Could not place the order."),
        isSubmitting: false,
      });
      return null;
    }
  },

  reset: () => set({ ...INITIAL }),
}));
