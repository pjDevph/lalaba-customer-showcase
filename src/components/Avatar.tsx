// src/components/Avatar.tsx
import React, { useState } from "react";
import { Image, Text, View, type ViewStyle } from "react-native";
import { C, accentColor, accentTint, type ProviderAccent } from "@/theme/tokens";

export type AvatarSize = "sm" | "md" | "lg" | "xl";

export interface AvatarProps {
  /** Full name or label; initials are derived from it. */
  name: string;
  /** Provider type drives the tint (merchant = blue, washer = teal). */
  type?: ProviderAccent;
  size?: AvatarSize;
  /** Solid fill instead of tinted background. */
  solid?: boolean;
  /**
   * Logo/photo to show instead of initials. Falls back to initials when absent
   * OR when the image fails to load, so a dead URL never leaves a blank disc.
   */
  imageUrl?: string | null;
  style?: ViewStyle;
}

const DIM: Record<AvatarSize, { box: number; font: number }> = {
  sm: { box: 32, font: 13 },
  md: { box: 44, font: 16 },
  lg: { box: 56, font: 20 },
  xl: { box: 72, font: 26 },
};

export function initialsFrom(name: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, type = "merchant", size = "md", solid = false, imageUrl, style }: Readonly<AvatarProps>) {
  const dim = DIM[size];
  const accent = accentColor(type);
  const bg = solid ? accent : accentTint(type);
  const fg = solid ? C.textInverse : accent;

  const [failed, setFailed] = useState(false);
  const showImage = !!imageUrl && !failed;

  return (
    <View
      accessibilityLabel={name}
      style={[
        {
          width: dim.box,
          height: dim.box,
          borderRadius: dim.box / 2,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        },
        style,
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: imageUrl }}
          onError={() => setFailed(true)}
          resizeMode="cover"
          style={{ width: "100%", height: "100%" }}
        />
      ) : (
        <Text style={{ fontSize: dim.font, fontWeight: "700", color: fg }}>{initialsFrom(name)}</Text>
      )}
    </View>
  );
}
