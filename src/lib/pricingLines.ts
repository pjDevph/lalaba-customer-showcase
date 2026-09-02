// src/lib/pricingLines.ts
// ─────────────────────────────────────────────────────────────────────────────
// SERVER-AUTHORITATIVE PRICING PRESENTATION (GAP-H-015 / GAP-P0-005)
//
// The BE quote/order pricing is the single source of truth:
//   estimatedTotalCentavos  = serviceSubtotal + platformFee + pickupFee + returnFee
//   customerTotalCentavos   = actualServiceTotal + platformFee + pickupFee + returnFee
// This module turns an OrderPricing into display lines. The FE performs NO fee
// math of its own — the only arithmetic here is a dev-time sanity check and a
// legacy fallback for orders created before the fee fields existed.
// ─────────────────────────────────────────────────────────────────────────────

import type { OrderPricing } from "../types/api";
import type { PriceLine } from "../components/PriceBreakdown";

export interface PricingView {
  lines: PriceLine[];
  /** Server total (fee-inclusive) — always what the customer is shown/charged. */
  totalCentavos: number;
}

const isDev = typeof __DEV__ !== "undefined" && __DEV__;

/**
 * Build the customer-facing price lines from server pricing.
 * Line order: Laundry service · Pickup · Return.
 *
 * The platform fee is NOT a customer-facing line (2026-08-15 product decision,
 * reversing settled-decisions §16 back to the original TSD rule). It is folded
 * into the laundry-service figure instead of itemised, so what the customer
 * sees is simply what the laundry costs.
 *
 * Folded, not dropped: the customer still pays it, and the total is unchanged.
 * Removing the line without folding would leave a breakdown whose parts no
 * longer add up to the total — worse than showing the fee.
 *
 * The fee remains fully visible on the provider side, where it is their cost,
 * and in `pricing.platformFeeCentavos` for reconciliation.
 */
export function pricingViewOf(pricing: OrderPricing | null | undefined): PricingView {
  if (!pricing) return { lines: [], totalCentavos: 0 };

  const total = pricing.customerTotalCentavos ?? pricing.estimatedTotalCentavos ?? 0;
  const platformFee = pricing.platformFeeCentavos ?? 0;
  const pickupFee = pricing.pickupFeeCentavos ?? 0;
  const returnFee = pricing.returnFeeCentavos ?? 0;
  const turnaroundFee = pricing.turnaroundFeeCentavos ?? 0;
  // Weighed orders: actual service total. Otherwise the server's estimated
  // subtotal; for legacy orders without the field, back it out of the total
  // (display-only fallback — the server total is still what's charged).
  const service =
    pricing.actualServiceTotalCentavos ??
    pricing.serviceSubtotalCentavos ??
    Math.max(0, total - platformFee - pickupFee - returnFee - turnaroundFee);
  // Already subtracted into `total` server-side — this line is presentational
  // only, so the discount is visible rather than silently folded away.
  const discount = pricing.discountCentavos ?? 0;

  // Sanity assertion (dev only): lines should sum to the server total. If they
  // don't, the server total still wins — we only log the discrepancy.
  if (isDev) {
    const sum = service + platformFee + pickupFee + returnFee + turnaroundFee - discount;
    if (total > 0 && sum !== total) {
      console.warn(`[pricingLines] line sum ${sum} != server total ${total} (rule ${pricing.pricingRuleVersion ?? "?"})`);
    }
  }

  return {
    lines: [
      // Unpriced until the laundry is weighed. Marked pending rather than left
      // to render as ₱0, which read as a free wash.
      {
        label: "Laundry service",
        amountCentavos: service + platformFee,
        pending: service + platformFee === 0,
      },
      { label: "Pickup", free: pickupFee === 0, amountCentavos: pickupFee },
      { label: "Return", free: returnFee === 0, amountCentavos: returnFee },
      // Only shown when bought — a "Express: Free" line would read as an offer.
      ...(turnaroundFee > 0
        ? [{ label: "Express turnaround", amountCentavos: turnaroundFee }]
        : []),
      ...(discount > 0
        ? [{
            label: pricing.promoCode ? `Promo (${pricing.promoCode})` : "Promo discount",
            amountCentavos: discount,
            discount: true,
          }]
        : []),
    ],
    totalCentavos: total,
  };
}
