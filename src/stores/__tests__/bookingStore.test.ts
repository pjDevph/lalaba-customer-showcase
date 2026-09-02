// Unit tests for bookingStore payment timing (GAP-P0-028), the server-quote
// fulfillment input (GAP-P0-005), and safe error mapping.

import { createOnlineOrder, quoteOnlineOrder } from "../../services/graphql/booking";
import { ApiError } from "../../config/graphql";
import { useBookingStore, buildQuoteInput, derivePickupSubMode } from "../bookingStore";
import type { OnlinePaymentMethod, DeliverySubMode } from "../../types/api";

// jest.mock calls are hoisted above the imports by babel-plugin-jest-hoist.
jest.mock("../../config/firebase", () => ({ auth: {} }));
jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
  },
}));
jest.mock("../../services/graphql/booking", () => ({
  quoteOnlineOrder: jest.fn(),
  createOnlineOrder: jest.fn(),
}));
jest.mock("../addressStore", () => ({
  useAddressStore: { getState: jest.fn(() => ({ selectedAddressId: "addr-1" })) },
}));


const mockCreate = createOnlineOrder as jest.Mock;
const mockQuote = quoteOnlineOrder as jest.Mock;

function seedBooking(paymentMethod: OnlinePaymentMethod) {
  const s = useBookingStore.getState();
  s.startBooking("branch-1", "MERCHANT");
  s.setServiceLines([{ serviceRefId: "svc-1", serviceName: "Wash & fold", estimatedWeightKg: 5 }]);
  s.setPaymentMethod(paymentMethod);
}

describe("bookingStore.submit payment timing", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockCreate.mockResolvedValue({ _id: "order-1" });
    useBookingStore.getState().reset();
  });

  it.each<OnlinePaymentMethod>(["CASH", "EWALLET_OUTSIDE_APP"])(
    "always sends ON_PICKUP timing (payment at weigh-in, before custody) for %s",
    async (method) => {
      seedBooking(method);
      const order = await useBookingStore.getState().submit();
      expect(order).toEqual({ _id: "order-1" });
      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate.mock.calls[0][0].paymentTiming).toBe("ON_PICKUP");
    },
  );

  it("never sends ON_DELIVERY for cash (GAP-P0-028 regression)", async () => {
    seedBooking("CASH");
    await useBookingStore.getState().submit();
    expect(mockCreate.mock.calls[0][0].paymentTiming).not.toBe("ON_DELIVERY");
  });

  it("surfaces a safe error message when the BE leaks internals", async () => {
    mockCreate.mockRejectedValue(new ApiError(400, "BAD_REQUEST", "E11000 duplicate key error"));
    seedBooking("CASH");
    const order = await useBookingStore.getState().submit();
    expect(order).toBeNull();
    expect(useBookingStore.getState().error).toBe("Could not place the order.");
  });

  it("requires an address before submitting", async () => {
    const { useAddressStore } = jest.requireMock("../addressStore");
    useAddressStore.getState.mockReturnValueOnce({ selectedAddressId: null });
    seedBooking("CASH");
    const order = await useBookingStore.getState().submit();
    expect(order).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("sends a pickupSubMode on create consistent with the quote derivation", async () => {
    seedBooking("CASH");
    useBookingStore.getState().setSchedule("2026-08-20", PAID);
    await useBookingStore.getState().submit();
    const input = mockCreate.mock.calls[0][0];
    expect(input.pickupSubMode).toBe("SCHEDULED_PAID");
    expect(input.pickupSubMode).toBe(
      derivePickupSubMode(useBookingStore.getState().pickupMode, PAID),
    );
  });
});

// ─── Quote input builder (GAP-P0-005) ────────────────────────────────────────
// The tier is now the customer's explicit choice, not a property read off
// whichever 30-minute window they happened to tap.
const FREE: DeliverySubMode = "FREE_BATCH";
const PAID: DeliverySubMode = "SCHEDULED_PAID";

