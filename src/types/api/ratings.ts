// src/types/api/ratings.ts
// Ratings and reviews.
// Split out of the former monolithic src/types/api.ts (F2, 600-line limit).

import type {
  DateTimeString,
  ProviderType,
} from "../enums";

// ─── Ratings ──────────────────────────────────────────────────────────────────
export interface RatingScores {
  quality: number;
  speed: number;
  communication: number;
  valueForMoney: number;
  delivery: number;
}

export interface ProviderResponse {
  text: string;
  respondedAt: DateTimeString;
}

export interface Rating {
  _id: string;
  orderId: string;
  branchId: string;
  providerType: ProviderType;
  customerUid: string;
  overallScore: number;
  scores: RatingScores;
  comment: string | null;
  providerResponse: ProviderResponse | null;
  editableUntil: DateTimeString;
  isReported: boolean;
  reportReason: string | null;
  isRemoved: boolean;
  removalReason: string | null;
  createdAt: DateTimeString | null;
  updatedAt: DateTimeString | null;
}

export interface PaginatedRatings {
  data: Rating[];
  total: number;
  limit: number;
  offset: number;
}
