// src/services/graphql/ratings.ts
// GraphQL operations for order ratings: submit, edit, read own rating, and the
// public paginated ratings feed for a shop.

import { graphqlRequest } from "../../config/graphql";
import type { Rating, PaginatedRatings } from "../../types/api";

// ─── Fragments ────────────────────────────────────────────────────────────────
const RATING_FIELDS = `
  _id
  orderId
  branchId
  providerType
  customerUid
  overallScore
  scores { quality speed communication valueForMoney delivery }
  comment
  providerResponse { text respondedAt }
  editableUntil
  isReported
  reportReason
  isRemoved
  removalReason
  createdAt
  updatedAt
`;

// ─── submitRating ─────────────────────────────────────────────────────────────
// Note the SDL SubmitRatingInput also carries `orderId`; we pass it in both the
// input and the top-level arg so either resolver form is satisfied.
export interface SubmitRatingInput {
  quality: number;
  speed: number;
  communication: number;
  valueForMoney: number;
  delivery: number;
  comment?: string;
}

export async function submitRating(
  orderId: string,
  input: SubmitRatingInput,
): Promise<Rating> {
  const data = await graphqlRequest<{ submitRating: Rating }>(
    `mutation SubmitRating($orderId: ID!, $input: SubmitRatingInput!) {
       submitRating(orderId: $orderId, input: $input) { ${RATING_FIELDS} }
     }`,
    { orderId, input: { ...input, orderId } },
  );
  return data.submitRating;
}

// ─── updateRating ─────────────────────────────────────────────────────────────
export interface UpdateRatingInput {
  quality: number;
  speed: number;
  communication: number;
  valueForMoney: number;
  delivery: number;
  comment?: string;
}

export async function updateRating(
  orderId: string,
  input: UpdateRatingInput,
): Promise<Rating> {
  const data = await graphqlRequest<{ updateRating: Rating }>(
    `mutation UpdateRating($orderId: ID!, $input: UpdateRatingInput!) {
       updateRating(orderId: $orderId, input: $input) { ${RATING_FIELDS} }
     }`,
    { orderId, input },
  );
  return data.updateRating;
}

// ─── myRatingForOrder ─────────────────────────────────────────────────────────
export async function myRatingForOrder(orderId: string): Promise<Rating | null> {
  const data = await graphqlRequest<{ myRatingForOrder: Rating | null }>(
    `query MyRatingForOrder($orderId: ID!) {
       myRatingForOrder(orderId: $orderId) { ${RATING_FIELDS} }
     }`,
    { orderId },
  );
  return data.myRatingForOrder;
}

// ─── shopRatings ──────────────────────────────────────────────────────────────
export interface RatingFilterInput {
  limit?: number;
  offset?: number;
}

export async function shopRatings(
  branchId: string,
  filter?: RatingFilterInput,
): Promise<PaginatedRatings> {
  const data = await graphqlRequest<{ shopRatings: PaginatedRatings }>(
    `query ShopRatings($branchId: ID!, $filter: RatingFilterInput) {
       shopRatings(branchId: $branchId, filter: $filter) {
         data { ${RATING_FIELDS} }
         total limit offset
       }
     }`,
    { branchId, filter },
  );
  return data.shopRatings;
}
