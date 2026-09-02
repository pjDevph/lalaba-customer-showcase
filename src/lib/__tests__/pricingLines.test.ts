// Unit tests for server-authoritative pricing presentation (GAP-H-015/P0-005).

import { pricingViewOf } from "../pricingLines";
import type { OrderPricing } from "../../types/api";

function pricing(p: Partial<OrderPricing>): OrderPricing {
  return {
    estimatedWeightKg: null,
    estimatedTotalCentavos: 0,
    actualWeightKg: null,
    actualPieceCount: null,
    actualServiceTotalCentavos: null,
    customerTotalCentavos: null,
    platformFeePercent: null,
    platformFeeCentavos: null,
    serviceSubtotalCentavos: null,
    pickupFeeCentavos: null,
    returnFeeCentavos: null,
  turnaroundFeeCentavos: null,
    pricingRuleVersion: null,
    promoCode: null,
    discountCentavos: null,
    ...p,
  };
}

function byLabel(view: ReturnType<typeof pricingViewOf>, label: string) {
  return view.lines.find((l) => l.label === label);
}

describe("pricingViewOf", () => {
  it("returns empty view for a missing quote", () => {
    expect(pricingViewOf(null)).toEqual({ lines: [], totalCentavos: 0 });
    expect(pricingViewOf(undefined)).toEqual({ lines: [], totalCentavos: 0 });
  });

  it("renders the estimated quote entirely from server fields", () => {
    const view = pricingViewOf(
      pricing({
        serviceSubtotalCentavos: 50000,
        platformFeeCentavos: 5000,
        pickupFeeCentavos: 5000,
        returnFeeCentavos: 12000,
        estimatedTotalCentavos: 72000,
        pricingRuleVersion: "fulfillment-fees-v1",
      }),
    );
    expect(view.totalCentavos).toBe(72000);
    // Service + folded platform fee (₱500 + ₱50).
    expect(byLabel(view, "Laundry service")?.amountCentavos).toBe(55000);
    // The platform fee is folded into the service line, never itemised (§16
    // reversal, 2026-08-15) — the customer sees what the laundry costs.
    expect(byLabel(view, "Lalaba platform fee")).toBeUndefined();
    expect(byLabel(view, "Pickup")).toMatchObject({ amountCentavos: 5000, free: false });
    expect(byLabel(view, "Return")).toMatchObject({ amountCentavos: 12000, free: false });
    // Sanity: displayed lines sum to the server total.
    const sum = view.lines.reduce((s, l) => s + (l.amountCentavos ?? 0), 0);
    expect(sum).toBe(view.totalCentavos);
  });

  it("prefers the weighed totals once the order is finalized", () => {
    const view = pricingViewOf(
      pricing({
        serviceSubtotalCentavos: 50000,
        actualServiceTotalCentavos: 61000,
        platformFeeCentavos: 6100,
        pickupFeeCentavos: 0,
        returnFeeCentavos: 5000,
        estimatedTotalCentavos: 60000,
        customerTotalCentavos: 72100,
      }),
    );
    expect(view.totalCentavos).toBe(72100); // customerTotal wins
    expect(byLabel(view, "Laundry service")?.amountCentavos).toBe(67100);
    expect(byLabel(view, "Pickup")?.free).toBe(true);
  });

  it("marks zero fees as free", () => {
    const view = pricingViewOf(
      pricing({ serviceSubtotalCentavos: 10000, platformFeeCentavos: 1000, pickupFeeCentavos: 0, returnFeeCentavos: 0, estimatedTotalCentavos: 11000 }),
    );
    expect(byLabel(view, "Pickup")?.free).toBe(true);
    expect(byLabel(view, "Return")?.free).toBe(true);
  });

  it("backs the service line out of the total for legacy orders without fee fields", () => {
    const view = pricingViewOf(
      pricing({ estimatedTotalCentavos: 33000, platformFeeCentavos: 3000 }),
    );
    expect(view.totalCentavos).toBe(33000);
    // Backed out of the total, then folded straight back in — a legacy order
    // still shows one service figure that matches what is charged.
    expect(byLabel(view, "Laundry service")?.amountCentavos).toBe(33000);
    expect(byLabel(view, "Lalaba platform fee")).toBeUndefined();
  });

  it("keeps the server total even when line data is inconsistent", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const view = pricingViewOf(
      pricing({ serviceSubtotalCentavos: 40000, platformFeeCentavos: 4000, pickupFeeCentavos: 0, returnFeeCentavos: 0, estimatedTotalCentavos: 50000 }),
    );
    expect(view.totalCentavos).toBe(50000); // server is authoritative
    warn.mockRestore();
  });

  it("shows an applied promo as a discount line and does not warn about the line sum", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const view = pricingViewOf(
      pricing({
        serviceSubtotalCentavos: 50000,
        platformFeeCentavos: 5000,
        pickupFeeCentavos: 0,
        returnFeeCentavos: 0,
        estimatedTotalCentavos: 50000, // 55,000 pre-discount minus 5,000 code
        promoCode: "SAVE10",
        discountCentavos: 5000,
      }),
    );
    const discountLine = byLabel(view, "Promo (SAVE10)");
    expect(discountLine?.discount).toBe(true);
    expect(discountLine?.amountCentavos).toBe(5000);
    expect(view.totalCentavos).toBe(50000);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("omits the discount line when no promo was applied", () => {
    const view = pricingViewOf(pricing({ estimatedTotalCentavos: 10000, serviceSubtotalCentavos: 10000 }));
    expect(view.lines.some((l) => l.discount)).toBe(false);
  });
});
