// src/components/ConversationTypeBadge.tsx
// A small pill that disambiguates who a chat thread is with: Laundromat, Home
// washer, or Courier. Conversations span three different counterparty types
// (merchant, washer, courier) and a bare name ("Carlos DelaCruz") doesn't say
// which — this makes it explicit at a glance in the chat list and thread header.

import React from "react";
import { Text, View, type ViewStyle } from "react-native";
import { C, RADIUS, SP } from "@/theme/tokens";
import { Store, Home, Truck } from "@/theme/icons";
import type { Conversation } from "@/types/api";

export type ConversationRole = "merchant" | "washer" | "courier";

export function roleOf(conversation: Pick<Conversation, "kind" | "providerType">): ConversationRole {
  if (conversation.kind === "COURIER") return "courier";
  return conversation.providerType === "WASHER" ? "washer" : "merchant";
}

const ROLE_META: Record<ConversationRole, { label: string; fg: string; bg: string; Icon: typeof Store }> = {
  merchant: { label: "Laundromat", fg: C.primary, bg: C.primaryTint, Icon: Store },
  washer:   { label: "Home washer", fg: C.washer, bg: C.washerTint, Icon: Home },
  courier:  { label: "Courier", fg: C.info, bg: C.infoTint, Icon: Truck },
};

export interface ConversationTypeBadgeProps {
  role: ConversationRole;
  /** Compact = icon-only chip for tight rows; default shows the label too. */
  compact?: boolean;
  style?: ViewStyle;
}

export function ConversationTypeBadge({ role, compact = false, style }: Readonly<ConversationTypeBadgeProps>) {
  const meta = ROLE_META[role];
  const Icon = meta.Icon;
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 3,
          backgroundColor: meta.bg,
          borderRadius: RADIUS.pill,
          paddingHorizontal: compact ? 6 : SP.sm,
          paddingVertical: 3,
        },
        style,
      ]}
    >
      <Icon size={11} color={meta.fg} strokeWidth={2.5} />
      {compact ? null : <Text style={{ fontSize: 11, fontWeight: "700", color: meta.fg }}>{meta.label}</Text>}
    </View>
  );
}
