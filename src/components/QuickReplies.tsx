// src/components/QuickReplies.tsx
// A horizontally-scrolling row of canned-reply chips shown above the chat input.
// Tapping a chip sends that text immediately (the screen wires onSelect).

import React from "react";
import { ScrollView, Text, Pressable, type ViewStyle } from "react-native";
import { C, RADIUS, SP } from "@/theme/tokens";

export interface QuickRepliesProps {
  replies: string[];
  onSelect: (text: string) => void;
  style?: ViewStyle;
}

export function QuickReplies({ replies, onSelect, style }: Readonly<QuickRepliesProps>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      // alignItems:center + flexGrow:0 keep the chips their natural pill height
      // (a horizontal ScrollView otherwise stretches children on the cross-axis).
      contentContainerStyle={{ gap: SP.sm, paddingHorizontal: SP.screen, paddingVertical: SP.sm, alignItems: "center" }}
      style={[{ flexGrow: 0, flexShrink: 0 }, style]}
    >
      {replies.map((reply) => (
        <Pressable
          key={reply}
          accessibilityRole="button"
          accessibilityLabel={`Send: ${reply}`}
          onPress={() => onSelect(reply)}
          style={{
            backgroundColor: C.primaryTint,
            borderRadius: RADIUS.pill,
            paddingHorizontal: SP.base,
            paddingVertical: SP.sm,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: C.primaryText }}>{reply}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
