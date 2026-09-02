// app/notifications.tsx
// The customer's notification inbox.
//
// Tapping a row goes to the thing it is about — an order row opens that order,
// where the customer can actually act on it. Routing is decided client-side in
// services/notificationRouting; see the note there for why the server no longer
// sends route strings.

import React, { useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { TopBar } from "@/components";
import { C, SP, RADIUS, TYPE } from "@/theme/tokens";
import { Icon, type IconName } from "@/theme/icons";
import { useNotificationFeedStore } from "@/stores/notificationFeedStore";
import { routeForNotification } from "@/services/notificationRouting";
import type { NotificationItem } from "@/services/graphql/notifications";

/**
 * The icon says what KIND of event this is at a glance.
 *
 * Keyed off the order status rather than the coarse category: every order row
 * shares one category, so categorising alone gave a screen of identical
 * baskets where nothing stood out. Action-needed rows read amber regardless of
 * status — that distinction matters more than which step it is.
 */
function glyphFor(item: NotificationItem): {
  name: IconName;
  tint: string;
  bg: string;
} {
  if (item.type === "ORDER_ACTION_NEEDED") {
    return { name: "circleAlert", tint: C.warningText, bg: C.warningTint };
  }

  const blue = { tint: C.primaryText, bg: C.primaryTint };
  const green = { tint: C.success, bg: C.successTint };

  switch (item.data?.status ?? "") {
    case "accepted_by_provider":
    case "delivered_to_customer":
      return { name: "circleCheck", ...green };
    case "rejected_by_provider":
    case "cancelled":
      return { name: "x", tint: C.error, bg: C.errorTint };
    case "pickup_assigned":
    case "return_assigned":
      return { name: "userRound", ...blue };
    case "pickup_en_route":
    case "return_en_route":
      return { name: "truck", ...blue };
    case "pickup_weighed":
      return { name: "scale", ...blue };
    case "laundry_ready":
      return { name: "shoppingBasket", ...green };
    case "awaiting_customer_pickup":
      return { name: "mapPin", ...blue };
    case "refunded":
      return { name: "wallet", ...blue };
    default:
      return { name: "bell", ...blue };
  }
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.round(hrs / 24)}d`;
}

/** TODAY / YESTERDAY / EARLIER — enough grouping for an inbox this size. */
function groupOf(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "EARLIER";
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (d.getTime() >= startOfToday.getTime()) return "TODAY";
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  if (d.getTime() >= startOfYesterday.getTime()) return "YESTERDAY";
  return "EARLIER";
}

type ListRow =
  | { kind: "header"; key: string; label: string }
  | { kind: "item"; key: string; item: NotificationItem };

function withGroupHeaders(items: NotificationItem[]): ListRow[] {
  const rows: ListRow[] = [];
  let current = "";
  for (const item of items) {
    const g = groupOf(item.createdAt);
    if (g !== current) {
      current = g;
      rows.push({ kind: "header", key: `h-${g}`, label: g });
    }
    rows.push({ kind: "item", key: item.id, item });
  }
  return rows;
}

function Row({
  item,
  onPress,
}: Readonly<{ item: NotificationItem; onPress: () => void }>) {
  const { name, tint, bg } = glyphFor(item);
  const unread = !item.isRead;
  return (
    <Pressable
      onPress={onPress}
      // A plain style ARRAY, not a style function. The function form is valid
      // and was rendering the icon stacked above the content on device rather
      // than beside it; a StyleSheet row is the ordinary way to write this and
      // removes the only unusual thing about the component.
      style={[rowStyles.row, unread ? rowStyles.rowUnread : rowStyles.rowRead]}
      android_ripple={{ color: C.surfaceAlt }}
    >
      <View style={[rowStyles.icon, { backgroundColor: bg }]}>
        <Icon name={name} size={20} color={tint} />
      </View>

      <View style={rowStyles.content}>
        <View style={rowStyles.headerRow}>
          <Text style={rowStyles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={rowStyles.time}>{relativeTime(item.createdAt)}</Text>
          {/* Dot last, inside the row's own padding — it should never look
              pinned to the screen edge. */}
          {unread ? <View style={rowStyles.dot} /> : null}
        </View>

        <Text style={rowStyles.body} numberOfLines={3}>
          {item.body}
        </Text>

        {item.data?.orderNumber ? (
          <Text style={rowStyles.meta}>Order {item.data.orderNumber}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: SP.base,
    paddingVertical: SP.md + 2,
  },
  rowUnread: { backgroundColor: C.primaryTint },
  rowRead: { backgroundColor: C.surface },
  icon: {
    width: 42,
    height: 42,
    flexShrink: 0,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    // Replaces the parent `gap`, which not every RN version honours on a row.
    marginRight: SP.md,
  },
  content: { flex: 1, minWidth: 0 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  title: { flex: 1, minWidth: 0, fontSize: 16, fontWeight: "600", color: C.ink },
  time: { flexShrink: 0, fontSize: 12, color: C.textMuted, marginLeft: SP.sm },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
    marginLeft: 6,
    backgroundColor: C.primary,
  },
  body: { fontSize: 14, color: C.textSecondary, marginTop: 2 },
  meta: { fontSize: 12, color: C.textTertiary, marginTop: 3 },
});

export default function NotificationsScreen() {
  const items = useNotificationFeedStore((s) => s.items);
  const loading = useNotificationFeedStore((s) => s.loading);
  const loadingMore = useNotificationFeedStore((s) => s.loadingMore);
  const error = useNotificationFeedStore((s) => s.error);
  const unread = useNotificationFeedStore((s) => s.unread);
  const loadFirstPage = useNotificationFeedStore((s) => s.loadFirstPage);
  const loadMore = useNotificationFeedStore((s) => s.loadMore);
  const refreshUnread = useNotificationFeedStore((s) => s.refreshUnread);
  const markRead = useNotificationFeedStore((s) => s.markRead);
  const markAllRead = useNotificationFeedStore((s) => s.markAllRead);

  useEffect(() => {
    void loadFirstPage();
    void refreshUnread();
  }, [loadFirstPage, refreshUnread]);

  const onPressRow = useCallback(
    (item: NotificationItem) => {
      void markRead(item.id);
      router.push(routeForNotification({ type: item.type, ...item.data }) as never);
    },
    [markRead],
  );

  return (
    // TopBar draws no inset of its own, so the screen supplies it — without
    // this the title sits at the same height as the status-bar clock.
    // Same page background as Home, so the inbox reads as part of the app
    // rather than a stark white sheet the rest of the product never uses.
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <TopBar
        title="Notifications"
        subtitle={
          unread > 0 ? `${unread} unread` : items.length > 0 ? "You're all caught up" : undefined
        }
        showBack
        onBack={() => router.back()}
        // The action disappears at zero rather than sitting there disabled —
        // there is nothing to mark, and a dead control invites tapping.
        rightAction={
          unread > 0 ? (
            <Pressable onPress={() => void markAllRead()} hitSlop={8}>
              <Text style={[TYPE.bodyStrong, { color: C.primary }]}>
                Mark all as read
              </Text>
            </Pressable>
          ) : undefined
        }
      />

      {loading && items.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={withGroupHeaders(items)}
          keyExtractor={(r) => r.key}
          renderItem={({ item: row }) =>
            row.kind === "header" ? (
              <Text
                style={{
                  paddingHorizontal: SP.base,
                  paddingTop: SP.base,
                  paddingBottom: SP.sm,
                  fontSize: 13,
                  fontWeight: "600",
                  letterSpacing: 0.5,
                  color: C.textTertiary,
                }}
              >
                {row.label}
              </Text>
            ) : (
              <Row item={row.item} onPress={() => onPressRow(row.item)} />
            )
          }
          // Inset to the text column, so the divider separates messages rather
          // than cutting across the icon rail.
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, marginLeft: 42 + SP.base + SP.md, backgroundColor: C.borderSubtle }} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() => {
                void loadFirstPage({ refresh: true });
                void refreshUnread();
              }}
              tintColor={C.primary}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => void loadMore()}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: SP.lg }}>
                <ActivityIndicator color={C.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={{ padding: SP.xl, alignItems: "center", gap: SP.sm }}>
              <Text style={[TYPE.section, { color: C.ink }]}>
                {error ? "Couldn't load notifications" : "You're all caught up"}
              </Text>
              <Text
                style={[TYPE.body, { color: C.textMuted, textAlign: "center" }]}
              >
                {error
                  ? "Pull down to try again."
                  : "Updates about your orders will appear here."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
