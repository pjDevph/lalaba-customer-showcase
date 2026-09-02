// src/services/graphql/campaigns.ts
// Popup campaigns — the advertisement the backend decides to show.
//
// The app sends no role and no audience: the backend derives both from the
// authenticated identity, so a campaign meant for merchants can never be
// pulled by asking nicely. It also decides FREQUENCY — this app does not
// remember what it has already shown, because a local flag would reset on
// reinstall and a "once only" popup would come back.

import { graphqlRequest } from "@/config/graphql";

export type CampaignActionType = "NONE" | "PROMO" | "DEEP_LINK";

export interface CampaignPopup {
  _id: string;
  name: string;
  imageUrl: string;
  altText: string | null;
  actionType: CampaignActionType;
  promoId: string | null;
  deepLink: string | null;
}

const FIELDS = `_id name imageUrl altText actionType promoId deepLink`;

/**
 * The one campaign due right now, or null — which is the normal answer.
 *
 * `sessionId` identifies this sign-in for "every login" campaigns. It is
 * generated client-side and is not a credential: the worst a forged one buys
 * is seeing an advertisement again.
 */
export async function gqlNextCampaign(
  sessionId: string | null,
): Promise<CampaignPopup | null> {
  const data = await graphqlRequest<{ nextCampaign: CampaignPopup | null }>(
    `query NextCampaign($sessionId: String) {
       nextCampaign(sessionId: $sessionId) { ${FIELDS} }
     }`,
    { sessionId },
  );
  return data.nextCampaign ?? null;
}

export async function gqlMarkCampaignClicked(campaignId: string): Promise<void> {
  await graphqlRequest(
    `mutation MarkCampaignClicked($campaignId: ID!) {
       markCampaignClicked(campaignId: $campaignId)
     }`,
    { campaignId },
  );
}

export async function gqlMarkCampaignDismissed(campaignId: string): Promise<void> {
  await graphqlRequest(
    `mutation MarkCampaignDismissed($campaignId: ID!) {
       markCampaignDismissed(campaignId: $campaignId)
     }`,
    { campaignId },
  );
}

// ─── Claiming ────────────────────────────────────────────────────────────────

export type UserVoucherStatus = "AVAILABLE" | "USED" | "EXPIRED" | "REVOKED";

export interface UserVoucher {
  _id: string;
  promoId: string;
  code: string;
  description: string;
  discountType: "FLAT" | "PERCENTAGE" | "WAIVE";
  discountValue: number;
  maxDiscountCentavos: number | null;
  minOrderValueCentavos: number | null;
  expiresAt: string | null;
  claimedAt: string;
  usesRemaining: number;
  status: UserVoucherStatus;
  /** Answered by the backend against THIS order — see gqlMyVouchers. */
  usable: boolean;
  unusableReason: string | null;
  discountPreviewCentavos: number | null;
}

const VOUCHER_FIELDS = `
  _id promoId code description
  discountType discountValue maxDiscountCentavos minOrderValueCentavos
  expiresAt claimedAt usesRemaining status
  usable unusableReason discountPreviewCentavos
`;

/**
 * Take the offer a campaign is advertising.
 *
 * The campaign id is the only argument — the backend resolves which promo it
 * advertises and whether this account is in its audience, so the app cannot
 * claim a code by naming one. Idempotent: tapping twice yields the same
 * voucher, enforced by a unique index rather than by disabling the button.
 */
export async function gqlClaimCampaignOffer(
  campaignId: string,
): Promise<UserVoucher> {
  const data = await graphqlRequest<{ claimCampaignOffer: UserVoucher }>(
    `mutation ClaimCampaignOffer($campaignId: ID!) {
       claimCampaignOffer(campaignId: $campaignId) { ${VOUCHER_FIELDS} }
     }`,
    { campaignId },
  );
  return data.claimCampaignOffer;
}

/**
 * What this customer holds.
 *
 * Pass the order's PRE-discount subtotal to get per-voucher eligibility for
 * that order — usable, why not, and what it would take off. Omit it (the My
 * Vouchers screen) and the answer is the simpler one: whether the voucher is
 * still live.
 *
 * The amount is only ever a preview. The server recalculates at checkout, and
 * this app never sends a discount.
 */
export async function gqlMyVouchers(
  orderTotalCentavos?: number,
): Promise<UserVoucher[]> {
  const data = await graphqlRequest<{ myVouchers: UserVoucher[] }>(
    `query MyVouchers($orderTotalCentavos: Int) {
       myVouchers(orderTotalCentavos: $orderTotalCentavos) { ${VOUCHER_FIELDS} }
     }`,
    { orderTotalCentavos: orderTotalCentavos ?? null },
  );
  return data.myVouchers ?? [];
}
