// src/stores/notificationFeedStore.ts
// The customer's notification inbox: one page at a time, plus the badge count.
//
// Session-only. The feed is server-owned and cheap to refetch, and a persisted
// copy would show a stale unread badge after a sign-out/sign-in as somebody
// else.

import { create } from "zustand";
import {
  gqlMyNotifications,
  gqlMyUnreadNotificationCount,
  gqlMarkNotificationRead,
  gqlMarkAllNotificationsRead,
  type NotificationItem,
} from "../services/graphql/notifications";

const PAGE = 20;

interface NotificationFeedState {
  items: NotificationItem[];
  unread: number;
  loading: boolean;
  loadingMore: boolean;
  error: boolean;
  hasMore: boolean;

  loadFirstPage: (opts?: { refresh?: boolean }) => Promise<void>;
  loadMore: () => Promise<void>;
  refreshUnread: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  reset: () => void;
}

export const useNotificationFeedStore = create<NotificationFeedState>(
  (set, get) => ({
    items: [],
    unread: 0,
    loading: false,
    loadingMore: false,
    error: false,
    hasMore: false,

    loadFirstPage: async (opts) => {
      // A background refresh keeps whatever is on screen; only a cold load has
      // nothing to fall back to, so only it shows a spinner or an error.
      if (!opts?.refresh) set({ loading: true, error: false });
      try {
        const page = await gqlMyNotifications(PAGE, 0);
        set({
          items: page.data,
          hasMore: page.data.length < page.total,
          error: false,
        });
      } catch {
        if (!opts?.refresh) set({ error: true });
      } finally {
        set({ loading: false });
      }
    },

    loadMore: async () => {
      const { items, hasMore, loadingMore } = get();
      if (!hasMore || loadingMore) return;
      set({ loadingMore: true });
      try {
        const page = await gqlMyNotifications(PAGE, items.length);
        // Dedupe by id: a row arriving while paging would otherwise shift the
        // offset and duplicate a neighbour.
        const seen = new Set(items.map((i) => i.id));
        const fresh = page.data.filter((i) => !seen.has(i.id));
        set({
          items: [...items, ...fresh],
          hasMore: items.length + page.data.length < page.total,
        });
      } catch {
        // Keep what is on screen; the user can pull to retry.
      } finally {
        set({ loadingMore: false });
      }
    },

    refreshUnread: async () => {
      try {
        set({ unread: await gqlMyUnreadNotificationCount() });
      } catch {
        // The badge is decoration — never surface a failure for it.
      }
    },

    markRead: async (id) => {
      const { items, unread } = get();
      const row = items.find((i) => i.id === id);
      if (!row || row.isRead) return;
      // Optimistic: the tap already navigated away, so waiting on the server
      // would leave the row looking unread behind them.
      set({
        items: items.map((i) => (i.id === id ? { ...i, isRead: true } : i)),
        unread: Math.max(0, unread - 1),
      });
      try {
        await gqlMarkNotificationRead(id);
      } catch {
        void get().loadFirstPage({ refresh: true });
        void get().refreshUnread();
      }
    },

    markAllRead: async () => {
      const { items } = get();
      set({ items: items.map((i) => ({ ...i, isRead: true })), unread: 0 });
      try {
        await gqlMarkAllNotificationsRead();
      } catch {
        void get().loadFirstPage({ refresh: true });
        void get().refreshUnread();
      }
    },

    reset: () =>
      set({
        items: [],
        unread: 0,
        loading: false,
        loadingMore: false,
        error: false,
        hasMore: false,
      }),
  }),
);
