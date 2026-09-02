// app/(tabs)/chat.tsx
// ─────────────────────────────────────────────────────────────────────────────
// CHAT — the customer's list of conversations with providers. Loads on mount
// and on focus; tap a row to open the thread. An "active order" pin surfaces
// at the top whenever a trackable order is in flight, and filter pills narrow
// the list to one counterparty type.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";

import { C, RADIUS, SP } from "@/theme/tokens";
import { TopBar, ConversationRow, Chip, SupportRow } from "@/components";
import { MapPin, MessageCircle, Truck, Store, Home } from "@/theme/icons";
import { useChatStore } from "@/stores/chatStore";
import { useOrdersStore } from "@/stores/ordersStore";
import { useSupportTicketStore } from "@/stores/supportTicketStore";
import { notify } from "@/stores/notificationStore";
import { EmptyState } from "@/features/provider/parts";
import { roleOf, type ConversationRole } from "@/components/ConversationTypeBadge";
import { isTrackable, orderNumber, statusBanner } from "@/features/orders/status";
import type { OnlineOrder } from "@/types/api";

type FilterKey = "all" | ConversationRole;

const FILTERS: readonly { key: FilterKey; label: string; Icon: typeof Truck }[] = [
  { key: "all", label: "All", Icon: MessageCircle },
  { key: "courier", label: "Couriers", Icon: Truck },
  { key: "merchant", label: "Laundromats", Icon: Store },
  { key: "washer", label: "Home washers", Icon: Home },
];

function mostRecentTrackableOrder(orders: OnlineOrder[]): OnlineOrder | null {
  const trackable = orders.filter((o) => isTrackable(o.status));
  if (trackable.length === 0) return null;
  return trackable.reduce((latest, o) => {
    const a = o.updatedAt ? new Date(o.updatedAt).getTime() : 0;
    const b = latest.updatedAt ? new Date(latest.updatedAt).getTime() : 0;
    return a > b ? o : latest;
  });
}

function ActiveOrderPin({ order }: Readonly<{ order: OnlineOrder }>) {
  const banner = statusBanner(order);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Order ${orderNumber(order._id, order.orderNumber)} — ${banner.title}. View map.`}
      onPress={() => router.push(`/orders/${order._id}/tracking`)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: SP.md,
        marginHorizontal: SP.screen,
        marginTop: SP.sm,
        marginBottom: SP.xs,
        padding: SP.md,
        borderRadius: RADIUS.lg,
        backgroundColor: C.primaryTint,
        borderWidth: 1,
        borderColor: C.primaryTint2,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: RADIUS.md,
          backgroundColor: C.surface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MapPin size={18} color={C.primaryText} strokeWidth={2} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, fontWeight: "700", color: C.primaryText, letterSpacing: 0.3 }}>
          ORDER {orderNumber(order._id, order.orderNumber)} IN PROGRESS
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "600", color: C.ink, marginTop: 1 }}>
          {banner.title}
        </Text>
      </View>

      <Text style={{ fontSize: 13, fontWeight: "700", color: C.primaryText }}>View Map</Text>
    </Pressable>
  );
}

export default function ChatScreen() {
  const conversations = useChatStore((s) => s.conversations);
  const loading = useChatStore((s) => s.loading);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const orders = useOrdersStore((s) => s.orders);
  const loadOrders = useOrdersStore((s) => s.loadOrders);
  const supportTicket = useSupportTicketStore((s) => s.ticket);
  const loadSupportTicket = useSupportTicketStore((s) => s.loadTicket);
  const loadSupportNotes = useSupportTicketStore((s) => s.loadNotes);

  const [filter, setFilter] = useState<FilterKey>("all");
  // Deliberately separate from the store's `loading` flag: useFocusEffect
  // below re-fires loadConversations() on every focus (not just first mount),
  // so binding RefreshControl's `refreshing` straight to `loading` toggles
  // the native pull indicator on background/focus refetches the user never
  // pulled for — RN's RefreshControl can then get stuck mid-gesture, only
  // resolving on the next REAL pull. This local flag is only ever set from
  // the user's own pull gesture below.
  const [refreshing, setRefreshing] = useState(false);

  // loadConversations() swallows its own errors into store state — surface a
  // failed pull-to-refresh, otherwise the spinner just stops with no sign
  // anything went wrong (reads as "stuck" even though the request completed).
  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    const err = useChatStore.getState().error;
    if (err) notify.error("Couldn't refresh chats", err);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      void loadConversations();
      void loadOrders();
      // Notes too, not just the ticket — SupportRow needs them to compute its
      // own unread badge (no server-side unread field to read instead, see
      // supportTicketStore.ts).
      void loadSupportTicket().then(() => {
        const ticket = useSupportTicketStore.getState().ticket;
        if (ticket) void loadSupportNotes(ticket._id);
      });
    }, [loadConversations, loadOrders, loadSupportTicket, loadSupportNotes]),
  );

  const pinnedOrder = useMemo(() => mostRecentTrackableOrder(orders), [orders]);

  const visible = useMemo(
    () => (filter === "all" ? conversations : conversations.filter((c) => roleOf(c) === filter)),
    [conversations, filter],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <TopBar title="Messages" />

      {pinnedOrder ? <ActiveOrderPin order={pinnedOrder} /> : null}

      {conversations.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, flexShrink: 0 }}
          contentContainerStyle={{
            paddingHorizontal: SP.screen,
            paddingVertical: SP.sm,
            gap: SP.sm,
          }}
        >
          {FILTERS.map(({ key, label, Icon }) => (
            <Chip
              key={key}
              label={label}
              selected={filter === key}
              onPress={() => setFilter(key)}
              leftIcon={<Icon size={14} color={filter === key ? C.textInverse : C.textSecondary} strokeWidth={2} />}
            />
          ))}
        </ScrollView>
      ) : null}

      <FlatList
        style={{ flex: 1 }}
        data={visible}
        keyExtractor={(c) => c._id}
        renderItem={({ item }) => (
          <ConversationRow
            conversation={item}
            onPress={() => router.push(`/chat/${item._id}`)}
          />
        )}
        ListHeaderComponent={
          // Only once a report actually exists — Help & Support is the entry
          // point ("Report a problem"); Chat should read as real
          // conversations, not partly as navigation. A permanently-pinned
          // row with nothing behind it read as clutter.
          supportTicket ? (
            <>
              <SupportRow onPress={() => router.push(`/support/${supportTicket._id}`)} />
              <View style={{ height: 1, marginLeft: SP.screen + 44 + SP.md, backgroundColor: C.borderSubtle }} />
            </>
          ) : null
        }
        ItemSeparatorComponent={() => (
          <View style={{ height: 1, marginLeft: SP.screen + 44 + SP.md, backgroundColor: C.borderSubtle }} />
        )}
        contentContainerStyle={visible.length === 0 ? { flexGrow: 1, justifyContent: "center" } : undefined}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              title={filter === "all" ? "No messages yet" : "No conversations here"}
              body={
                filter === "all"
                  ? "Your conversations with providers will appear here."
                  : "Nothing matches this filter yet."
              }
              icon={<MessageCircle size={32} color={C.textTertiary} />}
            />
          )
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={C.primary} />
        }
      />
    </SafeAreaView>
  );
}
