// src/services/graphql/favorites.ts
// GraphQL operations for the customer's favorite providers.

import { graphqlRequest } from "../../config/graphql";
import type { ProviderCard, ProviderType } from "../../types/api";

const PROVIDER_CARD_FIELDS = `
  branchId
  providerType
  name
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
  slotsRemaining
  isFavorite
`;

// ─── myFavorites ──────────────────────────────────────────────────────────────
export async function myFavorites(): Promise<ProviderCard[]> {
  const data = await graphqlRequest<{ myFavorites: ProviderCard[] }>(
    `query MyFavorites { myFavorites { ${PROVIDER_CARD_FIELDS} } }`,
  );
  return data.myFavorites;
}

// ─── addFavorite ──────────────────────────────────────────────────────────────
export async function addFavorite(
  branchId: string,
  providerType: ProviderType,
): Promise<boolean> {
  const data = await graphqlRequest<{ addFavorite: boolean }>(
    `mutation AddFavorite($branchId: ID!, $providerType: ProviderType!) {
       addFavorite(branchId: $branchId, providerType: $providerType)
     }`,
    { branchId, providerType },
  );
  return data.addFavorite;
}

// ─── removeFavorite ───────────────────────────────────────────────────────────
export async function removeFavorite(branchId: string): Promise<boolean> {
  const data = await graphqlRequest<{ removeFavorite: boolean }>(
    `mutation RemoveFavorite($branchId: ID!) { removeFavorite(branchId: $branchId) }`,
    { branchId },
  );
  return data.removeFavorite;
}
