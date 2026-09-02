// src/components/SupportRow.tsx
// Pinned "Lalaba Support" row at the top of the Chat tab — reads straight
// from useSupportTicketStore rather than taking a prop, since (unlike
// ConversationRow) there is only ever the one thread. No ticket yet ⇒ still
// renders, so "report a problem" is always reachable, not just after the
// first report exists.

import React from "react";
import { Pressable, Text, View, type ViewStyle } from "react-native";
import { C, RADIUS, SP, TYPE } from "@/theme/tokens";
import { LifeBuoy } from "@/theme/icons";
import { SupportBadge } from "./SupportBadge";
import { relativeTime } from "./ConversationRow";
import { useSupportTicketStore } from "@/stores/supportTicketStore";
import { useAuthStore } from "@/stores/authStore";

export interface SupportRowProps {
  onPress: () => void;
  style?: ViewStyle;
}

export function SupportRow({ onPress, style }: Readonly<SupportRowProps>) {
  const ticket = useSupportTicketStore((s) => s.ticket);
  const notes = useSupportTicketStore((s) => s.notes);
  const myUid = useAuthStore((s) => s.profile?._id);

  const lastNote = notes.length > 0 ? notes[notes.length - 1] : null;
  const readAt = ticket?.requesterLastReadAt ? new Date(ticket.requesterLastReadAt).getTime() : 0;
  const unreadCount = ticket
    ? notes.filter((n) => n.authorUid !== myUid && new Date(n.createdAt).getTime() > readAt).length
    : 0;
  const hasUnread = unreadCount > 0;

  const preview = lastNote?.body?.trim() || ticket?.subject?.trim() || "Tell us what went wrong";
  const time = relativeTime(lastNote?.createdAt ?? ticket?.updatedAt ?? null);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Lalaba Support"
      onPress={onPress}
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
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: C.warningTint,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LifeBuoy size={20} color={C.warningText} strokeWidth={2} />
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: SP.sm }}>
          <Text numberOfLines={1} style={{ ...TYPE.cardTitle, flex: 1, fontWeight: hasUnread ? "700" : "600" }}>
            Lalaba Support
          </Text>
          {time ? (
            <Text style={{ fontSize: 12, color: hasUnread ? C.warningText : C.textMuted }}>{time}</Text>
          ) : null}
        </View>

        <SupportBadge style={{ alignSelf: "flex-start", marginTop: 1 }} />

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
                backgroundColor: C.warning,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: C.textInverse }}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
