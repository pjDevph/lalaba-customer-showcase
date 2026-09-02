// src/features/settings/parts.tsx
// Shared chrome for the settings stack: screen shell (safe area + TopBar +
// scroll body) and the standard chevron row. Underscore prefix → not a route.

import React from "react";
import { Pressable, ScrollView, Text, View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, SP, RADIUS, SHADOW } from "@/theme/tokens";
import { TopBar } from "@/components";
import { Icon, type IconName, ChevronRight } from "@/theme/icons";
import { backOr } from "@/lib/nav";

export function SettingsScreen({
  title,
  children,
  contentStyle,
}: Readonly<{ title: string; children: React.ReactNode; contentStyle?: ViewStyle }>) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <TopBar title={title} onBack={() => backOr("/(tabs)/profile")} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[{ padding: SP.screen, gap: SP.lg }, contentStyle]}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Card that stacks SettingsRows with hairline separators. */
export function RowGroup({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
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
      {children}
    </View>
  );
}

export function SettingsRow({
  icon,
  label,
  detail,
  onPress,
  first = false,
  destructive = false,
}: Readonly<{
  icon: IconName;
  label: string;
  detail?: string;
  onPress: () => void;
  first?: boolean;
  destructive?: boolean;
}>) {
  const tint = destructive ? C.error : C.primary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: SP.md,
        paddingHorizontal: SP.base,
        paddingVertical: SP.base,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: C.borderSubtle,
        backgroundColor: C.surface,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: RADIUS.md,
          backgroundColor: destructive ? C.errorTint : C.primaryTint,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={18} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: destructive ? C.error : C.ink }}>{label}</Text>
        {detail ? (
          <Text numberOfLines={1} style={{ fontSize: 12.5, color: C.textMuted, marginTop: 1 }}>
            {detail}
          </Text>
        ) : null}
      </View>
      <ChevronRight size={20} color={C.textTertiary} />
    </Pressable>
  );
}

/** Static legal/support body text block. */
export function LegalBlock({ heading, children }: Readonly<{ heading?: string; children: React.ReactNode }>) {
  return (
    <View style={{ gap: SP.xs }}>
      {heading ? <Text style={{ fontSize: 15, fontWeight: "700", color: C.ink }}>{heading}</Text> : null}
      <Text style={{ fontSize: 14, color: C.textSecondary, lineHeight: 21 }}>{children}</Text>
    </View>
  );
}
