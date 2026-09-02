// src/components/RatingSummary.tsx
import React from "react";
import { Text, View, type ViewStyle } from "react-native";
import { C, RADIUS, SP } from "@/theme/tokens";
import { StarRating } from "./StarRating";

export interface RatingSummaryProps {
  average: number;
  count: number;
  /** Counts per star bucket, index 0 = 1★ … index 4 = 5★. */
  distribution: [number, number, number, number, number];
  style?: ViewStyle;
}

export function RatingSummary({ average, count, distribution, style }: Readonly<RatingSummaryProps>) {
  const max = Math.max(1, ...distribution);
  return (
    <View style={[{ flexDirection: "row", gap: SP.xl, alignItems: "center" }, style]}>
      <View style={{ alignItems: "center", minWidth: 90 }}>
        <Text style={{ fontSize: 40, fontWeight: "700", color: C.ink, lineHeight: 44 }}>{average.toFixed(1)}</Text>
        <StarRating value={average} size={16} />
        <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{count} reviews</Text>
      </View>

      <View style={{ flex: 1, gap: 6 }}>
        {[5, 4, 3, 2, 1].map((star) => {
          const value = distribution[star - 1] ?? 0;
          const pct = value / max;
          return (
            <View key={star} style={{ flexDirection: "row", alignItems: "center", gap: SP.sm }}>
              <Text style={{ fontSize: 12, color: C.textMuted, width: 10, textAlign: "right" }}>{star}</Text>
              <View style={{ flex: 1, height: 8, borderRadius: RADIUS.pill, backgroundColor: C.surfaceAlt, overflow: "hidden" }}>
                <View style={{ width: `${Math.round(pct * 100)}%`, height: "100%", borderRadius: RADIUS.pill, backgroundColor: C.warning }} />
              </View>
              <Text style={{ fontSize: 12, color: C.textMuted, width: 28 }}>{value}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
