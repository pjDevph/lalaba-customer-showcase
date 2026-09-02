// src/components/ServiceRow.tsx
import React from "react";
import { Pressable, Text, View, type ViewStyle } from "react-native";
import { C, RADIUS, SP, peso } from "@/theme/tokens";
import { Badge } from "./Badge";

export type ServiceRowVariant = "menu" | "selectable" | "approved";

export interface ServiceRowData {
  id: string;
  name: string;
  description?: string;
  /** Turnaround copy, e.g. "Ready in 24 hrs". */
  readyIn?: string;
  /** Price in centavos. */
  priceCentavos: number;
  /** Unit suffix after the price. */
  unit?: "kg" | "load" | "item";
}

export interface ServiceRowProps {
  data: ServiceRowData;
  variant?: ServiceRowVariant;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function ServiceRow({ data, variant = "menu", selected = false, onPress, style }: Readonly<ServiceRowProps>) {
  const selectable = variant === "selectable";
  const content = (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: SP.md,
          paddingVertical: SP.md,
          paddingHorizontal: selectable ? SP.base : 0,
          borderRadius: selectable ? RADIUS.lg : 0,
          borderWidth: selectable ? 1.5 : 0,
          borderColor: selectable ? (selected ? C.primary : C.border) : "transparent",
          backgroundColor: selectable && selected ? C.primaryTint : "transparent",
        },
        style,
      ]}
    >
      {selectable ? (
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            borderWidth: 2,
            borderColor: selected ? C.primary : C.borderStrong,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary }} /> : null}
        </View>
      ) : null}

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: SP.sm }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: C.ink }}>{data.name}</Text>
          {variant === "approved" ? <Badge preset="APPROVED" /> : null}
        </View>
        {data.description ? (
          <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 2, lineHeight: 18 }}>{data.description}</Text>
        ) : null}
        {data.readyIn ? <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>{data.readyIn}</Text> : null}
      </View>

      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: C.ink }}>{peso(data.priceCentavos)}</Text>
        {data.unit ? <Text style={{ fontSize: 12, color: C.textMuted }}>/{data.unit}</Text> : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole={selectable ? "radio" : "button"}
        accessibilityState={{ selected }}
        onPress={onPress}
        style={{ }}
      >
        {content}
      </Pressable>
    );
  }
  return content;
}
