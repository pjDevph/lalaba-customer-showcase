// src/components/InfoBanner.tsx
import React from "react";
import { Text, View, type ViewStyle } from "react-native";
import { C, RADIUS, SP } from "@/theme/tokens";
import { Icon, type IconName } from "@/theme/icons";

export type BannerTone = "info" | "warning" | "success" | "washer";

export interface InfoBannerProps {
  text: string;
  title?: string;
  tone?: BannerTone;
  /** Override the default icon for the tone. */
  icon?: IconName;
  style?: ViewStyle;
}

const TONE: Record<BannerTone, { tint: string; fg: string; icon: IconName }> = {
  info: { tint: C.infoTint, fg: C.info, icon: "info" },
  warning: { tint: C.warningTint, fg: C.warningText, icon: "circleAlert" },
  success: { tint: C.successTint, fg: C.success, icon: "circleCheck" },
  washer: { tint: C.washerTint, fg: C.washer, icon: "shieldCheck" },
};

export function InfoBanner({ text, title, tone = "info", icon, style }: Readonly<InfoBannerProps>) {
  const t = TONE[tone];
  return (
    <View
      style={[
        {
          flexDirection: "row",
          gap: SP.md,
          padding: SP.base,
          borderRadius: RADIUS.lg,
          backgroundColor: t.tint,
        },
        style,
      ]}
    >
      <View style={{ paddingTop: 1 }}>
        <Icon name={icon ?? t.icon} size={20} color={t.fg} />
      </View>
      <View style={{ flex: 1 }}>
        {title ? (
          <Text style={{ fontSize: 14, fontWeight: "700", color: C.ink, marginBottom: 2 }}>{title}</Text>
        ) : null}
        <Text style={{ fontSize: 13, fontWeight: "400", color: C.textSecondary, lineHeight: 19 }}>
          {text}
        </Text>
      </View>
    </View>
  );
}
