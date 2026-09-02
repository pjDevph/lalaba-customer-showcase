// src/features/booking/serviceHelpers.ts
// Pure pricing/label helpers for the Step-1 service cart. Split out of
// service.tsx (F2, 600-line limit). No JSX and no store access — everything
// here is a pure function of its arguments, so it is directly unit-testable.
// Lives under src/, not app/: expo-router scans every file in app/ and warns
// "missing the required default export" for anything that is not a route —
// the `_` prefix does NOT exempt it (only _layout is special).
import { peso } from "@/theme/tokens";
import type { ProviderServiceItem, PricingType, ServiceCategory } from "@/types/api";
import { loadsFor, pluralUnit } from "./parts";

export const SIZES = [
  {
    key: "SMALL", label: "Small", kgLow: 2, kgHigh: 3, kgMid: 2.5,
    basketHint: "~1 light basket", persona: "1 person · quick wash",
    examples: "e.g. ~10-12 shirts or 1 sheet set",
  },
  {
    key: "MEDIUM", label: "Medium", kgLow: 4, kgHigh: 6, kgMid: 5,
    basketHint: "~1 full basket", persona: "2-3 people · daily clothes + sheets",
    examples: "e.g. a full load for one machine",
  },
  {
    key: "LARGE", label: "Large", kgLow: 7, kgHigh: 10, kgMid: 8.5,
    basketHint: "~2 full baskets", persona: "family load · bulky items",
    examples: "e.g. blankets, curtains, or a week of laundry",
  },
] as const;
export type SizeKey = (typeof SIZES)[number]["key"];

// A weight band spans two kg endpoints, so the FE quotes a RANGE rather than a
// single midpoint — that's honest about the uncertainty before weighing.
export const UNSURE = { kgLow: SIZES[0].kgLow, kgHigh: SIZES[SIZES.length - 1].kgHigh };
export const CATALOG_PREVIEW = 3;
// Category chips only earn their space once the catalog is big enough that
// scanning it flat becomes work — a 4-service provider doesn't need them.
export const CATEGORY_CHIP_THRESHOLD = 6;

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  BAGS: "Bags",
  BEDDING: "Bedding",
  CURTAINS: "Curtains",
  DELICATE: "Delicate",
  DRY_CLEAN: "Dry Clean",
  EXPRESS: "Express",
  IRON_ONLY: "Iron Only",
  OTHER: "Other",
  SHOES: "Shoes",
  WASH_AND_FOLD: "Wash & Fold",
  WASH_AND_IRON: "Wash & Iron",
  WASH_ONLY: "Wash Only",
};

// Weight-driven services: the customer enters kilos, whatever the provider
// charges by. A per-load home washer belongs here too — she prices by machine
// load, but the customer still has a basket to weigh.
export const isWeight = (t?: PricingType) =>
  t === "PER_KILO" ||
  t === "PER_KILO_WITH_BASE" ||
  t === "PER_LOAD_WITH_CAPACITY";
export function sizeOfKg(kg?: number): SizeKey | null {
  if (kg == null) return null;
  return SIZES.reduce<SizeKey | null>((best, s) => (Math.abs(s.kgMid - kg) < 0.6 ? s.key : best), null);
}
// Price (centavos) for a given weight, from the already marked-up catalog rate.
// Mirrors calculateServiceLineTotal in the backend — the estimate the customer
// sees before booking has to agree with the quote she is charged.
export function weightPriceAt(svc: ProviderServiceItem, kg: number): number {
  if (svc.pricingType === "PER_KILO_WITH_BASE") {
    const billable = Math.max(kg, svc.minKg ?? 0);
    const excess = Math.max(0, billable - (svc.baseKilos ?? 0));
    return Math.round(svc.price + excess * (svc.excessRate ?? 0));
  }
  if (svc.pricingType === "PER_LOAD_WITH_CAPACITY") {
    // baseKilos is the machine's capacity here, not an included allowance.
    return Math.round(loadsFor(kg, svc.baseKilos) * svc.price);
  }
  return Math.round(Math.max(kg, svc.minKg ?? 0) * svc.price); // PER_KILO
}
// What "₱180/load" leaves unsaid: how much fits in a load, and how much of a
// per-kg minimum applies. Without it two washers at the same headline rate look
// identical when their actual bills differ.
export function rateSuffix(svc: ProviderServiceItem): string {
  if (svc.pricingType === "PER_LOAD_WITH_CAPACITY") {
    return svc.baseKilos ? ` · up to ${svc.baseKilos} kg per load` : "";
  }
  if (svc.pricingType === "PER_KILO" && svc.minKg) {
    return ` · ${svc.minKg} kg minimum`;
  }
  return "";
}

