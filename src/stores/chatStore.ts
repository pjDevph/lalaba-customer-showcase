// src/stores/chatStore.ts
// Customer chat: the list of conversations + a per-conversation message cache.
// Mirrors the ordersStore pattern — the store owns all fetching and folds
// mutation results back into the caches.

import { create } from "zustand";
import { userErrorMessage } from "../utils/userError";
import {
  myConversations,
  conversationMessages,
  sendMessage,
  startConversation,
  type SendMessageBody,
} from "../services/graphql/chat";
import type { Conversation, Message, ProviderType } from "../types/api";

interface ChatState {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  loading: boolean;
  error: string | null;

  loadConversations: () => Promise<void>;
  loadMessages: (id: string) => Promise<void>;
  send: (id: string, body: SendMessageBody) => Promise<void>;
  startWith: (
    branchId: string,
    providerType: ProviderType,
    orderId: string,
  ) => Promise<string | null>;

  totalUnread: () => number;
  reset: () => void;
}

// Safe user-facing error mapping (RISK-H-032) - never raw server text.
function errMsg(err: unknown, fallback: string): string {
  return userErrorMessage(err, fallback);
}

export const useChatStore = create<ChatState>()((set, get) => {
  // Fold a conversation into the list (replace if present, else prepend).
  function upsertConversation(conv: Conversation): void {
    const conversations = get().conversations.some((c) => c._id === conv._id)
      ? get().conversations.map((c) => (c._id === conv._id ? conv : c))
      : [conv, ...get().conversations];
    set({ conversations });
  }

  return {
    conversations: [],
    messages: {},
    loading: false,
    error: null,

    loadConversations: async () => {
      set({ loading: true, error: null });
      try {
        set({ conversations: await myConversations(), loading: false });
      } catch (err) {
        set({ error: errMsg(err, "Could not load your conversations."), loading: false });
      }
    },

    loadMessages: async (id) => {
      set({ error: null });
      try {
        const msgs = await conversationMessages(id);
        set({ messages: { ...get().messages, [id]: msgs } });
      } catch (err) {
        set({ error: errMsg(err, "Could not load these messages.") });
      }
    },

    send: async (id, body) => {
      set({ error: null });
      try {
        const msg = await sendMessage(id, body);
        // Append the returned message to the cached thread.
        const existing = get().messages[id] ?? [];
        set({ messages: { ...get().messages, [id]: [...existing, msg] } });
        // Refresh the conversation summary (last message / preview). The
        // provider now has one more unread, so the receipt reads "Sent" (not
        // "Seen") until they actually read it and a refresh resets the count.
        const conv = get().conversations.find((c) => c._id === id);
        if (conv) {
          upsertConversation({
            ...conv,
            lastMessageText: msg.text ?? (msg.imageUrl ? "📷 Photo" : conv.lastMessageText),
            lastMessageAt: msg.createdAt,
            customerUnread: 0,
            providerUnread: (conv.providerUnread ?? 0) + 1,
          });
        }
      } catch (err) {
        set({ error: errMsg(err, "Could not send your message.") });
      }
    },

    startWith: async (branchId, providerType, orderId) => {
      set({ error: null });
      try {
        const conv = await startConversation(branchId, providerType, orderId);
        upsertConversation(conv);
        return conv._id;
      } catch (err) {
        set({ error: errMsg(err, "Could not start this conversation.") });
        return null;
      }
    },

    totalUnread: () =>
      get().conversations.reduce((sum, c) => sum + (c.customerUnread ?? 0), 0),

    reset: () => set({ conversations: [], messages: {}, loading: false, error: null }),
  };
});
