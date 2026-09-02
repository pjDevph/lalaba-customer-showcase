// src/components/PasswordRules.tsx
// Live password-requirements checklist, shown while the user types. Mirrors the
// partner app's register-step checklist so both apps teach the same rules with
// the same wording — but styled from tokens instead of hardcoded hex.

import React from "react";
import { View, Text, type StyleProp, type ViewStyle } from "react-native";
import { C, SP } from "@/theme/tokens";
import { Check, X } from "@/theme/icons";
import { checkPasswordRules, type PasswordRuleState } from "@/lib/validation";

const LABELS: readonly { key: keyof PasswordRuleState; label: string }[] = [
  { key: "length", label: "At least 8 characters" },
  { key: "uppercase", label: "Uppercase letter (A–Z)" },
  { key: "lowercase", label: "Lowercase letter (a–z)" },
  { key: "number", label: "Number (0–9)" },
  { key: "special", label: "Special character (@, #, !…)" },
];

export interface PasswordRulesProps {
  /** The raw password being typed. */
  value: string;
  style?: StyleProp<ViewStyle>;
}

export function PasswordRules({ value, style }: Readonly<PasswordRulesProps>) {
  const rules = checkPasswordRules(value);
  return (
    <View accessibilityRole="list" style={[{ gap: 4 }, style]}>
      {LABELS.map(({ key, label }) => {
        const ok = rules[key];
        const Icon = ok ? Check : X;
        return (
          <View
            key={key}
            accessibilityRole="text"
            accessibilityLabel={`${label}: ${ok ? "met" : "not met"}`}
            style={{ flexDirection: "row", alignItems: "center", gap: SP.sm }}
          >
            <Icon size={14} color={ok ? C.success : C.textTertiary} strokeWidth={3} />
            <Text style={{ fontSize: 12, color: ok ? C.success : C.textMuted }}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}
