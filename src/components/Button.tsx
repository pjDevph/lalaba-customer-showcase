// src/components/Button.tsx
import React from "react";
import {
  Pressable,
  Text,
  View,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { C, RADIUS, SHADOW, SP } from "@/theme/tokens";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const HEIGHT: Record<ButtonSize, number> = { sm: 36, md: 44, lg: 52 };
const FONT: Record<ButtonSize, number> = { sm: 13, md: 15, lg: 16 };
const PAD_H: Record<ButtonSize, number> = { sm: 14, md: 18, lg: 22 };

interface VariantStyle {
  bg: string;
  color: string;
  border?: string;
  brandShadow?: boolean;
}

const VARIANTS: Record<ButtonVariant, VariantStyle> = {
  primary: { bg: C.primary, color: C.textInverse, brandShadow: true },
  secondary: { bg: C.primaryTint, color: C.primaryText },
  ghost: { bg: "transparent", color: C.primaryText },
  outline: { bg: C.surface, color: C.ink, border: C.border },
  destructive: { bg: C.error, color: C.textInverse },
};

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  leftIcon,
  fullWidth = false,
  style,
  textStyle,
}: Readonly<ButtonProps>) {
  const v = VARIANTS[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      // Static style array (NOT a style function) — NativeWind's interop drops
      // visual props (e.g. backgroundColor) when a Pressable is given a style
      // FUNCTION. ServiceRow works precisely because it uses a static array.
      style={[
          {
            height: HEIGHT[size],
            minHeight: SP.touch,
            borderRadius: RADIUS.button,
            backgroundColor: v.bg,
            borderWidth: v.border ? 1 : 0,
            borderColor: v.border ?? "transparent",
            paddingHorizontal: PAD_H[size],
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: SP.sm,
            alignSelf: fullWidth ? "stretch" : "flex-start",
            width: fullWidth ? "100%" : undefined,
            opacity: isDisabled ? 0.5 : 1,
            ...(v.brandShadow && !isDisabled ? SHADOW.brand : {}),
          },
          style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.color} />
      ) : (
        <>
          {leftIcon ? <View>{leftIcon}</View> : null}
          <Text
            numberOfLines={1}
            style={[{ fontSize: FONT[size], fontWeight: "700", color: v.color }, textStyle]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
