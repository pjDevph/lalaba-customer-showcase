// src/components/NotificationBell.tsx
// The customer's notification bell, with its unread badge.
//
// Reads the same store the Profile row reads, so the badge here and the count
// there cannot disagree.

import React, { useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { C, RADIUS } from "@/theme/tokens";
import { Icon } from "@/theme/icons";
import { useNotificationFeedStore } from "@/stores/notificationFeedStore";

export function NotificationBell({ size = 22 }: Readonly<{ size?: number }>) {
  const unread = useNotificationFeedStore((s) => s.unread);
  const refreshUnread = useNotificationFeedStore((s) => s.refreshUnread);
  useEffect(() => { void refreshUnread(); }, [refreshUnread]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
      onPress={() => router.push("/notifications")}
      hitSlop={8}
      style={{ padding: 4 }}
    >
      <Icon name="bell" size={size} color={C.ink} />
      {unread > 0 && (
        <View
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            minWidth: 16,
            height: 16,
            paddingHorizontal: 3,
            borderRadius: RADIUS.pill,
            backgroundColor: C.error,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: C.textInverse, fontSize: 10, fontWeight: "700" }}>
            {unread > 99 ? "99+" : unread}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
