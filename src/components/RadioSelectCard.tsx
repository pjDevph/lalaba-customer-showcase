// src/components/RadioSelectCard.tsx
import React from "react";
import { Pressable, Text, View, type ViewStyle } from "react-native";
import { C, RADIUS, SP, peso } from "@/theme/tokens";
import { Badge, type BadgePreset } from "./Badge";

export interface RadioSelectCardProps {
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  /** Amount in centavos; ignored when `free`. */
  priceCentavos?: number;
  free?: boolean;
  disabled?: boolean;
  disabledNote?: string;
  /** POPULAR / RECOMMENDED emphasis badge. */
  badge?: Extract<BadgePreset, "POPULAR" | "RECOMMENDED">;
  leftIcon?: React.ReactNode;
  style?: ViewStyle;
}

export function RadioSelectCard({
  title,
  description,
  selected,
  onPress,
  priceCentavos,
  free,
  disabled = false,
  disabledNote,
  badge,
  leftIcon,
  style,
}: Readonly<RadioSelectCardProps>) {
  const priceLabel = free ? "Free" : typeof priceCentavos === "number" ? peso(priceCentavos) : undefined;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      onPress={() => !disabled && onPress()}
      disabled={disabled}
      style={[
        {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: SP.md,
          padding: SP.base,
          borderRadius: RADIUS.lg,
          borderWidth: 1.5,
          borderColor: selected ? C.primary : C.border,
          backgroundColor: selected ? C.primaryTint : disabled ? C.surfaceAlt : C.surface,
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          borderColor: selected ? C.primary : C.borderStrong,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
        }}
      >
        {selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary }} /> : null}
      </View>

      {leftIcon ? <View style={{ marginTop: 1 }}>{leftIcon}</View> : null}

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: SP.sm, flexWrap: "wrap" }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: C.ink }}>{title}</Text>
          {badge ? <Badge preset={badge} /> : null}
        </View>
        {description ? (
          <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 3, lineHeight: 18 }}>{description}</Text>
        ) : null}
        {disabled && disabledNote ? (
          <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>{disabledNote}</Text>
        ) : null}
      </View>

      {priceLabel ? (
        <Text style={{ fontSize: 14, fontWeight: "700", color: free ? C.success : C.ink, marginTop: 1 }}>
          {priceLabel}
        </Text>
      ) : null}
    </Pressable>
  );
}
