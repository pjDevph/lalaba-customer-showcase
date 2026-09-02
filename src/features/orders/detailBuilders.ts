// src/features/orders/detailBuilders.ts
// Pure builders that turn an OnlineOrder into the view models the shared
// ProgressTimeline / PriceBreakdown components consume. Split out of [id].tsx
// (F2, 600-line limit). No JSX — directly unit-testable.
import type { OnlineOrder } from "@/types/api";
import { pricingViewOf } from "@/lib/pricingLines";
import type { TimelineStep, PriceLine } from "@/components";
import {
  MACRO_STEPS,
  macroStepIndex,
  macroStepDescription,
  formatDateTime,
} from "@/features/orders/status";

// ─── Timeline / price builders ────────────────────────────────────────────────
export function buildTimeline(order: OnlineOrder): TimelineStep[] {
  const current = macroStepIndex(order.status);
  const done = order.status === "COMPLETED";
  const stamps = [
    formatDateTime(order.createdAt),
    "",
    formatDateTime(order.pickupAssignment?.completedAt ?? order.pickupAssignment?.enRouteAt),
    "",
    formatDateTime(order.returnAssignment?.completedAt ?? order.completedAt),
  ];
  return MACRO_STEPS.map((s, i) => ({
    key: s.key,
    title: s.title,
    description: macroStepDescription(order, i),
    timestamp: stamps[i] || undefined,
    state: done || i < current ? "done" : i === current ? "current" : "upcoming",
  }));
}

export function buildPriceLines(order: OnlineOrder): PriceLine[] {
  // Server-authoritative breakdown (GAP-H-015 / GAP-P0-005): service subtotal,
  // pickup fee and return fee straight from the order's (the platform fee is
  // folded into the service line, not shown separately — §16 reversal)
  // pricing snapshot — no client-side fee math or proportional folding.
  return pricingViewOf(order.pricing).lines;
}

