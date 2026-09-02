// src/services/graphql/booking.ts
// GraphQL operations that drive the booking wizard: price quoting, order
// creation, and per-service product (detergent) slot lookup.

import { graphqlRequest } from "../../config/graphql";
import { ONLINE_ORDER_FIELDS } from "./orders";
import type {
  OrderPricing,
  OnlineOrder,
  ServiceProductSlot,
  ProviderType,
  FulfillmentPickupMode,
  FulfillmentReturnMode,
  DeliverySubMode,
  TurnaroundTierCode,
  PaymentTiming,
} from "../../types/api";

// ─── Fragments ────────────────────────────────────────────────────────────────
const ORDER_PRICING_FIELDS = `
  estimatedWeightKg
  estimatedTotalCentavos
  actualWeightKg
  actualPieceCount
  actualServiceTotalCentavos
  customerTotalCentavos
  platformFeePercent
  platformFeeCentavos
  serviceSubtotalCentavos
  pickupFeeCentavos
  returnFeeCentavos
  turnaroundFeeCentavos
  pricingRuleVersion
  promoCode
  discountCentavos
`;

const PRODUCT_FIELDS = `
  _id inventoryId productName productCategory productUnit
  price quantity isActive isArchived
`;

// ─── Shared input shapes ──────────────────────────────────────────────────────
export interface ServiceLineInput {
  serviceRefId: string;
  estimatedWeightKg?: number;
  estimatedPieceCount?: number;
  note?: string;
  replacementProductIds?: string[];
}

// ─── quoteOnlineOrder → OrderPricing ──────────────────────────────────────────
export interface QuoteOrderInput {
  branchId: string;
  /** STANDARD (free) or EXPRESS — quoted so the estimate matches the order. */
  turnaroundTier?: TurnaroundTierCode;
  providerType: ProviderType;
  serviceLines: ServiceLineInput[];
  // Fulfillment selection — pass it so the server prices pickup/return fees
  // into the quote (omitted ⇒ fees quoted at the ₱0 free-batch defaults).
  pickupMode?: FulfillmentPickupMode;
  /** FREE_BATCH (default) or SCHEDULED_PAID; EXPRESS rejected for pickup. */
  pickupSubMode?: DeliverySubMode;
  returnMode?: FulfillmentReturnMode;
  deliverySubMode?: DeliverySubMode;
  /**
   * Previewed here the same way it's applied at booking: validated fresh
   * against this customer and this quote's subtotal. An invalid/expired code
   * is silently ignored server-side — the response just comes back with no
   * discount, never an error — so the review screen doesn't need to handle
   * a failed-quote state over a bad code.
   */
  promoCode?: string;
}

export async function quoteOnlineOrder(input: QuoteOrderInput): Promise<OrderPricing> {
  const data = await graphqlRequest<{ quoteOnlineOrder: OrderPricing }>(
    `query QuoteOnlineOrder($input: QuoteOrderInput!) {
       quoteOnlineOrder(input: $input) { ${ORDER_PRICING_FIELDS} }
     }`,
    { input },
  );
  return data.quoteOnlineOrder;
}

// ─── createOnlineOrder → OnlineOrder ──────────────────────────────────────────
export interface OrderInstructionsInput {
  pickupInstructions?: string;
  returnInstructions?: string;
  accessInstructions?: string;
  laundryCareInstructions?: string;
  customerGeneralNotes?: string;
}

export interface CreateOnlineOrderInput {
  branchId: string;
  providerType: ProviderType;
  addressId: string;
  pickupMode: FulfillmentPickupMode;
  /** FREE_BATCH (default) or SCHEDULED_PAID; EXPRESS rejected for pickup. Keep
   *  consistent with the quote so create prices match what was shown. */
  pickupSubMode?: DeliverySubMode;
  returnMode: FulfillmentReturnMode;
  deliverySubMode?: DeliverySubMode;
  /** STANDARD (free) or EXPRESS — priced separately from the delivery legs. */
  turnaroundTier?: TurnaroundTierCode;
  serviceLines: ServiceLineInput[];
  instructions?: OrderInstructionsInput;
  /**
   * ON_PICKUP (default, GAP-P0-028): payment at weigh/finalize, before the
   * provider takes custody. AT_FINAL_HANDOVER defers it to when the laundry
   * comes back — only offered when the provider opted in
   * (ProviderProfile.allowsPayAtHandover).
   */
  paymentTiming?: PaymentTiming;
  /**
   * The handover window the customer picked, validated server-side against the
   * provider's booking availability and counted against her slot capacity.
   *
   * Required by the server: day capacity is counted by grouping orders on this
   * date, so an order without one would occupy a real place in the provider's
   * day while counting toward nothing.
   */
  scheduledPickup?: ScheduledPickupInput;
  /**
   * Re-validated and actually redeemed server-side at create time — unlike
   * the quote's silent-ignore, an invalid/expired code here IS rejected,
   * since this is the actual booking, not a preview.
   */
  promoCode?: string;
}

export interface ScheduledPickupInput {
  /** 'YYYY-MM-DD', PH-local. A DAY — the customer never picks a time. */
  date: string;
}

export async function createOnlineOrder(
  input: CreateOnlineOrderInput,
): Promise<OnlineOrder> {
  const data = await graphqlRequest<{ createOnlineOrder: OnlineOrder }>(
    `mutation CreateOnlineOrder($input: CreateOnlineOrderInput!) {
       createOnlineOrder(input: $input) { ${ONLINE_ORDER_FIELDS} }
     }`,
    { input },
  );
  return data.createOnlineOrder;
}

// ─── serviceProductSlots → ServiceProductSlot[] ───────────────────────────────
// The detergent/product choices (default + alternatives) for a service.
export async function serviceProductSlots(
  branchId: string,
  serviceTemplateId: string,
): Promise<ServiceProductSlot[]> {
  const data = await graphqlRequest<{ serviceProductSlots: ServiceProductSlot[] }>(
    `query ServiceProductSlots($branchId: ID!, $serviceTemplateId: ID!) {
       serviceProductSlots(branchId: $branchId, serviceTemplateId: $serviceTemplateId) {
         category
         defaultProduct { ${PRODUCT_FIELDS} }
         alternativeProducts { ${PRODUCT_FIELDS} }
       }
     }`,
    { branchId, serviceTemplateId },
  );
  return data.serviceProductSlots;
}
