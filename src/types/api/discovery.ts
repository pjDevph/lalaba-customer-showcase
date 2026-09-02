// src/types/api/discovery.ts
// Discovery — provider cards, profiles, services, product slots.
// Split out of the former monolithic src/types/api.ts (F2, 600-line limit).

import type {
  Centavos,
  DateTimeString,
  ProviderType,
  PricingType,
  ServiceCategory,
  ServiceUnit,
  InventoryCategory,
  InventoryUnit,
  ProductCategory,
} from "../enums";
import type { BranchAddress, MapLocation } from "./geo";

// ─── Discovery ────────────────────────────────────────────────────────────────
export interface ProviderCard {
  branchId: string;
  providerType: ProviderType;
  name: string;
  /** Home washer only — owner's name ("Operated by: …"). Null for merchants. */
  operatorName: string | null;
  initials: string;
  areaLabel: string | null;
  distanceKm: number | null;
  logoUrl: string | null;
  coverPhotoUrl: string | null;
  ratingAverage: number;
  ratingCount: number;
  priceFromCentavos: Centavos | null;
  serviceCategories: string[];
  verificationBadges: string[];
  statusText: string;
  /** The real booking gate — undisguised by statusText's prose. */
  isAcceptingBookings: boolean;
  slotsRemaining: number | null;
  isFavorite: boolean;
  isVerified: boolean;
}

export interface RatingHistogramBucket {
  star: number;
  count: number;
}

export interface WasherVerificationDetail {
  identityVerified: boolean;
  residenceConfirmed: boolean;
  paymentAccountVerified: boolean;
  servicesReviewed: boolean;
  recheckCadence: string | null;
  verifiedOn: DateTimeString | null;
}

export interface ProviderPolicies {
  minOrderKg: number | null;
  freeBatchDelivery: boolean;
  /** The provider's paid speed offer, absent when they don't sell one. */
  expressTurnaround?: {
    enabled: boolean;
    feeCentavos: number | null;
    slaHours: number | null;
  } | null;
  expressCutoff: string | null;
}

/** Per-day open/close schedule (branch operating hours). */
export interface TimeSlot {
  open: string; // "08:00"
  close: string; // "20:00"
}
export interface DaySchedule {
  isOpen: boolean;
  is24Hours: boolean;
  timeSlots: TimeSlot[];
}
export interface OperatingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface ProviderProfile {
  branchId: string;
  providerType: ProviderType;
  name: string;
  initials: string;
  areaLabel: string | null;
  description: string | null;
  logoUrl: string | null;
  coverPhotoUrl: string | null;
  /** Home-washer gallery (equipment, workspace, finished laundry). Always an
   *  array; empty for merchants, which have a shopfront and an address. */
  featuredPhotos: string[];
  address: BranchAddress | null;
  mapLocation: MapLocation | null;
  operatingHours: OperatingHours | null;
  ratingAverage: number;
  ratingCount: number;
  ratingHistogram: RatingHistogramBucket[];
  serviceCategories: string[];
  supportedFulfillment: string[];
  verificationBadges: string[];
  washerVerification: WasherVerificationDetail | null;
  policies: ProviderPolicies;
  statusText: string;
  /** The real booking gate — undisguised by statusText's prose. */
  isAcceptingBookings: boolean;
  slotsRemaining: number | null;
  isFavorite: boolean;
  /**
   * Whether this shop offers Pay Later. Shown at booking so the option isn't a
   * surprise, but the choice itself is made at pickup — a real total has to
   * exist before anyone can defer it.
   */
  allowsPayAtHandover: boolean;
}

export interface ProviderServiceItem {
  serviceRefId: string;
  name: string;
  description: string | null;
  category: ServiceCategory | null;
  pricingType: PricingType;
  price: number;
  baseKilos: number | null;
  excessRate: number | null;
  minKg: number | null;
  // Counted services (PER_PIECE) only. `unit` is what the provider is actually
  // counting, so the app can ask for "pairs" rather than a generic "items";
  // the limits are her own capacity, enforced server-side at booking too.
  unit: ServiceUnit | null;
  minQuantity: number | null;
  maxQuantity: number | null;
  readyInHint: string | null;
  approved: boolean;
}

/**
 * A bookable pickup DAY.
 *
 * Replaced PickupSlot, which described a 30-minute window. The window was
 * never a promise the provider could keep — a free pickup is batched with
 * nearby collections — and no provider surface ever displayed it. Both tier
 * prices come back per day so the customer CHOOSES a tier instead of the
 * choice being implied by which window they tapped.
 */
export interface PickupDay {
  date: string;
  label: string;
  isBookable: boolean;
  remaining: number;
  unavailableReason?: string | null;
  freeBatchFeeCentavos: Centavos;
  paidPickupFeeCentavos: Centavos;
}

// ─── Booking: service-product slots (detergent/product choices) ───────────────
export interface Product {
  _id: string;
  inventoryId: string;
  productName: string;
  productCategory: ProductCategory;
  productUnit: InventoryUnit;
  price: number;
  quantity: number;
  isActive: boolean;
  isArchived: boolean;
}

export interface ServiceProductSlot {
  category: InventoryCategory;
  defaultProduct: Product;
  alternativeProducts: Product[];
}
