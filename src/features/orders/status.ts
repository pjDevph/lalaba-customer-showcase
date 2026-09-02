// src/features/orders/status.ts
// ─────────────────────────────────────────────────────────────────────────────
// Shared order-status helpers so the orders LIST and DETAIL screens agree on:
//   • the human label for every OrderStatus
//   • which of the 5 macro steps a status maps to (for ProgressTimeline)
//   • the tab bucket a status belongs to (needsAction / active / completed)
//   • whether an order currently needs a customer response
//   • small formatting helpers (order number, provider accent, timestamps).
// ─────────────────────────────────────────────────────────────────────────────

import { kg, peso } from "@/theme/tokens";
import type { OnlineOrder, OrderStatus } from "@/types/api";
import type { ProviderCardData } from "@/components";

// ─── Tab buckets ──────────────────────────────────────────────────────────────
export type OrderBucket = "needsAction" | "active" | "completed";

// Terminal states — the order is done (or never started).
const TERMINAL: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  "COMPLETED",
  "CANCELLED",
  "REJECTED_BY_PROVIDER",
  "REFUNDED",
]);

// Statuses that always require a customer decision.
const ALWAYS_NEEDS_ACTION: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  "PROVIDER_CHANGE_PROPOSED",
  "AWAITING_RETURN_SELECTION",
  "AWAITING_REDELIVERY_SELECTION",
  "AWAITING_PICKUP_RESCHEDULE",
]);

/** True when the order is waiting on the customer to respond. */
export function needsCustomerAction(order: OnlineOrder): boolean {
  if (ALWAYS_NEEDS_ACTION.has(order.status)) return true;
  if (
    order.status === "LAUNDRY_QUALITY_HOLD" &&
    order.activeQualityHold?.customerResponse === "PENDING"
  ) {
    return true;
  }
  return false;
}

/** Which segmented-control tab an order lives under. */
export function bucketOf(order: OnlineOrder): OrderBucket {
  if (needsCustomerAction(order)) return "needsAction";
  if (TERMINAL.has(order.status)) return "completed";
  return "active";
}

export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL.has(status);
}

// ─── Macro steps (ProgressTimeline) ───────────────────────────────────────────
export const MACRO_STEPS = [
  { key: "submitted", title: "Booking submitted" },
  { key: "provider", title: "Waiting for provider" },
  { key: "pickup", title: "Pickup" },
  { key: "processing", title: "Processing" },
  { key: "return", title: "Return and completion" },
] as const;

// Status → macro step index (0..4).
const MACRO_INDEX: Record<OrderStatus, number> = {
  DRAFT: 0,
  PRICING_VALIDATED: 0,

  PENDING_PROVIDER_ACCEPTANCE: 1,
  PROVIDER_CHANGE_PROPOSED: 1,
  REJECTED_BY_PROVIDER: 1,

  ACCEPTED_BY_PROVIDER: 2,
  AWAITING_PICKUP_ASSIGNMENT: 2,
  PICKUP_ASSIGNED: 2,
  PICKUP_EN_ROUTE: 2,
  PICKUP_ARRIVED: 2,
  PICKUP_WEIGHED: 2,
  PICKUP_ATTEMPT_FAILED: 2,
  AWAITING_PICKUP_RESCHEDULE: 2,
  PICKED_UP_FROM_CUSTOMER: 2,
  RECEIVED_BY_PROVIDER: 2,
  CUSTOMER_PICKUP_VERIFIED: 2,

  LAUNDRY_IN_PROGRESS: 3,
  LAUNDRY_QUALITY_HOLD: 3,
  LAUNDRY_READY: 3,

  AWAITING_RETURN_ASSIGNMENT: 4,
  AWAITING_RETURN_SELECTION: 4,
  RETURN_ASSIGNED: 4,
  RETURN_EN_ROUTE: 4,
  RETURN_ARRIVED: 4,
  RETURNED_TO_PROVIDER: 4,
  DELIVERED_TO_CUSTOMER: 4,
  DELIVERY_ATTEMPTED: 4,
  AWAITING_REDELIVERY_SELECTION: 4,
  REDELIVERY_SCHEDULED: 4,
  AWAITING_CUSTOMER_PICKUP: 4,
  COMPLETED: 4,
  REFUNDED: 4,
  DISPUTED: 4,
  CANCELLED: 4,
  // The order ended at the return step without ever being handed over.
  ABANDONED_UNSETTLED: 4,
};

export function macroStepIndex(status: OrderStatus): number {
  return MACRO_INDEX[status] ?? 0;
}

