// app/(tabs)/profile.tsx  — Profile tab: identity header, quick links, sign out.

import React, { useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { C, SP, RADIUS, SHADOW } from "@/theme/tokens";
import { Avatar, Button } from "@/components";
import { Icon, type IconName, ChevronRight } from "@/theme/icons";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationFeedStore } from "@/stores/notificationFeedStore";

interface RowDef {
  key: string;
  icon: IconName;
  label: string;
  /** Unread count shown as a pill. Omitted or 0 renders nothing. */
  badge?: number;
  onPress: () => void;
}

export default function ProfileScreen() {
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);

  // Badge the row so an unread order update is visible without opening it.
  const unread = useNotificationFeedStore((s) => s.unread);
  const refreshUnread = useNotificationFeedStore((s) => s.refreshUnread);
  useEffect(() => { void refreshUnread(); }, [refreshUnread]);

  const displayName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : "Your account";
  const subtitle = profile?.email ?? profile?.phoneNumber ?? "";

  const rows: RowDef[] = [
    { key: "notifications", icon: "bell", label: "Notifications", badge: unread, onPress: () => router.push("/notifications") },
    { key: "addresses", icon: "mapPin", label: "My addresses", onPress: () => router.push("/address-select") },
    { key: "favorites", icon: "heart", label: "Favorites", onPress: () => router.push("/favorites") },
    { key: "settings", icon: "settings", label: "Settings", onPress: () => router.push("/settings") },
    { key: "help", icon: "info", label: "Help & support", onPress: () => router.push("/settings/support") },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SP.screen, gap: SP.lg }}>
        {/* Identity header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: SP.base,
            backgroundColor: C.surface,
            borderRadius: RADIUS.xl,
            borderWidth: 1,
            borderColor: C.border,
            padding: SP.lg,
            ...SHADOW.sm,
          }}
        >
          <Avatar name={displayName} size="lg" solid />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: "700", color: C.ink }}>
              {displayName}
            </Text>
            {subtitle ? (
              <Text numberOfLines={1} style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Quick links */}
        <View
          style={{
            backgroundColor: C.surface,
            borderRadius: RADIUS.xl,
            borderWidth: 1,
            borderColor: C.border,
            overflow: "hidden",
            ...SHADOW.sm,
          }}
        >
          {rows.map((r, i) => (
            <Pressable
              key={r.key}
              accessibilityRole="button"
              onPress={r.onPress}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: SP.md,
                paddingHorizontal: SP.base,
                paddingVertical: SP.base,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: C.borderSubtle,
                backgroundColor: C.surface,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: RADIUS.md,
                  backgroundColor: C.primaryTint,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={r.icon} size={18} color={C.primaryText} />
              </View>
              <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: C.ink }}>{r.label}</Text>
              {r.badge ? (
                <View
                  style={{
                    minWidth: 22,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: RADIUS.pill,
                    backgroundColor: C.primary,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: C.textInverse }}>
                    {r.badge > 99 ? "99+" : r.badge}
                  </Text>
                </View>
              ) : null}
              <ChevronRight size={20} color={C.textTertiary} />
            </Pressable>
          ))}
        </View>

        <Button label="Sign out" variant="outline" fullWidth onPress={() => void signOut()} />
      </ScrollView>
    </SafeAreaView>
  );
}
