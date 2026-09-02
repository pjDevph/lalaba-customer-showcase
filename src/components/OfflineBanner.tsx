// src/components/OfflineBanner.tsx
// Persistent slim banner shown whenever the device has no usable connection
// (uiStore.isOffline, driven by src/services/network.ts). Rendered once at the
// app root so it is visible on every screen.

import React from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, SP } from "@/theme/tokens";
import { useUIStore } from "@/stores/uiStore";

export function OfflineBanner() {
  const isOffline = useUIStore((s) => s.isOffline);
  const insets = useSafeAreaInsets();
  if (!isOffline) return null;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999,
        paddingTop: insets.top,
        backgroundColor: C.ink,
      }}
    >
      <Text
        style={{
          textAlign: "center",
          color: C.textInverse,
          fontSize: 12.5,
          fontWeight: "700",
          paddingVertical: 6,
          paddingHorizontal: SP.base,
        }}
      >
        You're offline — reconnect to book or update orders.
      </Text>
    </View>
  );
}
