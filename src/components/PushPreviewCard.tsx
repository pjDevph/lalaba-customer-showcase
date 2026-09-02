// src/components/PushPreviewCard.tsx
import React from "react";
import { Text, View, type ViewStyle } from "react-native";
import { C, FONT, RADIUS, SP, SHADOW } from "@/theme/tokens";

export interface PushPreviewCardProps {
  /** App name shown in the notification header (default "Lalaba"). */
  appName?: string;
  /** Relative time, e.g. "now", "2m ago". */
  time?: string;
  title: string;
  body: string;
  /** Optional order reference shown mono at the bottom. */
  orderNumber?: string;
  style?: ViewStyle;
}

export function PushPreviewCard({
  appName = "Lalaba",
  time = "now",
  title,
  body,
  orderNumber,
  style,
}: Readonly<PushPreviewCardProps>) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          gap: SP.md,
          padding: SP.base,
          borderRadius: RADIUS.lg,
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.border,
          ...SHADOW.md,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: RADIUS.md,
          backgroundColor: C.primary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "800", color: C.textInverse }}>L</Text>
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: C.textMuted, letterSpacing: 0.3 }}>
            {appName.toUpperCase()}
          </Text>
          <Text style={{ fontSize: 12, color: C.textTertiary }}>{time}</Text>
        </View>
        <Text style={{ fontSize: 14, fontWeight: "700", color: C.ink, marginTop: 3 }}>{title}</Text>
        <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 2, lineHeight: 18 }}>{body}</Text>
        {orderNumber ? (
          <Text style={{ fontFamily: FONT.mono, fontSize: 12, color: C.textMuted, marginTop: 6 }}>{orderNumber}</Text>
        ) : null}
      </View>
    </View>
  );
}
