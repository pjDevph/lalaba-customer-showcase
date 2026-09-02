// src/components/TopBar.tsx
import React from "react";
import { Pressable, Text, View, type ViewStyle } from "react-native";
import { C, SP } from "@/theme/tokens";
import { ArrowLeft } from "@/theme/icons";

export interface TopBarProps {
  title?: string;
  subtitle?: string;
  /** Optional node rendered below the title instead of `subtitle` (e.g. a type badge). */
  subtitleNode?: React.ReactNode;
  /** Show the back chevron (default true when onBack is set). */
  showBack?: boolean;
  onBack?: () => void;
  /** Optional leading avatar node, rendered between the back button and the
   *  title block (e.g. a counterparty avatar with a presence dot). */
  avatar?: React.ReactNode;
  /** Optional right-aligned action node (icon button, text button, etc.). */
  rightAction?: React.ReactNode;
  style?: ViewStyle;
}

export function TopBar({ title, subtitle, subtitleNode, showBack, onBack, avatar, rightAction, style }: Readonly<TopBarProps>) {
  const displayBack = showBack ?? !!onBack;
  return (
    <View
      style={[
        {
          minHeight: SP.topBar,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: SP.screen,
          gap: SP.sm,
          backgroundColor: C.surface,
        },
        style,
      ]}
    >
      {/* No spacer stands in for an absent back button: the title is
          left-aligned, so there is nothing to keep optically centred and the
          reserved 32px just pushed tab titles off the screen margin. */}
      {displayBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          hitSlop={8}
          style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", marginLeft: -8 }}
        >
          <ArrowLeft size={24} color={C.ink} strokeWidth={2} />
        </Pressable>
      ) : null}

      {avatar ? <View>{avatar}</View> : null}

      <View style={{ flex: 1 }}>
        {title ? (
          <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: "700", color: C.ink }}>
            {title}
          </Text>
        ) : null}
        {subtitleNode ? (
          <View style={{ marginTop: 2 }}>{subtitleNode}</View>
        ) : subtitle ? (
          <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "400", color: C.textMuted }}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightAction ? <View style={{ minWidth: 32, alignItems: "flex-end" }}>{rightAction}</View> : null}
    </View>
  );
}
