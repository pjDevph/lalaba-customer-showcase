// src/components/StepCounter.tsx
import React from "react";
import { Text, View, type ViewStyle } from "react-native";
import { C, RADIUS, SP } from "@/theme/tokens";

export interface StepCounterProps {
  /** Current step (1-based). */
  step: number;
  /** Total number of steps. */
  total: number;
  /** Show the "Step N of M" caption (default true). */
  showLabel?: boolean;
  style?: ViewStyle;
}

export function StepCounter({ step, total, showLabel = true, style }: Readonly<StepCounterProps>) {
  const clamped = Math.min(Math.max(step, 0), total);
  return (
    <View style={style}>
      {showLabel ? (
        <Text style={{ fontSize: 12, fontWeight: "600", color: C.textMuted, marginBottom: SP.sm }}>
          Step {clamped} of {total}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", gap: SP.xs }}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: RADIUS.pill,
              backgroundColor: i < clamped ? C.primary : C.borderSubtle,
            }}
          />
        ))}
      </View>
    </View>
  );
}