describe("derivePickupSubMode", () => {
  it("omits a sub-mode for customer drop-off (no pickup leg)", () => {
    expect(derivePickupSubMode("CUSTOMER_DROPOFF", PAID)).toBeUndefined();
  });

  it("maps a free window to FREE_BATCH and a paid window to SCHEDULED_PAID", () => {
    expect(derivePickupSubMode("PROVIDER_PICKUP", FREE)).toBe("FREE_BATCH");
    expect(derivePickupSubMode("PROVIDER_PICKUP", PAID)).toBe("SCHEDULED_PAID");
  });

  it("defaults to FREE_BATCH when no slot is chosen yet", () => {
    expect(derivePickupSubMode("PROVIDER_PICKUP", null)).toBe("FREE_BATCH");
  });

  it("never derives EXPRESS (not a valid pickup tier)", () => {
    expect(derivePickupSubMode("PROVIDER_PICKUP", PAID)).not.toBe("EXPRESS");
  });
});

describe("buildQuoteInput", () => {
  const base = {
    providerId: "branch-1",
    providerType: "MERCHANT" as const,
    serviceLines: [{ serviceRefId: "svc-1", serviceName: "Wash & fold", estimatedWeightKg: 5 }],
    pickupMode: "PROVIDER_PICKUP" as const,
    returnMode: "PROVIDER_DELIVERY" as const,
    deliverySubMode: "SCHEDULED_PAID" as const,
    turnaroundTier: "STANDARD" as const,
    pickupTier: PAID,
  };

  it("returns null when there is nothing to quote", () => {
    expect(buildQuoteInput({ ...base, providerId: null })).toBeNull();
    expect(buildQuoteInput({ ...base, providerType: null })).toBeNull();
    expect(buildQuoteInput({ ...base, serviceLines: [] })).toBeNull();
  });

  it("passes the full fulfillment selection so the server prices the fees", () => {
    expect(buildQuoteInput(base)).toEqual({
      branchId: "branch-1",
      providerType: "MERCHANT",
      serviceLines: [
        { serviceRefId: "svc-1", estimatedWeightKg: 5, estimatedPieceCount: undefined, replacementProductIds: undefined },
      ],
      pickupMode: "PROVIDER_PICKUP",
      pickupSubMode: "SCHEDULED_PAID",
      returnMode: "PROVIDER_DELIVERY",
      deliverySubMode: "SCHEDULED_PAID",
      // Speed rides along with the fulfillment selection so the quoted total
      // includes any express fee — otherwise the estimate would under-quote.
      turnaroundTier: "STANDARD",
    });
  });

  it("omits pickupSubMode for drop-off and deliverySubMode for self-pickup", () => {
    const input = buildQuoteInput({
      ...base,
      pickupMode: "CUSTOMER_DROPOFF",
      returnMode: "CUSTOMER_SELF_PICKUP",
    });
    expect(input).not.toBeNull();
    expect(input).not.toHaveProperty("pickupSubMode");
    expect(input).not.toHaveProperty("deliverySubMode");
    expect(input?.pickupMode).toBe("CUSTOMER_DROPOFF");
    expect(input?.returnMode).toBe("CUSTOMER_SELF_PICKUP");
  });

  it("omits deliverySubMode when delivery is chosen but no tier is set yet", () => {
    const input = buildQuoteInput({ ...base, deliverySubMode: null });
    expect(input).not.toHaveProperty("deliverySubMode");
  });

  it("carries piece-count and replacement-product line fields through", () => {
    const input = buildQuoteInput({
      ...base,
      serviceLines: [
        { serviceRefId: "svc-2", serviceName: "Dry clean", estimatedPieceCount: 3, replacementProductIds: ["p1"] },
      ],
    });
    expect(input?.serviceLines[0]).toEqual({
      serviceRefId: "svc-2",
      estimatedWeightKg: undefined,
      estimatedPieceCount: 3,
      replacementProductIds: ["p1"],
    });
  });

  it("includes a trimmed promoCode when set, and omits it otherwise", () => {
    expect(buildQuoteInput({ ...base, promoCode: "  save10  " })).toHaveProperty("promoCode", "save10");
    expect(buildQuoteInput({ ...base, promoCode: null })).not.toHaveProperty("promoCode");
    expect(buildQuoteInput({ ...base, promoCode: "   " })).not.toHaveProperty("promoCode");
  });
});

