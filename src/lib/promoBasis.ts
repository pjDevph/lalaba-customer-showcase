// src/lib/promoBasis.ts
// The amount a voucher is judged against.

/**
 * The PRE-discount order total.
 *
 * `estimatedTotalCentavos` is post-discount — the server subtracts the applied
 * discount before returning it. So asking "can I use this ₱100 voucher on an
 * order over ₱500?" while a ₱100 voucher is already applied would ask about
 * ₱100 less than the order is really worth, and a minimum-spend rule would
 * start failing for no reason the customer could see. Worse, it would fail
 * only when swapping vouchers, which is exactly when it looks like a bug in
 * the voucher rather than in the arithmetic.
 *
 * The server validates against the pre-discount total (`preDiscountTotalCentavos`
 * in createOrder), so the preview has to use the same basis or the two answers
 * disagree.
 */
export function promoBasisCentavos(
  quote: {
    estimatedTotalCentavos?: number | null;
    discountCentavos?: number | null;
  } | null
  | undefined,
): number {
  const total = quote?.estimatedTotalCentavos ?? 0;
  const applied = quote?.discountCentavos ?? 0;
  return Math.max(0, total) + Math.max(0, applied);
}
