// src/types/api/orders.ts
// Online orders — snapshots, pricing, fulfilment, timeline.
// Split out of the former monolithic src/types/api.ts (F2, 600-line limit).

import type {
  Centavos,
  DateTimeString,
  ProviderType,
  PricingType,
  OrderStatus,
  FulfillmentPickupMode,
  FulfillmentReturnMode,
  DeliverySubMode,
  OnlinePaymentMethod,
  PaymentTiming,
  OnlinePaymentStatus,
  QualityHoldResponse,
  AttemptResponsibility,
} from "../enums";
import type { BranchAddress, MapLocation } from "./geo";

// ─── Online order + sub-objects ───────────────────────────────────────────────
export interface CustomerSnapshot {
  uid: string;
  displayName: string;
  maskedPhone: string;
  address: BranchAddress;
  mapLocation: MapLocation;
}

export interface ProviderSnapshot {
  providerUid: string;
  branchId: string;
  providerName: string;
  providerType: ProviderType;
}

export interface ServiceLineSnapshot {
  serviceRefId: string;
  serviceName: string;
  pricingType: PricingType;
  price: number;
  baseKilos: number | null;
  excessRate: number | null;
  estimatedLineTotalCentavos: Centavos;
  actualLineTotalCentavos: Centavos | null;
  productSurchargeCentavos: Centavos;
}

export interface OrderInstructions {
  pickupInstructions: string | null;
  returnInstructions: string | null;
  accessInstructions: string | null;
  laundryCareInstructions: string | null;
  customerGeneralNotes: string | null;
  providerNotes: string | null;
}

export interface OrderFulfillment {
  pickupMode: FulfillmentPickupMode;
  /** FREE_BATCH (default) or SCHEDULED_PAID; EXPRESS is not a pickup tier. */
  pickupSubMode: DeliverySubMode | null;
  returnMode: FulfillmentReturnMode;
  deliverySubMode: DeliverySubMode | null;
}

export interface OrderPricing {
  estimatedWeightKg: number | null;
  /** Fee-INCLUSIVE estimate: service subtotal + platform fee + pickup + return fees. */
  estimatedTotalCentavos: Centavos;
  actualWeightKg: number | null;
  actualPieceCount: number | null;
  /** Actual service total after weigh-in (pre platform/fulfillment fees). */
  actualServiceTotalCentavos: Centavos | null;
  /** Fee-INCLUSIVE final amount due (actual service + platform fee + pickup + return fees). */
  customerTotalCentavos: Centavos | null;
  platformFeePercent: number | null;
  platformFeeCentavos: Centavos | null;
  /** Estimated service subtotal, pre-fee (server-authoritative, GAP-P0-005). */
  serviceSubtotalCentavos: Centavos | null;
  /** Server-authoritative pickup fee snapshot (GAP-P0-005). */
  pickupFeeCentavos: Centavos | null;
  /** Server-authoritative return fee snapshot (GAP-P0-005). */
  returnFeeCentavos: Centavos | null;
  /** Paid turnaround promise (express), priced separately from the legs. */
  turnaroundFeeCentavos: Centavos | null;
  /** Fee-rule version snapshotted onto the order (e.g. "fulfillment-fees-v1"). */
  pricingRuleVersion: string | null;
  /** Set only when a promo code was applied — already subtracted into the totals above. */
  promoCode: string | null;
  discountCentavos: Centavos | null;
}

export interface PaymentSummary {
  method: OnlinePaymentMethod | null;
  amountCollectedCentavos: Centavos | null;
  /** FIRST settlement — not reset when a later surcharge is topped up. */
  collectedAt: DateTimeString | null;
  /** Most recent settlement; equals collectedAt on a single-payment order. */
  lastCollectedAt: DateTimeString | null;
  collectedByUid: string | null;
  referenceId: string | null;
}

export interface LegAssignment {
  assignedStaffUid: string | null;
  assignedAt: DateTimeString | null;
  enRouteAt: DateTimeString | null;
  arrivedAt: DateTimeString | null;
  completedAt: DateTimeString | null;
  // Live courier GPS, streamed while the leg is in progress (updateCourierLocation).
  locationLat: number | null;
  locationLng: number | null;
  locationAt: DateTimeString | null;
  locationAccuracy: number | null;
  locationSpeed: number | null;
  locationHeading: number | null;
  locationSequence: number | null;
}

export interface AttemptEvidence {
  attemptNumber: number;
  actorUid: string;
  responsibility: AttemptResponsibility;
  reason: string | null;
  photoUrls: string[] | null;
  gpsLat: number | null;
  gpsLng: number | null;
  timestamp: DateTimeString;
}

export interface QualityHold {
  serviceLineIndex: number;
  category: string | null;
  reason: string;
  photoUrls: string[] | null;
  additionalChargeCentavos: Centavos | null;
  blocksOrder: boolean;
  customerResponse: QualityHoldResponse;
  raisedAt: DateTimeString;
  respondTimeoutAt: DateTimeString | null;
  resolvedAt: DateTimeString | null;
}

export interface OnlineOrder {
  _id: string;
  /** "LB-000123", assigned at booking. Null on orders placed before this shipped. */
  orderNumber: string | null;
  status: OrderStatus;
  version: number;
  customer: CustomerSnapshot;
  provider: ProviderSnapshot;
  /** Whether the provider currently holds the Verified badge. Resolved live
   *  rather than read off the stored snapshot, so an order never contradicts
   *  the provider's own profile. */
  providerVerified: boolean;
  serviceLines: ServiceLineSnapshot[];
  fulfillment: OrderFulfillment;
  instructions: OrderInstructions;
  pricing: OrderPricing;
  paymentSummary: PaymentSummary;
  paymentTiming: PaymentTiming;
  paymentStatus: OnlinePaymentStatus;
  /**
   * What is still owed right now, server-derived. The whole total on a Pay
   * Later order, just the shortfall on one left short by an approved
   * surcharge, 0 once settled. Never recompute it locally.
   */
  amountDueCentavos: Centavos;
  /**
   * Short-lived signed URLs for the handover photos, per leg. Empty unless the
   * courier/staff actually took any, and empty for viewers who aren't party to
   * the order — the frames show a private address.
   */
  pickupProofUrls: string[];
  returnProofUrls: string[];
  pickupAssignment: LegAssignment | null;
  returnAssignment: LegAssignment | null;
  pickupAttempts: AttemptEvidence[];
  deliveryAttempts: AttemptEvidence[];
  activeQualityHold: QualityHold | null;
  cancellationReason: string | null;
  rejectionReason: string | null;
  completedAt: DateTimeString | null;
  createdAt: DateTimeString | null;
  updatedAt: DateTimeString | null;
}

// ─── Order timeline ───────────────────────────────────────────────────────────
export interface OrderEvent {
  _id: string;
  orderId: string;
  sequence: number;
  fromStatus: string | null;
  toStatus: string;
  actorUid: string;
  actorRole: string;
  note: string | null;
  createdAt: DateTimeString | null;
}
