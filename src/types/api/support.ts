// src/types/api/support.ts
// Support tickets and presence.
// Split out of the former monolithic src/types/api.ts (F2, 600-line limit).

import type {
  DateTimeString,
} from "../enums";

// ─── Support tickets ────────────────────────────────────────────────────────
// The customer-owned slice of the backend's admin-facing ticket system —
// only the fields myOpenSupportTicket/mySupportTicketNotes actually return.
export type TicketCategory =
  | "ORDER_LATE"
  | "ORDER_DAMAGED"
  | "ORDER_MISSING_ITEMS"
  | "PAYMENT_DISPUTE"
  | "REFUND_REQUEST"
  | "WALLET_TOPUP"
  | "COURIER_CONDUCT"
  | "PROVIDER_CONDUCT"
  | "ACCOUNT_ACCESS"
  | "VERIFICATION"
  | "APP_BUG"
  | "OTHER";

export type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_ON_CUSTOMER"
  | "ESCALATED"
  | "RESOLVED"
  | "CLOSED";

export interface SupportTicket {
  _id: string;
  ticketNumber: string;
  subject: string;
  body: string;
  status: TicketStatus;
  category: TicketCategory;
  /** Null while waiting in the unassigned queue — no agent has picked it up yet. */
  assignedToName: string | null;
  requesterLastReadAt: DateTimeString | null;
  createdAt: DateTimeString | null;
  updatedAt: DateTimeString | null;
}

/** Only the CUSTOMER-visibility fields — INTERNAL notes never reach this app. */
export interface SupportTicketNote {
  _id: string;
  authorUid: string;
  authorName: string;
  body: string;
  /** Signed, short-lived read URL; null if no attachment. */
  imageUrl: string | null;
  createdAt: DateTimeString;
}

/** Live online/last-seen status for one user (SDL PresenceStatus). */
export interface PresenceStatus {
  uid: string;
  isOnline: boolean;
  lastSeenAt: DateTimeString | null;
}
