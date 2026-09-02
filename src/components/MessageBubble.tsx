// src/components/MessageBubble.tsx
// A single chat message bubble. The customer's own messages (mine) sit on the
// right with a primary-blue fill and white text; provider messages sit on the
// left with a subtle surface fill and ink text. Presentational.

import React, { useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { C, RADIUS, SP } from "@/theme/tokens";
import type { Message } from "@/types/api";

const IMAGE_MAX_WIDTH = 220;

export interface MessageBubbleProps {
  message: Message;
  // Hide the timestamp when this message is grouped with a following one in the
  // same minute — the time is shown once, on the last message of the run.
  showTime?: boolean;
  style?: ViewStyle;
}

function timeLabel(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
}

function ChatImage({ uri }: Readonly<{ uri: string }>) {
  const [loading, setLoading] = useState(true);
  const [ratio, setRatio] = useState(1);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View
        style={{
          width: IMAGE_MAX_WIDTH,
          height: IMAGE_MAX_WIDTH * 0.7,
          borderRadius: RADIUS.lg,
          backgroundColor: C.surfaceAlt,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 12, color: C.textTertiary }}>Couldn’t load image</Text>
      </View>
    );
  }

  return (
    <View style={{ width: IMAGE_MAX_WIDTH, aspectRatio: ratio, borderRadius: RADIUS.lg, overflow: "hidden", backgroundColor: C.surfaceAlt }}>
      <Image
        source={{ uri }}
        resizeMode="cover"
        style={{ width: "100%", height: "100%" }}
        onLoadStart={() => setLoading(true)}
        onLoad={(e) => {
          const { width, height } = e.nativeEvent.source;
          if (width > 0 && height > 0) setRatio(width / height);
          setLoading(false);
        }}
        onError={() => {
          setLoading(false);
          setFailed(true);
        }}
      />
      {loading ? (
        <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
          <ActivityIndicator color={C.textTertiary} />
        </View>
      ) : null}
    </View>
  );
}

export function MessageBubble({ message, showTime = true, style }: Readonly<MessageBubbleProps>) {
  const mine = message.senderRole === "CUSTOMER";
  const time = showTime ? timeLabel(message.createdAt) : "";
  const hasImage = !!message.imageUrl;
  const hasText = !!message.text;

  return (
    <View
      style={[
        {
          maxWidth: "78%",
          alignSelf: mine ? "flex-end" : "flex-start",
          alignItems: mine ? "flex-end" : "flex-start",
          gap: 2,
        },
        style,
      ]}
    >
      {hasImage ? (
        <View
          style={{
            borderRadius: RADIUS.xl,
            borderBottomRightRadius: mine ? RADIUS.xs : RADIUS.xl,
            borderBottomLeftRadius: mine ? RADIUS.xl : RADIUS.xs,
            overflow: "hidden",
            padding: 3,
            backgroundColor: mine ? C.primary : C.surfaceAlt,
          }}
        >
          <ChatImage uri={message.imageUrl as string} />
        </View>
      ) : null}
      {hasText ? (
        <View
          style={{
            backgroundColor: mine ? C.primary : C.surfaceAlt,
            borderRadius: RADIUS.xl,
            borderBottomRightRadius: mine ? RADIUS.xs : RADIUS.xl,
            borderBottomLeftRadius: mine ? RADIUS.xl : RADIUS.xs,
            paddingHorizontal: SP.md,
            paddingVertical: SP.sm,
          }}
        >
          <Text style={{ fontSize: 15, lineHeight: 20, color: mine ? C.textInverse : C.ink }}>
            {message.text}
          </Text>
        </View>
      ) : null}
      {time ? (
        <Text style={{ fontSize: 11, color: C.textTertiary, paddingHorizontal: 4 }}>{time}</Text>
      ) : null}
    </View>
  );
}
