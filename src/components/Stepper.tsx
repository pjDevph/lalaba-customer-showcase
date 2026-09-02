// src/components/Stepper.tsx
import React from "react";
import { Pressable, Text, View, type ViewStyle } from "react-native";
import { C, RADIUS, SP } from "@/theme/tokens";
import { Plus, Minus } from "@/theme/icons";

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  /** Formats the numeric value for display (e.g. kg, "bags"). */
  formatValue?: (value: number) => string;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Stepper({
  value,
  onChange,
  label,
  hint,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  formatValue,
  disabled = false,
  style,
}: Readonly<StepperProps>) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const dec = () => onChange(clamp(value - step));
  const inc = () => onChange(clamp(value + step));
  const canDec = !disabled && value > min;
  const canInc = !disabled && value < max;

  return (
    <View style={style}>
      {label ? <Text style={{ fontSize: 13, fontWeight: "600", color: C.ink, marginBottom: SP.sm }}>{label}</Text> : null}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <StepButton icon="minus" onPress={dec} enabled={canDec} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: C.ink }}>
            {formatValue ? formatValue(value) : String(value)}
          </Text>
        </View>
        <StepButton icon="plus" onPress={inc} enabled={canInc} />
      </View>
      {hint ? <Text style={{ fontSize: 12, color: C.textMuted, marginTop: SP.sm }}>{hint}</Text> : null}
    </View>
  );
}

function StepButton({ icon, onPress, enabled }: Readonly<{ icon: "plus" | "minus"; onPress: () => void; enabled: boolean }>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !enabled }}
      onPress={onPress}
      disabled={!enabled}
      style={{
        width: SP.touch,
        height: SP.touch,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: enabled ? C.borderStrong : C.border,
        backgroundColor: C.surface,
        alignItems: "center",
        justifyContent: "center",
        opacity: enabled ? 1 : 0.4,
      }}
    >
      {icon === "plus" ? (
        <Plus size={20} color={C.ink} strokeWidth={2.5} />
      ) : (
        <Minus size={20} color={C.ink} strokeWidth={2.5} />
      )}
    </Pressable>
  );
}
