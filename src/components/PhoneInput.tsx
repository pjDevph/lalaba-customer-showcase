// src/components/PhoneInput.tsx
import React from "react";
import { Text, TextInput, View, type ViewStyle } from "react-native";
import { C, RADIUS, SP } from "@/theme/tokens";

export interface PhoneInputValue {
  /** Raw 10 local digits typed (no leading 0), e.g. "9171234567". */
  digits: string;
  /** Local storage form "09XXXXXXXXX". */
  local: string;
  /** E.164 "+639XXXXXXXXX". */
  e164: string;
  /** True when exactly 10 digits and a valid 9-prefixed mobile. */
  valid: boolean;
}

export interface PhoneInputProps {
  /** Current 10-digit local body (no leading 0). Controlled. */
  value: string;
  onChange: (value: PhoneInputValue) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  /** Fires when the field loses focus — used to defer validation errors. */
  onBlur?: () => void;
  style?: ViewStyle;
}

function toValue(rawDigits: string): PhoneInputValue {
  const digits = rawDigits.replace(/\D/g, "").replace(/^0/, "").slice(0, 10);
  const valid = digits.length === 10 && digits.startsWith("9");
  return {
    digits,
    local: digits ? `0${digits}` : "",
    e164: digits ? `+63${digits}` : "",
    valid,
  };
}

/** Groups the 10 local digits as "917 123 4567" while typing. */
function pretty(digits: string): string {
  const d = digits.slice(0, 10);
  const a = d.slice(0, 3);
  const b = d.slice(3, 6);
  const c = d.slice(6, 10);
  return [a, b, c].filter(Boolean).join(" ");
}

export function PhoneInput({
  value,
  onChange,
  label,
  placeholder = "917 123 4567",
  error,
  disabled = false,
  onBlur,
  style,
}: Readonly<PhoneInputProps>) {
  const hasError = !!error;
  return (
    <View style={style}>
      {label ? <Text style={{ fontSize: 13, fontWeight: "600", color: C.ink, marginBottom: SP.sm }}>{label}</Text> : null}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderColor: hasError ? C.error : C.border,
          borderRadius: RADIUS.md,
          backgroundColor: disabled ? C.surfaceAlt : C.surface,
          paddingHorizontal: SP.base,
          minHeight: SP.touch + 4,
        }}
      >
        <Text style={{ fontSize: 18 }}>🇵🇭</Text>
        <Text style={{ fontSize: 15, fontWeight: "600", color: C.ink, marginLeft: SP.sm, marginRight: SP.sm }}>
          +63
        </Text>
        <View style={{ width: 1, height: 22, backgroundColor: C.border, marginRight: SP.md }} />
        <TextInput
          value={pretty(value)}
          onChangeText={(t) => onChange(toValue(t))}
          onBlur={onBlur}
          editable={!disabled}
          keyboardType="phone-pad"
          placeholder={placeholder}
          placeholderTextColor={C.textTertiary}
          maxLength={13}
          style={{ flex: 1, fontSize: 16, color: C.ink, paddingVertical: SP.md }}
        />
      </View>
      {hasError ? <Text style={{ fontSize: 12, color: C.error, marginTop: SP.xs }}>{error}</Text> : null}
    </View>
  );
}
