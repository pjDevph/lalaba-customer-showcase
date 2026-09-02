// src/components/SegmentedControl.tsx
import React from "react";
import { Pressable, ScrollView, Text, View, type ViewStyle } from "react-native";
import { C, RADIUS, SP, SHADOW } from "@/theme/tokens";

export interface SegmentOption {
  key: string;
  label: string;
  /** Optional badge count shown next to the label (e.g. "Needs action · 2"). */
  count?: number;
}

export interface SegmentedControlProps {
  options: SegmentOption[];
  value: string;
  onChange: (key: string) => void;
  /** Allow horizontal scrolling when segments overflow (default true). */
  scrollable?: boolean;
  style?: ViewStyle;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  scrollable = true,
  style,
}: Readonly<SegmentedControlProps>) {
  const row = (
    <View
      style={{
        flexDirection: "row",
        gap: SP.xs,
        padding: SP.xs,
        backgroundColor: C.surfaceAlt,
        borderRadius: RADIUS.pill,
      }}
    >
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.key)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: SP.xs,
              minHeight: 36,
              paddingHorizontal: SP.md,
              borderRadius: RADIUS.pill,
              backgroundColor: active ? C.surface : "transparent",
              ...(active ? SHADOW.sm : {}),
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: active ? "700" : "600",
                color: active ? C.ink : C.textMuted,
              }}
            >
              {opt.label}
            </Text>
            {typeof opt.count === "number" && opt.count > 0 ? (
              <View
                style={{
                  minWidth: 18,
                  height: 18,
                  paddingHorizontal: 5,
                  borderRadius: RADIUS.pill,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: active ? C.primary : C.borderStrong,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "700", color: C.textInverse }}>
                  {opt.count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );

  if (!scrollable) return <View style={style}>{row}</View>;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={{ flexGrow: 1 }}
    >
      {row}
    </ScrollView>
  );
}