// ─── Human labels ─────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<OrderStatus, string> = {
  DRAFT: "Draft",
  PRICING_VALIDATED: "Pricing validated",
  PENDING_PROVIDER_ACCEPTANCE: "Waiting for provider to accept",
  PROVIDER_CHANGE_PROPOSED: "Provider proposed a change",
  ACCEPTED_BY_PROVIDER: "Accepted by provider",
  REJECTED_BY_PROVIDER: "Declined by provider",
  AWAITING_PICKUP_ASSIGNMENT: "Assigning a pickup rider",
  PICKUP_ASSIGNED: "Pickup rider assigned",
  PICKUP_EN_ROUTE: "Pickup rider on the way",
  PICKUP_ARRIVED: "Pickup rider has arrived",
  PICKUP_WEIGHED: "Weighed — payment pending",
  PICKUP_ATTEMPT_FAILED: "Pickup attempt failed",
  AWAITING_PICKUP_RESCHEDULE: "Reschedule your pickup",
  PICKED_UP_FROM_CUSTOMER: "Picked up from you",
  RECEIVED_BY_PROVIDER: "Received by provider",
  CUSTOMER_PICKUP_VERIFIED: "Drop-off verified",
  LAUNDRY_IN_PROGRESS: "Laundry in progress",
  LAUNDRY_QUALITY_HOLD: "Quality hold — needs your response",
  LAUNDRY_READY: "Laundry ready",
  AWAITING_RETURN_ASSIGNMENT: "Assigning a return rider",
  AWAITING_RETURN_SELECTION: "Choose how to get it back",
  RETURN_ASSIGNED: "Return rider assigned",
  RETURN_EN_ROUTE: "On the way back to you",
  RETURN_ARRIVED: "Return rider has arrived",
  RETURNED_TO_PROVIDER: "Returned to provider",
  DELIVERED_TO_CUSTOMER: "Delivered to you",
  DELIVERY_ATTEMPTED: "Delivery attempt failed",
  AWAITING_REDELIVERY_SELECTION: "Schedule a redelivery",
  REDELIVERY_SCHEDULED: "Redelivery scheduled",
  AWAITING_CUSTOMER_PICKUP: "Ready for pickup",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
  DISPUTED: "Disputed",
  // Said from the customer's side: their laundry is still at the shop because
  // the balance was never settled. "Abandoned" is the internal word for it.
  ABANDONED_UNSETTLED: "Unpaid — contact support",
};

export function statusLabel(status: OrderStatus): string {
  return STATUS_LABEL[status] ?? status;
}

/**
 * Detail-screen status header — a bold `title` line plus an optional muted
 * `text` sub-line, matching the board's "Waiting for … to accept" / "Submitted
 * at 9:32 AM · Most providers respond within 15 minutes" treatment.
 */
export function statusBanner(order: OnlineOrder): {
  title: string;
  text?: string;
  tone: "info" | "warning" | "success" | "neutral";
} {
  const provider = order.provider.providerName;
  switch (order.status) {
    case "PENDING_PROVIDER_ACCEPTANCE":
      return {
        title: `Waiting for ${provider} to accept`,
        text: `Submitted at ${formatTime(order.createdAt)} · Most providers respond within 15 minutes`,
        tone: "info",
      };
    case "PROVIDER_CHANGE_PROPOSED":
      return {
        title: `${provider} proposed a change`,
        text: "Confirm the final weight and amount below",
        tone: "warning",
      };
    case "LAUNDRY_QUALITY_HOLD":
      return { title: "Quality hold needs your decision", text: "Review the issue before work continues", tone: "warning" };
    case "AWAITING_RETURN_SELECTION":
      return { title: "Choose how to get it back", text: "Your laundry is ready", tone: "warning" };
    case "AWAITING_REDELIVERY_SELECTION":
      return { title: "Schedule a redelivery", text: "The last delivery attempt didn't go through", tone: "warning" };
    case "AWAITING_PICKUP_RESCHEDULE":
      return { title: "Reschedule your pickup", text: "Pickup didn't go through", tone: "warning" };
    case "PICKUP_EN_ROUTE":
      return { title: `${provider}'s rider is on the way`, text: "Collecting your laundry soon", tone: "info" };
    case "PICKUP_WEIGHED":
      return {
        title: "Weight confirmed",
        text: `${peso(order.pricing.customerTotalCentavos ?? order.amountDueCentavos)} — the rider will collect payment shortly`,
        tone: "info",
      };
    case "RETURN_EN_ROUTE":
      return order.amountDueCentavos > 0
        ? {
            title: "On the way back to you",
            text: `Have ${peso(order.amountDueCentavos)} ready — the rider collects it at handover`,
            tone: "warning",
          }
        : { title: "On the way back to you", text: "Your clean laundry is coming", tone: "info" };
    case "AWAITING_CUSTOMER_PICKUP":
      return order.amountDueCentavos > 0
        ? {
            title: "Ready for pickup",
            text: `${peso(order.amountDueCentavos)} is due when you collect it`,
            tone: "warning",
          }
        : { title: "Ready for pickup", text: "Collect it whenever suits you", tone: "success" };
    case "ABANDONED_UNSETTLED":
      return {
        title: "This order was never paid for",
        text: `Your laundry is still at ${provider}. Contact support to settle the balance and arrange collection.`,
        tone: "warning",
      };
    case "COMPLETED":
      return { title: "Order complete", text: "Thanks for using Lalaba!", tone: "success" };
    case "CANCELLED":
      return { title: "Order cancelled", text: order.cancellationReason ?? undefined, tone: "neutral" };
    case "REJECTED_BY_PROVIDER":
      return { title: `${provider} couldn't take this order`, text: order.rejectionReason ?? undefined, tone: "neutral" };
    default:
      return { title: statusLabel(order.status), tone: "info" };
  }
}

