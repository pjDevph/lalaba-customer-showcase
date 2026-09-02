// src/components/SupportBadge.tsx
// The "this is Lalaba Support, not a provider" pill — deliberately its own
// component rather than a 4th ConversationRole. Amber, not the primary blue
// or washer/courier palette ConversationTypeBadge uses, so a report thread
// reads as distinct at a glance, never mistaken for an order conversation.

import React from "react";
import { Text, View, type ViewStyle } from "react-native";
import { C, RADIUS, SP } from "@/theme/tokens";
import { LifeBuoy } from "@/theme/icons";

export interface SupportBadgeProps {
  compact?: boolean;
  style?: ViewStyle;
}

export function SupportBadge({ compact = false, style }: Readonly<SupportBadgeProps>) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 3,
          backgroundColor: C.warningTint,
          borderRadius: RADIUS.pill,
          paddingHorizontal: compact ? 6 : SP.sm,
          paddingVertical: 3,
        },
        style,
      ]}
    >
      <LifeBuoy size={11} color={C.warningText} strokeWidth={2.5} />
      {compact ? null : <Text style={{ fontSize: 11, fontWeight: "700", color: C.warningText }}>Support</Text>}
    </View>
  );
}
