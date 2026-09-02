// src/components/ConversationRow.tsx
// A single conversation preview row for the Chat list: provider avatar,
// provider name, last-message preview (or a prompt when empty), relative time,
// and an unread-count badge. Presentational — the screen wires onPress.

import React from "react";
import { Pressable, Text, View, type ViewStyle } from "react-native";
import { C, RADIUS, SP, TYPE } from "@/theme/tokens";
import { Avatar } from "./Avatar";
import { ConversationTypeBadge, roleOf } from "./ConversationTypeBadge";
import type { Conversation } from "@/types/api";

/** Short, stable human order number derived from the Mongo id — matches
 *  `orderNumber()` in app/orders/_status.ts (kept local to avoid a
 *  components → app import). */
function shortOrderNumber(id: string): string {
  return `#LB-${id.slice(-4).toUpperCase()}`;
}

export interface ConversationRowProps {
  conversation: Conversation;
  onPress?: () => void;
  style?: ViewStyle;
}

/** Compact relative time: "now", "2m", "3h", "Jul 28" (older than a day). */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return new Date(then).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

export function ConversationRow({ conversation, onPress, style }: Readonly<ConversationRowProps>) {
  const isCourier = conversation.kind === "COURIER";
  const accent = isCourier || conversation.providerType === "WASHER" ? "washer" : "merchant";
  const unread = conversation.customerUnread ?? 0;
  const hasUnread = unread > 0;
  // For a rider thread, lead with the leg role so it reads distinctly from the
  // shop thread ("Pickup rider · On the way").
  const roleLabel = isCourier ? (conversation.legType === "RETURN" ? "Return rider" : "Pickup rider") : null;
  const base = conversation.lastMessageText?.trim() || "Start the conversation";
  const preview = roleLabel ? `${roleLabel} · ${base}` : base;
  const time = relativeTime(conversation.lastMessageAt);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Chat with ${conversation.providerName}`}
      onPress={onPress}
      disabled={!onPress}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: SP.md,
          paddingHorizontal: SP.screen,
          paddingVertical: SP.md,
          backgroundColor: C.surface,
        },
        style,
      ]}
    >
      <Avatar name={conversation.providerName} type={accent} size="md" />

      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: SP.sm }}>
          <Text
            numberOfLines={1}
            style={{ ...TYPE.cardTitle, flex: 1, fontWeight: hasUnread ? "700" : "600" }}
          >
            {conversation.providerName}
            {conversation.orderId ? (
              <Text style={{ fontSize: 13, fontWeight: "400", color: C.textMuted }}>
                {"  "}
                {shortOrderNumber(conversation.orderId)}
              </Text>
            ) : null}
          </Text>
          {time ? (
            <Text style={{ fontSize: 12, color: hasUnread ? C.primary : C.textMuted }}>{time}</Text>
          ) : null}
        </View>

        <ConversationTypeBadge role={roleOf(conversation)} style={{ alignSelf: "flex-start", marginTop: 1 }} />

        <View style={{ flexDirection: "row", alignItems: "center", gap: SP.sm }}>
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 14,
              color: hasUnread ? C.ink : C.textMuted,
              fontWeight: hasUnread ? "600" : "400",
            }}
          >
            {preview}
          </Text>
          {hasUnread ? (
            <View
              style={{
                minWidth: 20,
                height: 20,
                borderRadius: RADIUS.pill,
                paddingHorizontal: 6,
                backgroundColor: C.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: C.textInverse }}>
                {unread > 99 ? "99+" : unread}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
