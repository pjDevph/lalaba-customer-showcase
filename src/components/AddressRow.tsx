// src/components/AddressRow.tsx
import React from "react";
import { Pressable, Text, View, type ViewStyle } from "react-native";
import { C, RADIUS, SP } from "@/theme/tokens";
import { Badge } from "./Badge";
import { MapPin, ChevronRight, Check } from "@/theme/icons";

export interface AddressRowProps {
  /** e.g. "Home", "Work". */
  label: string;
  /** Full one-line address. */
  addressLine: string;
  isDefault?: boolean;
  /** Selection mode: shows a check when selected. */
  selectable?: boolean;
  selected?: boolean;
  onPress?: () => void;
  onEdit?: () => void;
  style?: ViewStyle;
}

export function AddressRow({
  label,
  addressLine,
  isDefault = false,
  selectable = false,
  selected = false,
  onPress,
  onEdit,
  style,
}: Readonly<AddressRowProps>) {
  return (
    <Pressable
      accessibilityRole={selectable ? "radio" : "button"}
      accessibilityState={{ selected }}
      onPress={onPress}
      disabled={!onPress}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: SP.md,
          padding: SP.base,
          borderRadius: RADIUS.lg,
          borderWidth: 1.5,
          borderColor: selectable && selected ? C.primary : C.border,
          backgroundColor: selectable && selected ? C.primaryTint : C.surface,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: RADIUS.md,
          backgroundColor: C.primaryTint,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MapPin size={18} color={C.primaryText} />
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: SP.sm }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: C.ink }}>{label}</Text>
          {isDefault ? <Badge preset="DEFAULT" /> : null}
        </View>
        <Text numberOfLines={2} style={{ fontSize: 13, color: C.textSecondary, marginTop: 2, lineHeight: 18 }}>
          {addressLine}
        </Text>
      </View>

      {selectable && selected ? (
        <Check size={20} color={C.primaryText} strokeWidth={2.5} />
      ) : onEdit ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Edit address" onPress={onEdit} hitSlop={8} style={{ padding: 2 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: C.primaryText }}>Edit</Text>
        </Pressable>
      ) : onPress ? (
        <ChevronRight size={20} color={C.textTertiary} />
      ) : null}
    </Pressable>
  );
}
