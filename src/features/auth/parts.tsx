// src/features/auth/parts.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Shared building blocks for the auth / onboarding screens, reconciled 1:1 to
// the board frames (007–012, 027, 030, 031). Presentation only — screens own
// their wiring.
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { C, RADIUS, SP, TYPE } from "@/theme/tokens";
import { ArrowLeft, ChevronRight, Info } from "@/theme/icons";

// ─── Screen ─────────────────────────────────────────────────────────────────
export interface ScreenProps {
  children: React.ReactNode;
  /** Fixed node pinned to the bottom (e.g. CTA stack). */
  footer?: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: readonly Edge[];
  contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  footer,
  scroll = true,
  padded = true,
  edges = ["top", "bottom"],
  contentStyle,
}: Readonly<ScreenProps>) {
  const pad = padded ? SP.xl : 0; // board uses 24px horizontal insets
  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        { paddingHorizontal: pad, paddingTop: SP.base, paddingBottom: SP.xl, flexGrow: 1 },
        contentStyle,
      ]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, paddingHorizontal: pad, paddingTop: SP.base }, contentStyle]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={edges}>
      {body}
      {footer ? (
        <View style={{ paddingHorizontal: SP.xl, paddingTop: SP.base, paddingBottom: SP.sm, gap: SP.md }}>
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

// ─── Logo wordmark ────────────────────────────────────────────────────────────
// The real Lalaba customer artwork — never a text approximation, and never the
// partner machine-mark/"PARTNER" lockup. `wordmark.png` is the navy "Lalaba /
// Laundry Made Easy" cut for light surfaces; `wordmark-white.png` is the white
// cut (with the yellow swoosh) for brand-blue plates.
const WORDMARK = {
  ink: require("../../../assets/brand/wordmark.png"),
  white: require("../../../assets/brand/wordmark-white.png"),
} as const;

/** Native aspect ratios of the two cuts — height is derived, never guessed. */
const WORDMARK_RATIO = { ink: 351 / 139, white: 1024 / 528 } as const;

export function Wordmark({
  height = 46,
  variant = "ink",
  tagline,
  style,
}: Readonly<{
  height?: number;
  variant?: "ink" | "white";
  tagline?: string;
  style?: StyleProp<ViewStyle>;
}>) {
  return (
    <View style={[{ alignItems: "center", gap: SP.sm }, style]}>
      <Image
        source={WORDMARK[variant]}
        accessibilityRole="image"
        accessibilityLabel="Lalaba"
        resizeMode="contain"
        style={{ height, width: height * WORDMARK_RATIO[variant] }}
      />
      {tagline ? (
        <Text
          style={{
            fontSize: 14,
            color: variant === "white" ? C.textInverse : C.textMuted,
            textAlign: "center",
          }}
        >
          {tagline}
        </Text>
      ) : null}
    </View>
  );
}

/** Left-aligned brand lockup for the top of an auth screen (board 008). */
export function BrandRow({
  style,
  height = 40,
}: Readonly<{ style?: StyleProp<ViewStyle>; height?: number }>) {
  return (
    <View style={[{ flexDirection: "row", alignItems: "center" }, style]}>
      <Image
        source={WORDMARK.ink}
        accessibilityRole="image"
        accessibilityLabel="Lalaba"
        resizeMode="contain"
        style={{ height, width: height * WORDMARK_RATIO.ink }}
      />
    </View>
  );
}

// ─── Auth header (title + optional subtitle) ────────────────────────────────
export function AuthHeader({
  title,
  subtitle,
  titleSize = 24,
  style,
}: Readonly<{ title: string; subtitle?: string; titleSize?: number; style?: StyleProp<ViewStyle> }>) {
  return (
    <View style={style}>
      <Text style={{ ...TYPE.pageTitle, fontSize: titleSize, fontWeight: "700", marginBottom: 6 }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ fontSize: 15, color: C.textMuted, lineHeight: 22 }}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

// ─── Back button (bordered box, board style) ────────────────────────────────
export function BackBox({ onPress }: Readonly<{ onPress?: () => void }>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      onPress={onPress}
      hitSlop={8}
      style={{
        width: 40,
        height: 40,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: RADIUS.md,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ArrowLeft size={20} color={C.ink} strokeWidth={2} />
    </Pressable>
  );
}

export function SkipButton({ onPress }: Readonly<{ onPress?: () => void }>) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}>
      <Text style={{ fontSize: 14, fontWeight: "600", color: C.textMuted }}>Skip</Text>
    </Pressable>
  );
}

export function StepText({ step, total }: Readonly<{ step: number; total: number }>) {
  return (
    <Text style={{ fontSize: 13, fontWeight: "600", color: C.textMuted }}>
      Step {step} of {total}
    </Text>
  );
}

// ─── Legal footer (non-functional links) ────────────────────────────────────
export function LegalFooter({
  prefix = "By continuing you agree to our",
  style,
}: Readonly<{ prefix?: string; style?: StyleProp<ViewStyle> }>) {
  return (
    <Text style={[{ fontSize: 12, color: C.textMuted, textAlign: "center", lineHeight: 18 }, style]}>
      {prefix}{" "}
      <Text style={{ color: C.primaryText, fontWeight: "600" }}>Terms of Service</Text> and{" "}
      <Text style={{ color: C.primaryText, fontWeight: "600" }}>Privacy Policy</Text>.
    </Text>
  );
}

// ─── Neutral note box (SMS rates, etc.) ─────────────────────────────────────
export function NoteBox({ text }: Readonly<{ text: string }>) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: SP.sm,
        backgroundColor: C.bg,
        borderWidth: 1,
        borderColor: C.surfaceSubtle,
        borderRadius: RADIUS.md,
        paddingVertical: SP.md,
        paddingHorizontal: SP.base,
      }}
    >
      <View style={{ paddingTop: 1 }}>
        <Info size={16} color={C.textMuted} />
      </View>
      <Text style={{ flex: 1, fontSize: 13, color: C.textMuted, lineHeight: 20 }}>{text}</Text>
    </View>
  );
}

