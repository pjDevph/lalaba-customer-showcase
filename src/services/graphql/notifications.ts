// src/services/graphql/notifications.ts
// The customer's notification inbox.
//
// The backend feed has never been role-gated — customers have always had a
// feed, there was simply nothing sending to it and no client reading it. Order
// transitions now emit, so this is the read side.

import { graphqlRequest } from "../../config/graphql";

export type NotificationType =
  | "ORDER_STATUS"
  | "ORDER_ACTION_NEEDED"
  | "KYC_APPROVED"
  | "KYC_REJECTED"
  | "KYC_CASE_ACTION_NEEDED"
  | "DEVICE_REGISTRATION"
  | "STAFF_LOGIN"
  | "BROADCAST";

export type NotificationCategory =
  | "ORDER"
  | "ACCOUNT"
  | "VERIFICATION"
  | "DEVICE"
  | "STAFF"
  | "BROADCAST"
  | "SYSTEM";

export interface NotificationData {
  orderId?: string | null;
  orderNumber?: string | null;
  status?: string | null;
  conversationId?: string | null;
}

export interface NotificationItem {
  id: string;
  type: NotificationType | string;
  category: NotificationCategory | string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  data: NotificationData;
}

export interface PaginatedNotifications {
  data: NotificationItem[];
  total: number;
}

// `deepLink` is deliberately not requested. The server stopped sending route
// strings — one string cannot address apps with different route trees, and the
// merchant app dead-ended on exactly that. Routing is decided client-side from
// `type` and `data`.
const NOTIFICATION_FIELDS = `
  id type category title body isRead createdAt
  data { orderId orderNumber status conversationId }
`;

/** One page of the inbox, newest first. */
export async function gqlMyNotifications(
  limit = 20,
  offset = 0,
): Promise<PaginatedNotifications> {
  const data = await graphqlRequest<{
    myNotifications: PaginatedNotifications;
  }>(
    `query MyNotifications($limit: Int, $offset: Int) {
       myNotifications(limit: $limit, offset: $offset) {
         data { ${NOTIFICATION_FIELDS} }
         total
       }
     }`,
    { limit, offset },
  );
  return data.myNotifications;
}

/** Badge count. Capped server-side. */
export async function gqlMyUnreadNotificationCount(): Promise<number> {
  const data = await graphqlRequest<{ myUnreadNotificationCount: number }>(
    `query MyUnreadNotificationCount { myUnreadNotificationCount }`,
  );
  return data.myUnreadNotificationCount ?? 0;
}

export async function gqlMarkNotificationRead(id: string): Promise<void> {
  await graphqlRequest<{ markNotificationRead: boolean }>(
    `mutation MarkNotificationRead($id: ID!) { markNotificationRead(id: $id) }`,
    { id },
  );
}

export async function gqlMarkAllNotificationsRead(): Promise<void> {
  await graphqlRequest<{ markAllNotificationsRead: boolean }>(
    `mutation MarkAllNotificationsRead { markAllNotificationsRead }`,
  );
}