describe("bookingStore promo code", () => {
  beforeEach(() => {
    mockQuote.mockReset();
    useBookingStore.getState().reset();
    const s = useBookingStore.getState();
    s.startBooking("branch-1", "MERCHANT");
    s.setServiceLines([{ serviceRefId: "svc-1", serviceName: "Wash & fold", estimatedWeightKg: 5 }]);
  });

  it("applies a code the server recognises", async () => {
    mockQuote.mockResolvedValue({
      estimatedTotalCentavos: 45000,
      promoCode: "SAVE10",
      discountCentavos: 5000,
    });

    await useBookingStore.getState().applyPromoCode("save10");

    expect(useBookingStore.getState().promoCode).toBe("save10");
    expect(useBookingStore.getState().promoError).toBeNull();
    expect(useBookingStore.getState().quote?.promoCode).toBe("SAVE10");
  });

  it("clears the code and sets an error when the server didn't apply it", async () => {
    // The server silently ignores an invalid code — the quote comes back
    // with no promoCode/discount, never an error response.
    mockQuote.mockResolvedValue({ estimatedTotalCentavos: 50000 });

    await useBookingStore.getState().applyPromoCode("BOGUS");

    expect(useBookingStore.getState().promoCode).toBeNull();
    expect(useBookingStore.getState().promoError).toBe("That code isn't valid for this order.");
  });

  it("clearPromoCode resets state and re-quotes without a code", async () => {
    mockQuote.mockResolvedValue({ estimatedTotalCentavos: 50000, promoCode: "SAVE10", discountCentavos: 5000 });
    await useBookingStore.getState().applyPromoCode("SAVE10");

    mockQuote.mockResolvedValue({ estimatedTotalCentavos: 55000 });
    useBookingStore.getState().clearPromoCode();
    await Promise.resolve();

    expect(useBookingStore.getState().promoCode).toBeNull();
    expect(useBookingStore.getState().promoError).toBeNull();
  });
});

// ── Day-only scheduling ──────────────────────────────────────────────────────
//
// The customer picks a DAY and a tier. There is no window to infer a tier
// from any more, and the date is what the server counts day capacity on.

describe("pickup day scheduling", () => {
  it("sends the chosen day, with no times attached", () => {
    useBookingStore.setState({
      providerId: "p1",
      providerType: "MERCHANT",
      pickupMode: "PROVIDER_PICKUP",
      pickupDate: "2026-08-18",
      pickupTier: PAID,
    });
    const input = buildQuoteInput(useBookingStore.getState());
    expect(input).not.toBeNull();
    expect(input?.pickupSubMode).toBe(PAID);
    expect(input).not.toHaveProperty("scheduledPickup.startTime");
  });

  it("keeps the tier when the day changes — it is not a property of the day", () => {
    useBookingStore.setState({ pickupTier: PAID, pickupDate: "2026-08-18" });
    useBookingStore.getState().setSchedule("2026-08-19", PAID);
    expect(useBookingStore.getState().pickupDate).toBe("2026-08-19");
    expect(useBookingStore.getState().pickupTier).toBe(PAID);
  });

  it("defaults to the batched tier when the customer has not chosen", () => {
    expect(derivePickupSubMode("PROVIDER_PICKUP", null)).toBe(FREE);
  });

  it("sends no pickup tier at all for a dropoff", () => {
    expect(derivePickupSubMode("CUSTOMER_DROPOFF", PAID)).toBeUndefined();
  });
});

