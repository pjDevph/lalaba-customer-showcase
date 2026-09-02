// src/components/Badge.tsx
import React from "react";
import { Text, View, type ViewStyle } from "react-native";
import { C, RADIUS } from "@/theme/tokens";

export type BadgeTone = "neutral" | "brand" | "washer" | "success" | "warning" | "error";

/** Semantic presets that map straight to the DS badge vocabulary. */
export type BadgePreset =
  | "LAUNDROMAT"
  | "VERIFIED_BUSINESS"
  | "VERIFIED_HOME_WASHER"
  | "HOME_WASHER"
  | "APPROVED"
  | "DEFAULT"
  | "POPULAR"
  | "RECOMMENDED"
  | "ACTION_REQUIRED"
  | "OPEN"
  | "SLOTS_LEFT"
  | "FULLY_BOOKED"
  | "CLOSED";

export interface BadgeProps {
  /** Free-form label; overrides the preset's default text when provided. */
  label?: string;
  preset?: BadgePreset;
  tone?: BadgeTone;
  /** Small leading dot in the text color. */
  dot?: boolean;
  /** Soft (tinted, default) vs solid fill. */
  solid?: boolean;
  style?: ViewStyle;
}

const TONE: Record<BadgeTone, { tint: string; fg: string; solid: string }> = {
  neutral: { tint: C.surfaceAlt, fg: C.textSecondary, solid: C.textSecondary },
  brand: { tint: C.primaryTint, fg: C.primary, solid: C.primary },
  washer: { tint: C.washerTint, fg: C.washer, solid: C.washer },
  success: { tint: C.successTint, fg: C.success, solid: C.success },
  warning: { tint: C.warningTint, fg: C.warningText, solid: C.warning },
  error: { tint: C.errorTint, fg: C.error, solid: C.error },
};

const PRESETS: Record<BadgePreset, { label: string; tone: BadgeTone }> = {
  LAUNDROMAT: { label: "Laundromat", tone: "brand" },
  VERIFIED_BUSINESS: { label: "Verified business", tone: "brand" },
  VERIFIED_HOME_WASHER: { label: "Verified home washer", tone: "washer" },
  HOME_WASHER: { label: "Home washer", tone: "neutral" },
  APPROVED: { label: "Approved", tone: "success" },
  DEFAULT: { label: "Default", tone: "neutral" },
  POPULAR: { label: "Popular", tone: "warning" },
  RECOMMENDED: { label: "Recommended", tone: "brand" },
  ACTION_REQUIRED: { label: "Action required", tone: "warning" },
  OPEN: { label: "Open", tone: "success" },
  SLOTS_LEFT: { label: "Slots left", tone: "warning" },
  FULLY_BOOKED: { label: "Fully booked", tone: "neutral" },
  CLOSED: { label: "Closed", tone: "error" },
};

export function Badge({ label, preset, tone, dot = false, solid = false, style }: Readonly<BadgeProps>) {
  const p = preset ? PRESETS[preset] : undefined;
  const resolvedTone: BadgeTone = tone ?? p?.tone ?? "neutral";
  const text = (label ?? p?.label ?? "").toUpperCase();
  const t = TONE[resolvedTone];
  const bg = solid ? t.solid : t.tint;
  const fg = solid ? C.textInverse : t.fg;

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          alignSelf: "flex-start",
          backgroundColor: bg,
          paddingHorizontal: 9,
          paddingVertical: 4,
          borderRadius: RADIUS.pill,
        },
        style,
      ]}
    >
      {dot ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: fg }} /> : null}
      <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 0.5, color: fg }}>{text}</Text>
    </View>
  );
}
