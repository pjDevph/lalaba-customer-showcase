// src/services/graphql/discovery.ts
// GraphQL operations for provider discovery: search cards, profile, service
// menu, and pickup-slot availability.

import { graphqlRequest } from "../../config/graphql";
import type {
  ProviderCard,
  ProviderProfile,
  ProviderServiceItem,
  PickupDay,
  ProviderType,
  ProviderTypeFilter,
  ProviderSort,
} from "../../types/api";

// ─── Reusable fragment strings ────────────────────────────────────────────────
const BRANCH_ADDRESS_FIELDS = `
  unit streetAddress barangayName cityMunicipalityName
  provinceName regionName zipCode
`;

const DAY_SCHEDULE_FIELDS = `isOpen is24Hours timeSlots { open close }`;

const PROVIDER_CARD_FIELDS = `
  branchId
  providerType
  name
  operatorName
  initials
  areaLabel
  distanceKm
  logoUrl
  coverPhotoUrl
  ratingAverage
  ratingCount
  priceFromCentavos
  serviceCategories
  verificationBadges
  statusText
  isAcceptingBookings
  slotsRemaining
  isFavorite
  isVerified
`;

const PROVIDER_PROFILE_FIELDS = `
  branchId
  providerType
  name
  initials
  areaLabel
  description
  logoUrl
  coverPhotoUrl
  featuredPhotos
  address { ${BRANCH_ADDRESS_FIELDS} }
  mapLocation { latitude longitude }
  operatingHours {
    monday { ${DAY_SCHEDULE_FIELDS} }
    tuesday { ${DAY_SCHEDULE_FIELDS} }
    wednesday { ${DAY_SCHEDULE_FIELDS} }
    thursday { ${DAY_SCHEDULE_FIELDS} }
    friday { ${DAY_SCHEDULE_FIELDS} }
    saturday { ${DAY_SCHEDULE_FIELDS} }
    sunday { ${DAY_SCHEDULE_FIELDS} }
  }
  ratingAverage
  ratingCount
  ratingHistogram { star count }
  serviceCategories
  supportedFulfillment
  verificationBadges
  washerVerification {
    identityVerified residenceConfirmed paymentAccountVerified
    servicesReviewed recheckCadence verifiedOn
  }
  policies { minOrderKg freeBatchDelivery expressTurnaround { enabled feeCentavos slaHours } }
  statusText
  isAcceptingBookings
  slotsRemaining
  isFavorite
  allowsPayAtHandover
`;

const PROVIDER_SERVICE_FIELDS = `
  serviceRefId
  name
  description
  category
  pricingType
  price
  baseKilos
  excessRate
  minKg
  unit
  minQuantity
  maxQuantity
  readyInHint
  approved
`;

const PICKUP_DAY_FIELDS = `date label isBookable remaining unavailableReason freeBatchFeeCentavos paidPickupFeeCentavos`;

// ─── discoverProviders ────────────────────────────────────────────────────────
export interface DiscoverProvidersInput {
  providerType?: ProviderTypeFilter;
  category?: string;
  search?: string;
  sort?: ProviderSort;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  minRating?: number;
  openNow?: boolean;
  limit?: number;
}

export async function discoverProviders(
  filter: DiscoverProvidersInput,
): Promise<ProviderCard[]> {
  const data = await graphqlRequest<{ discoverProviders: ProviderCard[] }>(
    `query DiscoverProviders($filter: DiscoverProvidersInput!) {
       discoverProviders(filter: $filter) { ${PROVIDER_CARD_FIELDS} }
     }`,
    { filter },
  );
  return data.discoverProviders;
}

// ─── providerProfile ──────────────────────────────────────────────────────────
export async function providerProfile(
  branchId: string,
  providerType: ProviderType,
): Promise<ProviderProfile> {
  const data = await graphqlRequest<{ providerProfile: ProviderProfile }>(
    `query ProviderProfile($branchId: ID!, $providerType: ProviderType!) {
       providerProfile(branchId: $branchId, providerType: $providerType) {
         ${PROVIDER_PROFILE_FIELDS}
       }
     }`,
    { branchId, providerType },
  );
  return data.providerProfile;
}

// ─── providerServices ─────────────────────────────────────────────────────────
export async function providerServices(
  branchId: string,
  providerType: ProviderType,
): Promise<ProviderServiceItem[]> {
  const data = await graphqlRequest<{ providerServices: ProviderServiceItem[] }>(
    `query ProviderServices($branchId: ID!, $providerType: ProviderType!) {
       providerServices(branchId: $branchId, providerType: $providerType) {
         ${PROVIDER_SERVICE_FIELDS}
       }
     }`,
    { branchId, providerType },
  );
  return data.providerServices;
}

// ─── providerPickupDays ───────────────────────────────────────────────────────
// One call returns the whole pickable range, so changing day no longer means a
// round trip — the old per-day slot query refetched on every date tap.
export async function providerPickupDays(
  branchId: string,
  fromDate: string,
  providerType: ProviderType,
  days = 7,
): Promise<PickupDay[]> {
  const data = await graphqlRequest<{ providerPickupDays: PickupDay[] }>(
    `query ProviderPickupDays($branchId: ID!, $fromDate: String!, $providerType: ProviderType!, $days: Int) {
       providerPickupDays(branchId: $branchId, fromDate: $fromDate, providerType: $providerType, days: $days) {
         ${PICKUP_DAY_FIELDS}
       }
     }`,
    { branchId, fromDate, providerType, days },
  );
  return data.providerPickupDays;
}
