// src/components/StarRating.tsx
import React from "react";
import { Pressable, View, type ViewStyle } from "react-native";
import { C } from "@/theme/tokens";
import { Star } from "@/theme/icons";

export interface StarRatingProps {
  /** Current rating 0–5 (supports halves in read mode). */
  value: number;
  /** Provide to make it interactive (1–5). */
  onChange?: (value: number) => void;
  size?: number;
  /** Count of stars (default 5). */
  max?: number;
  color?: string;
  style?: ViewStyle;
}

export function StarRating({
  value,
  onChange,
  size = 20,
  max = 5,
  color = C.warning,
  style,
}: Readonly<StarRatingProps>) {
  const interactive = !!onChange;
  return (
    <View
      accessibilityRole={interactive ? "adjustable" : "image"}
      accessibilityLabel={`${value} of ${max} stars`}
      style={[{ flexDirection: "row", gap: 2 }, style]}
    >
      {Array.from({ length: max }).map((_, i) => {
        const idx = i + 1;
        // Rounds halves up so a 4.5 shows 5 filled outlines cleanly.
        const filled = value >= idx - 0.5;
        const star = (
          <Star size={size} color={color} strokeWidth={2} fill={filled ? color : "transparent"} />
        );
        if (!interactive) return <View key={idx}>{star}</View>;
        return (
          <Pressable
            key={idx}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${idx}`}
            onPress={() => onChange?.(idx)}
            hitSlop={6}
            style={{ padding: 2 }}
          >
            {star}
          </Pressable>
        );
      })}
    </View>
  );
}