// What a size bucket means in this provider's own unit — a per-load washer's
// "Medium" is "~1 load", a per-kg one's is a basket-fullness description.
// Physical, not pricing: two providers on different rates still both have a
// "full basket" at 4-6kg.
export function sizeSubtitle(svc: ProviderServiceItem, s: (typeof SIZES)[number]): string {
  if (svc.pricingType === "PER_LOAD_WITH_CAPACITY") {
    const loads = loadsFor(s.kgMid, svc.baseKilos);
    return `~${loads} ${pluralUnit("load", loads)}`;
  }
  return s.basketHint;
}

// [min, max] centavos for a line; undefined when the amount isn't set yet.
export function lineRange(svc: ProviderServiceItem, kg?: number, count?: number, isUnsure?: boolean, isManual?: boolean): [number, number] | undefined {
  if (isWeight(svc.pricingType)) {
    // A manually-entered weight is exact, not a bucket midpoint — quote a
    // single price instead of a [low, high] range built for the uncertainty
    // buckets carry.
    if (isManual) {
      if (kg == null) return undefined;
      const p = weightPriceAt(svc, kg);
      return [p, p];
    }
    const band = isUnsure ? UNSURE : SIZES.find((s) => s.key === sizeOfKg(kg));
    if (!band) return undefined;
    return [weightPriceAt(svc, band.kgLow), weightPriceAt(svc, band.kgHigh)];
  }
  if (svc.pricingType === "PER_PIECE") { const c = (count ?? 1) * svc.price; return [c, c]; }
  return [svc.price, svc.price]; // PER_LOAD / flat
}
export const money = (r?: [number, number]) => (!r ? "To be confirmed" : r[0] === r[1] ? peso(r[0]) : `${peso(r[0])} – ${peso(r[1])}`);

/**
 * The booking-wide low/high estimate, from store state alone.
 *
 * Step 1 computed this from its own local UI state, so steps 2 and 3 had
 * nothing to fall back on when the server quote could not price the order —
 * and an order whose weight is not yet known quotes ZERO. The customer saw a
 * ₱440–₱2,200 estimate become "Estimated ₱0" on the very next screen.
 *
 * "Not sure" is derivable rather than remembered: clearing the weight IS how
 * that choice is stored, so a weight-priced line with no weight is unsure and
 * quotes the full band.
 */
export function bookingRange(
  lines: readonly { serviceRefId: string; estimatedWeightKg?: number; estimatedPieceCount?: number }[],
  serviceById: Map<string, ProviderServiceItem>,
): [number, number] | undefined {
  let lo = 0;
  let hi = 0;
  let priced = false;
  for (const l of lines) {
    const svc = serviceById.get(l.serviceRefId);
    if (!svc) continue;
    const r = lineRange(
      svc,
      l.estimatedWeightKg,
      l.estimatedPieceCount,
      l.estimatedWeightKg == null,
      false,
    );
    if (!r) continue;
    lo += r[0];
    hi += r[1];
    priced = true;
  }
  return priced ? [lo, hi] : undefined;
}
