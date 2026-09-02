// src/types/enums.ts
// ─────────────────────────────────────────────────────────────────────────────
// SHARED API ENUMS — string-literal unions mirroring the backend GraphQL SDL.
// Split out of api.ts to keep both files under the size budget. Re-exported by
// api.ts, so `@/types/api` remains the single import surface for consumers.
//
// ⚠️ ENUM CASING: GraphQL transmits the *SDL enum member name* on the wire, and
// the SDL names are UPPERCASE (e.g. `MERCHANT`, `PROVIDER_PICKUP`, `FREE_BATCH`).
// The unions below match the SDL, which is what actually crosses the wire.
// ─────────────────────────────────────────────────────────────────────────────

export type Centavos = number;

/** ISO-8601 timestamp string (GraphQL DateTime scalar). */
export type DateTimeString = string;

// ─── Enums (SDL member names — UPPERCASE on the wire) ─────────────────────────
export type ProviderType = "MERCHANT" | "WASHER";
export type ProviderTypeFilter = "ALL" | "MERCHANT" | "WASHER";
export type ProviderSort = "NEAREST" | "TOP_RATED";

export type PricingType =
  | "PER_KILO"
  | "PER_PIECE"
  // One flat charge for the line, however much it weighs.
  | "PER_LOAD"
  | "PER_KILO_WITH_BASE"
  // Machine-load pricing used by home washers: the weight is divided by the
  // provider's load capacity (carried in `baseKilos`) and rounded UP, then
  // charged per load. 10 kg into a 7 kg machine is two loads.
  | "PER_LOAD_WITH_CAPACITY";

// What a counted (PER_PIECE) service counts. Platform-controlled on the
// backend, so this list is closed rather than free text.
export type ServiceUnit = "PIECE" | "PAIR" | "SET" | "PANEL";

export const SERVICE_UNIT_WORDS: Record<ServiceUnit, string> = {
  PIECE: "piece",
  PAIR: "pair",
  SET: "set",
  PANEL: "panel",
};

export type ServiceCategory =
  | "BAGS"
  | "BEDDING"
  | "CURTAINS"
  | "DELICATE"
  | "DRY_CLEAN"
  | "EXPRESS"
  | "IRON_ONLY"
  | "OTHER"
  | "SHOES"
  | "WASH_AND_FOLD"
  | "WASH_AND_IRON"
  | "WASH_ONLY";

export type OrderStatus =
  | "ACCEPTED_BY_PROVIDER"
  // Laundry finished but never paid for and never collected — the deferred
  // settlement that ran out of road (§14). Terminal for the customer; support
  // can reinstate it if they come back with the money.
  | "ABANDONED_UNSETTLED"
  | "AWAITING_CUSTOMER_PICKUP"
  | "AWAITING_PICKUP_ASSIGNMENT"
  | "AWAITING_PICKUP_RESCHEDULE"
  | "AWAITING_REDELIVERY_SELECTION"
  | "AWAITING_RETURN_ASSIGNMENT"
  | "AWAITING_RETURN_SELECTION"
  | "CANCELLED"
  | "COMPLETED"
  | "CUSTOMER_PICKUP_VERIFIED"
  | "DELIVERED_TO_CUSTOMER"
  | "DELIVERY_ATTEMPTED"
  | "DISPUTED"
  | "DRAFT"
  | "LAUNDRY_IN_PROGRESS"
  | "LAUNDRY_QUALITY_HOLD"
  | "LAUNDRY_READY"
  | "PENDING_PROVIDER_ACCEPTANCE"
  | "PICKED_UP_FROM_CUSTOMER"
  | "PICKUP_ARRIVED"
  | "PICKUP_ASSIGNED"
  | "PICKUP_ATTEMPT_FAILED"
  | "PICKUP_EN_ROUTE"
  | "PICKUP_WEIGHED"
  | "PRICING_VALIDATED"
  | "PROVIDER_CHANGE_PROPOSED"
  | "RECEIVED_BY_PROVIDER"
  | "REDELIVERY_SCHEDULED"
  | "REFUNDED"
  | "REJECTED_BY_PROVIDER"
  | "RETURNED_TO_PROVIDER"
  | "RETURN_ARRIVED"
  | "RETURN_ASSIGNED"
  | "RETURN_EN_ROUTE";

export type FulfillmentPickupMode = "PROVIDER_PICKUP" | "CUSTOMER_DROPOFF";
export type FulfillmentReturnMode = "PROVIDER_DELIVERY" | "CUSTOMER_SELF_PICKUP";
export type DeliverySubMode = "FREE_BATCH" | "EXPRESS" | "SCHEDULED_PAID";
export type OnlinePaymentMethod = "CASH" | "EWALLET_OUTSIDE_APP";
// When the customer pays. Deferred settlement is supported again (§14):
// AT_FINAL_HANDOVER means nothing was collected at pickup and the whole amount
// is due when the laundry comes back. Only shops that opted in offer it.
export type PaymentTiming = "ON_PICKUP" | "AT_FINAL_HANDOVER";
// Resolved payment state, computed by the BE from paymentSummary vs pricing.
// Note UNPAID now covers two situations — a Pay Later order legitimately in
// flight, and one not yet picked up — so read it together with paymentTiming.
export type OnlinePaymentStatus = "UNPAID" | "BALANCE_DUE" | "PAID";
export type PickupSlotAvailability = "FREE_BATCH" | "SCHEDULED_PAID" | "FULLY_BOOKED";

/**
 * How fast the laundry must be DONE, measured from the moment the provider
 * receives it. Separate from how it travels, so a self-pickup customer can buy
 * speed too — impossible while "express" was a delivery sub-mode.
 */
export type TurnaroundTierCode = "STANDARD" | "EXPRESS";

export type QualityHoldResponse = "APPROVED" | "DECLINED" | "PENDING";
export type AttemptResponsibility = "CUSTOMER" | "PROVIDER" | "SYSTEM";

// Support enums (used by ServiceProductSlot → Product):
export type InventoryCategory =
  | "bleach"
  | "dryer_sheet"
  | "fabric_conditioner"
  | "liquid_detergent"
  | "other"
  | "oxybleach"
  | "powdered_detergent"
  | "stain_remover";

export type InventoryUnit =
  | "L"
  | "box"
  | "g"
  | "kg"
  | "ml"
  | "pack"
  | "pieces"
  | "sachet"
  | "scoop";

export type ProductCategory =
  | "bleach"
  | "dryer_sheet"
  | "fabric_conditioner"
  | "liquid_detergent"
  | "other"
  | "oxybleach"
  | "powdered_detergent"
  | "stain_remover";
