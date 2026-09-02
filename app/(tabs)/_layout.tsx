// app/(tabs)/_layout.tsx
// Bottom tab bar: Home · Orders · Chat · Profile.
// Orders shows a badge with the count of orders that need customer action,
// derived defensively from the orders store (omitted if unavailable/zero).

import React from "react";
import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Home, ClipboardList, MessageCircle, User } from "lucide-react-native";
import { C, SP } from "@/theme/tokens";
import { useOrdersStore } from "@/stores/ordersStore";
import { useChatStore } from "@/stores/chatStore";
import type { OrderStatus } from "@/types/api";

// Statuses that require an explicit customer decision/response.
const NEEDS_ACTION: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  "PROVIDER_CHANGE_PROPOSED",
  "LAUNDRY_QUALITY_HOLD",
  "AWAITING_RETURN_SELECTION",
  "AWAITING_REDELIVERY_SELECTION",
  "AWAITING_PICKUP_RESCHEDULE",
  "DISPUTED",
]);

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  // Defensive: store may be empty (not yet loaded) — that simply yields no badge.
  const actionCount = useOrdersStore((s) => {
    try {
      return (s.orders ?? []).filter(
        (o) => NEEDS_ACTION.has(o.status) || o.activeQualityHold != null,
      ).length;
    } catch {
      return 0;
    }
  });

  // Defensive: sum of unread across conversations (0 → no badge).
  const chatUnread = useChatStore((s) => {
    try {
      return (s.conversations ?? []).reduce((n, c) => n + (c.customerUnread ?? 0), 0);
    } catch {
      return 0;
    }
  });

  const bottomInset = insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textTertiary,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarStyle: {
          height: SP.tabBar + bottomInset,
          paddingTop: SP.sm,
          paddingBottom: Math.max(bottomInset, SP.sm),
          backgroundColor: C.surface,
          borderTopColor: C.borderSubtle,
          borderTopWidth: 1,
          ...(Platform.OS === "android" ? { elevation: 8 } : {}),
        },
        tabBarItemStyle: { paddingVertical: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size ?? 24} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, size }) => (
            <ClipboardList color={color} size={size ?? 24} strokeWidth={2} />
          ),
          tabBarBadge: actionCount > 0 ? actionCount : undefined,
          tabBarBadgeStyle: { backgroundColor: C.error, color: C.textInverse, fontSize: 11 },
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size }) => (
            <MessageCircle color={color} size={size ?? 24} strokeWidth={2} />
          ),
          tabBarBadge: chatUnread > 0 ? chatUnread : undefined,
          tabBarBadgeStyle: { backgroundColor: C.error, color: C.textInverse, fontSize: 11 },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User color={color} size={size ?? 24} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}
