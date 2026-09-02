// src/components/DatePicker.tsx
import React from "react";
import { Pressable, ScrollView, Text, type ViewStyle } from "react-native";
import { C, RADIUS, SP, SHADOW } from "@/theme/tokens";

export interface DateOption {
  /** Stable key, e.g. ISO date "2026-08-05". */
  key: string;
  /** Top line, e.g. "Today", "Wed". */
  weekday: string;
  /** Bottom line, e.g. "5", "Aug 5". */
  day: string;
  disabled?: boolean;
}

export interface DatePickerProps {
  options: DateOption[];
  value: string;
  onChange: (key: string) => void;
  style?: ViewStyle;
}

export function DatePicker({ options, value, onChange, style }: Readonly<DatePickerProps>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={{ gap: SP.sm, paddingVertical: 2 }}
    >
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled: o.disabled }}
            onPress={() => !o.disabled && onChange(o.key)}
            disabled={o.disabled}
            style={{
              minWidth: 60,
              paddingVertical: SP.md,
              paddingHorizontal: SP.base,
              borderRadius: RADIUS.lg,
              alignItems: "center",
              backgroundColor: active ? C.primary : C.surface,
              borderWidth: 1,
              borderColor: active ? C.primary : C.border,
              opacity: o.disabled ? 0.4 : 1,
              ...(active ? SHADOW.brand : {}),
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "600", color: active ? "rgba(255,255,255,0.85)" : C.textMuted }}>
              {o.weekday}
            </Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: active ? C.textInverse : C.ink, marginTop: 2 }}>
              {o.day}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
