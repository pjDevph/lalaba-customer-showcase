// src/components/SystemMessage.tsx
// A centered, muted pill for system / automatic chat messages (e.g. status
// changes) — distinct from the left/right MessageBubble used for people.

import React from "react";
import { Text, View, type ViewStyle } from "react-native";
import { C, RADIUS, SP } from "@/theme/tokens";

export interface SystemMessageProps {
  text: string;
  time?: string;
  style?: ViewStyle;
}

export function SystemMessage({ text, time, style }: Readonly<SystemMessageProps>) {
  return (
    <View style={[{ alignItems: "center" }, style]}>
      <View
        style={{
          maxWidth: "86%",
          backgroundColor: C.surfaceAlt,
          borderRadius: RADIUS.pill,
          paddingHorizontal: SP.md,
          paddingVertical: SP.xs,
        }}
      >
        <Text style={{ fontSize: 12, color: C.textMuted, textAlign: "center" }}>
          {text}
          {time ? <Text style={{ color: C.textTertiary }}>{`  ·  ${time}`}</Text> : null}
        </Text>
      </View>
    </View>
  );
}