// ─── Brand glyphs ─────────────────────────────────────────────────────────────
export function GoogleGlyph({ size = 18 }: Readonly<{ size?: number }>) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <Path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </Svg>
  );
}

export function AppleGlyph({ size = 18 }: Readonly<{ size?: number }>) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={C.ink}
        d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
      />
    </Svg>
  );
}

// ─── Compact social button (side-by-side, screen 009) ───────────────────────
export function SocialButton({
  provider,
  onPress,
  disabled = false,
}: Readonly<{ provider: "google" | "apple"; onPress?: () => void; disabled?: boolean }>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: SP.sm,
        minHeight: SP.touch,
        paddingVertical: 13,
        borderRadius: RADIUS.button,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.surface,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {provider === "google" ? <GoogleGlyph /> : <AppleGlyph />}
      <Text style={{ fontSize: 14, fontWeight: "600", color: C.ink }}>
        {provider === "google" ? "Google" : "Apple"}
      </Text>
    </Pressable>
  );
}

// ─── Method / choice row (screen 010) ───────────────────────────────────────
export function MethodRow({
  title,
  description,
  badge,
  selected = false,
  disabled = false,
  icon,
  onPress,
}: Readonly<{
  title: string;
  description?: string;
  badge?: string;
  selected?: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  onPress?: () => void;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      onPress={onPress}
      disabled={disabled}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: SP.base,
        padding: SP.base,
        borderRadius: RADIUS.xl,
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? C.primary : C.border,
        backgroundColor: selected ? C.primaryTint : C.surface,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: RADIUS.md,
          backgroundColor: selected ? C.surface : C.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: SP.sm }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: C.ink }}>{title}</Text>
          {badge ? (
            <View
              style={{
                backgroundColor: C.primary,
                borderRadius: RADIUS.pill,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 0.5, color: C.textInverse }}>
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
        {description ? (
          <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>{description}</Text>
        ) : null}
      </View>
      {disabled ? null : <ChevronRight size={18} color={selected ? C.primary : C.textTertiary} />}
    </Pressable>
  );
}

// ─── Text link ────────────────────────────────────────────────────────────────
export function TextLink({
  label,
  onPress,
  align = "center",
}: Readonly<{ label: string; onPress?: () => void; align?: "left" | "center" | "right" }>) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={{ alignSelf: "center" }}>
      <Text style={{ fontSize: 14, fontWeight: "600", color: C.primaryText, textAlign: align }}>{label}</Text>
    </Pressable>
  );
}

// ─── "or continue with" divider ──────────────────────────────────────────────
export function OrDivider({ label = "or continue with" }: Readonly<{ label?: string }>) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: SP.md, marginVertical: SP.base }}>
      <View style={{ flex: 1, height: 1, backgroundColor: C.surfaceSubtle }} />
      <Text style={{ fontSize: 12, color: C.textTertiary }}>{label}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: C.surfaceSubtle }} />
    </View>
  );
}
