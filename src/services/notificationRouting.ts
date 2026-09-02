// src/services/notificationRouting.ts
// Where a tapped notification goes.
//
// Client-side on purpose. The backend used to send a `deepLink` string, and it
// could not work: one value cannot address four apps with four different route
// trees. The merchant app pushed those strings straight into its router and
// dead-ended on "Unmatched Route" for every device-approval row. The server no
// longer sends them; each app decides from `type` and `data`, against routes it
// actually has.
//
// The rule this file exists to keep: a tap must never land nowhere. Anything
// unrecognised falls through to the inbox, which always exists.

export interface NotificationRouteData {
  type?: string | null;
  orderId?: string | null;
  /** Order status, e.g. 'pickup_en_route' — decides tracking vs detail. */
  status?: string | null;
  conversationId?: string | null;
}

/** The customer's inbox. The safe landing for anything unroutable. */
export const NOTIFICATIONS_ROUTE = "/notifications";

export function routeForNotification(data: NotificationRouteData): string {
  const type = data.type ?? "";

  // Everything the customer is told about an order is about ONE order, and the
  // detail screen is where they can act on it — reschedule a failed pickup,
  // answer a quality hold, choose how to get their laundry back.
  if (type === "ORDER_STATUS" || type === "ORDER_ACTION_NEEDED") {
    if (!data.orderId) return "/(tabs)/orders";
    const id = encodeURIComponent(data.orderId);
    // A rider on the move is the one case where the detail page is the wrong
    // answer: the customer opened this to see where they are, not to read the
    // order again.
    const enRoute =
      data.status === "pickup_en_route" || data.status === "return_en_route";
    return enRoute ? `/orders/${id}/tracking` : `/orders/${id}`;
  }

  if (data.conversationId) {
    return `/chat/${encodeURIComponent(data.conversationId)}`;
  }

  // BROADCAST, SYSTEM, and anything a newer backend introduces. A customer has
  // no verification or device screens — those types are provider-only and
  // should never reach this app, but if one does it must not dead-end.
  return NOTIFICATIONS_ROUTE;
}
