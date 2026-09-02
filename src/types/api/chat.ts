// src/types/api/chat.ts
// Chat — conversations and messages.
// Split out of the former monolithic src/types/api.ts (F2, 600-line limit).

import type {
  DateTimeString,
  ProviderType,
} from "../enums";

// ─── Chat ─────────────────────────────────────────────────────────────────────
/** Who authored a chat message (SDL ChatSenderRole — UPPERCASE on the wire).
 *  SUPPORT is client-side only — it's how SupportTicketNote authors are
 *  mapped into MessageBubble's prop shape, never a value the real chat wire
 *  sends. */
export type ChatSenderRole = "CUSTOMER" | "MERCHANT" | "WASHER" | "COURIER" | "SYSTEM" | "SUPPORT";

/** Non-customer side of a thread: the shop/washer, or a specific rider. */
export type ConversationKind = "PROVIDER" | "COURIER";
/** Which delivery leg a rider thread belongs to. */
export type ChatLegType = "PICKUP" | "RETURN";

/**
 * A conversation summary (SDL Conversation). The non-customer participant's
 * uid/name/type live in the provider* fields for BOTH kinds — for COURIER
 * threads they hold the rider's uid/name. `kind` is what the UI switches on.
 */
export interface Conversation {
  _id: string;
  customerUid: string;
  customerName: string;
  providerUid: string;
  branchId: string;
  providerType: ProviderType;
  providerName: string;
  kind: ConversationKind;
  legType: ChatLegType | null;
  orderId: string | null;
  /** True once this thread's session has ended (order concluded / leg handed
   *  over): readable in history, but closed to new messages. */
  ended: boolean;
  /** Whether the provider currently holds the Verified badge. Resolved live
   *  off the provider rather than snapshotted, so it always agrees with their
   *  profile. Always false on courier threads. */
  providerVerified: boolean;
  lastMessageText: string | null;
  lastMessageAt: DateTimeString | null;
  customerUnread: number;
  providerUnread: number;
  createdAt: DateTimeString | null;
  updatedAt: DateTimeString | null;
}

/** A single chat message within a conversation (SDL Message). */
export interface Message {
  _id: string;
  conversationId: string;
  senderUid: string;
  senderRole: ChatSenderRole;
  /** Null when the message is image-only. */
  text: string | null;
  /** Signed, short-lived read URL for an attached image; null if no image or
   *  the viewer isn't a participant. */
  imageUrl: string | null;
  createdAt: DateTimeString;
}
