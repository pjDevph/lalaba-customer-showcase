// src/components/Chip.tsx
import React from "react";
import { Pressable, Text, View, type ViewStyle } from "react-native";
import { C, RADIUS, SP } from "@/theme/tokens";

export interface ChipProps {
  label: string;
  selected?: boolean;
  count?: number;
  onPress?: () => void;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  style?: ViewStyle;
}

export function Chip({
  label,
  selected = false,
  count,
  onPress,
  disabled = false,
  leftIcon,
  style,
}: Readonly<ChipProps>) {
  const bg = selected ? C.primary : C.surface;
  const border = selected ? C.primary : C.border;
  const fg = selected ? C.textInverse : C.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      onPress={onPress}
      disabled={disabled || !onPress}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: SP.xs,
          height: 36,
          paddingHorizontal: SP.md,
          borderRadius: RADIUS.pill,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: border,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {leftIcon ? <View>{leftIcon}</View> : null}
      <Text style={{ fontSize: 13, fontWeight: "600", color: fg }}>{label}</Text>
      {typeof count === "number" ? (
        <View
          style={{
            minWidth: 18,
            height: 18,
            paddingHorizontal: 5,
            borderRadius: RADIUS.pill,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: selected ? "rgba(255,255,255,0.25)" : C.primaryTint,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "700", color: selected ? C.textInverse : C.primary }}>
            {count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
