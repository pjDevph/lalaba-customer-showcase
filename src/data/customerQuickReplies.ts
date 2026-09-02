// src/data/customerQuickReplies.ts
// Contextual, varied quick-reply chips for the customer chat thread. Replaces
// a single hardcoded list — the pool is filtered by who the thread is with
// (merchant / washer / courier), which leg it's on (pickup / return), and
// what the linked order's status is, then a random subset is returned so
// reopening a thread doesn't always show the identical three chips.

import type { ChatLegType, OrderStatus } from "@/types/api";

export interface QuickReplyContext {
  role: "merchant" | "washer" | "courier";
  legType: ChatLegType | null;
  orderStatus?: OrderStatus | null;
}

interface PoolEntry {
  text: string;
  /** Roles this reply is relevant for; omit for "any role". */
  roles?: QuickReplyContext["role"][];
  /** Legs this reply is relevant for; omit for "any leg (or no leg)". */
  legs?: ChatLegType[];
  /** Only surface while the order is in one of these statuses. */
  statuses?: OrderStatus[];
}

const AWAITING_PICKUP_STATUSES: OrderStatus[] = [
  "AWAITING_PICKUP_ASSIGNMENT",
  "AWAITING_PICKUP_RESCHEDULE",
  "PICKUP_ASSIGNED",
  "PICKUP_EN_ROUTE",
  "PICKUP_ARRIVED",
  "PICKUP_WEIGHED",
];

const AWAITING_RETURN_STATUSES: OrderStatus[] = [
  "AWAITING_RETURN_ASSIGNMENT",
  "AWAITING_REDELIVERY_SELECTION",
  "RETURN_ASSIGNED",
  "RETURN_EN_ROUTE",
  "RETURN_ARRIVED",
  "REDELIVERY_SCHEDULED",
];

const IN_PROGRESS_STATUSES: OrderStatus[] = [
  "RECEIVED_BY_PROVIDER",
  "LAUNDRY_IN_PROGRESS",
  "LAUNDRY_QUALITY_HOLD",
  "LAUNDRY_READY",
];

// ─── Pool ───────────────────────────────────────────────────────────────────
const POOL: PoolEntry[] = [
  // General — always in play, any counterparty.
  { text: "Thank you!" },
  { text: "Got it, thanks for the update." },
  { text: "Can I get an update?" },
  { text: "Sorry for the delay, thanks for your patience." },
  { text: "Is everything okay with my order?" },

  // Provider (merchant / washer) — service & order questions.
  { text: "Where's my laundry?", roles: ["merchant", "washer"] },
  { text: "How much longer will this take?", roles: ["merchant", "washer"], statuses: IN_PROGRESS_STATUSES },
  { text: "Please handle my delicates with care.", roles: ["merchant", "washer"] },
  { text: "Can you send a photo of my laundry?", roles: ["merchant", "washer"], statuses: IN_PROGRESS_STATUSES },
  { text: "Is my order ready yet?", roles: ["merchant", "washer"], statuses: ["LAUNDRY_READY", "LAUNDRY_IN_PROGRESS"] },

  // Courier — pickup leg.
  { text: "I'm home now", roles: ["courier"], legs: ["PICKUP"] },
  { text: "Running a bit late", roles: ["courier"], legs: ["PICKUP"] },
  { text: "Please use the blue gate", roles: ["courier"], legs: ["PICKUP"] },
  { text: "I'll leave the bag with the guard", roles: ["courier"], legs: ["PICKUP"] },
  { text: "How far away are you?", roles: ["courier"], legs: ["PICKUP"], statuses: AWAITING_PICKUP_STATUSES },
  { text: "Please call when you arrive", roles: ["courier"], legs: ["PICKUP"] },

  // Courier — return/delivery leg.
  { text: "Please leave it with the guard", roles: ["courier"], legs: ["RETURN"] },
  { text: "I'm not home yet, can you come back later?", roles: ["courier"], legs: ["RETURN"] },
  { text: "How far away are you?", roles: ["courier"], legs: ["RETURN"], statuses: AWAITING_RETURN_STATUSES },
  { text: "Please knock loudly, doorbell's broken", roles: ["courier"], legs: ["RETURN"] },
  { text: "Thanks for the delivery!", roles: ["courier"], legs: ["RETURN"], statuses: ["DELIVERED_TO_CUSTOMER", "COMPLETED"] },

  // Courier — general (either leg).
  { text: "What's your ETA?", roles: ["courier"] },
];

function matches(entry: PoolEntry, ctx: QuickReplyContext): boolean {
  if (entry.roles && !entry.roles.includes(ctx.role)) return false;
  if (entry.legs && (!ctx.legType || !entry.legs.includes(ctx.legType))) return false;
  if (entry.statuses && (!ctx.orderStatus || !entry.statuses.includes(ctx.orderStatus))) return false;
  return true;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Returns a random subset (~3-4) of quick replies relevant to the given
 * conversation context. Call again (e.g. on screen mount, or when a new
 * message arrives) to re-roll the subset.
 */
export function quickRepliesFor(ctx: QuickReplyContext): string[] {
  const relevant = POOL.filter((entry) => matches(entry, ctx));
  const texts = Array.from(new Set(relevant.map((e) => e.text)));
  const count = texts.length <= 4 ? texts.length : 3 + Math.round(Math.random());
  return shuffle(texts).slice(0, count);
}