/**
 * Short action title shown as the order-card status line when an order needs a
 * customer response (board copy, e.g. "Confirm final weight and amount").
 */
export function actionTitle(order: OnlineOrder): string {
  switch (order.status) {
    case "PROVIDER_CHANGE_PROPOSED":
      return "Confirm final weight and amount";
    case "LAUNDRY_QUALITY_HOLD":
      return "Review the quality hold";
    case "AWAITING_RETURN_SELECTION":
      return "Choose how to get it back";
    case "AWAITING_REDELIVERY_SELECTION":
      return "Schedule a redelivery";
    case "AWAITING_PICKUP_RESCHEDULE":
      return "Reschedule your pickup";
    default:
      return statusLabel(order.status);
  }
}

/** Description for the CURRENT macro step in the detail timeline (board copy). */
export function macroStepDescription(order: OnlineOrder, index: number): string | undefined {
  const provider = order.provider.providerName;
  if (index === macroStepIndex(order.status)) {
    const s = order.status;
    switch (index) {
      case 1:
        return `${provider} is reviewing your booking`;
      case 2:
        // Reflect the real pickup sub-state so the customer can follow the rider.
        switch (s) {
          case "PICKUP_ASSIGNED": return "Rider assigned — heading to you soon";
          case "PICKUP_EN_ROUTE": return "Rider is on the way to you";
          case "PICKUP_ARRIVED": return "Rider has arrived — weighing your laundry";
          case "PICKUP_WEIGHED": return "Weight confirmed — collecting payment";
          case "PICKED_UP_FROM_CUSTOMER": return `Picked up — on the way to ${provider}`;
          case "RECEIVED_BY_PROVIDER": return `Received at ${provider}`;
          default: return "Finding a rider for your pickup";
        }
      case 3:
        return s === "LAUNDRY_READY" ? "Washed and ready — arranging return" : "Your laundry is being washed";
      case 4:
        // Reflect the real return sub-state.
        switch (s) {
          case "RETURN_ASSIGNED": return "Rider assigned for delivery";
          case "RETURN_EN_ROUTE": return "Rider is on the way with your laundry";
          case "RETURN_ARRIVED": return "Rider has arrived with your laundry";
          case "DELIVERED_TO_CUSTOMER": return "Delivered — enjoy!";
          default: return "Getting your laundry back to you";
        }
      default:
        return undefined;
    }
  }
  return undefined;
}

/** True for the active pickup/return legs that support live tracking. */
export function isTrackable(status: OrderStatus): boolean {
  return (
    status === "PICKUP_EN_ROUTE" ||
    status === "PICKUP_ARRIVED" ||
    status === "PICKUP_WEIGHED" ||
    status === "RETURN_EN_ROUTE" ||
    status === "RETURN_ARRIVED"
  );
}

/** Early states where the customer may still cancel the whole booking. */
export function isCancellableEarly(status: OrderStatus): boolean {
  return (
    status === "PENDING_PROVIDER_ACCEPTANCE" ||
    status === "ACCEPTED_BY_PROVIDER" ||
    status === "AWAITING_PICKUP_ASSIGNMENT"
  );
}

// ─── Small formatting helpers ─────────────────────────────────────────────────
/**
 * The server now assigns a real order number ("LB-000123") at booking — pass
 * it as `real` wherever the caller has the full order object, and it wins.
 * Orders placed before that shipped (and any call site that only has the raw
 * id, like the chat screens) fall back to this derived one.
 */
export function orderNumber(id: string, real?: string | null): string {
  if (real) return real;
  return `LB-${id.slice(-4).toUpperCase()}`;
}

/** api ProviderType → the ProviderCard/OrderCard union. */
export function cardProviderType(
  type: OnlineOrder["provider"]["providerType"],
): ProviderCardData["type"] {
  return type === "WASHER" ? "homeWasher" : "laundromat";
}

export function providerAccent(
  type: OnlineOrder["provider"]["providerType"],
): "merchant" | "washer" {
  return type === "WASHER" ? "washer" : "merchant";
}

/** Best available total (customer > actual > estimate), in centavos. */
export function displayTotalCentavos(order: OnlineOrder): number {
  const p = order.pricing;
  return p.customerTotalCentavos ?? p.actualServiceTotalCentavos ?? p.estimatedTotalCentavos;
}

export function serviceSummary(order: OnlineOrder): string {
  const names = order.serviceLines.map((l) => l.serviceName).join(", ");
  const weight = order.pricing.actualWeightKg ?? order.pricing.estimatedWeightKg;
  return typeof weight === "number" ? `${names} · ${kg(weight)}` : names;
}

/** Format an ISO timestamp as e.g. "Aug 5, 2:30 PM"; empty for null. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Time-only, e.g. "9:32 AM" (board "Submitted at 9:32 AM"). */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
}

/** Short date, e.g. "Jul 28" (board "Completed · Jul 28"). */
export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}
