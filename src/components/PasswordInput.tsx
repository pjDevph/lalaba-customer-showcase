// src/components/PasswordInput.tsx
import React, { useState } from "react";
import { Pressable, Text, TextInput, View, type ViewStyle } from "react-native";
import { C, RADIUS, SP } from "@/theme/tokens";

export interface PasswordInputProps {
  value: string;
  onChangeText: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  autoComplete?: "password" | "password-new";
  /** Fires when the field loses focus — used to defer validation errors. */
  onBlur?: () => void;
  style?: ViewStyle;
}

export function PasswordInput({
  value,
  onChangeText,
  label,
  placeholder = "Password",
  error,
  disabled = false,
  autoComplete = "password",
  onBlur,
  style,
}: Readonly<PasswordInputProps>) {
  const [show, setShow] = useState(false);
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
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          editable={!disabled}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={autoComplete}
          placeholder={placeholder}
          placeholderTextColor={C.textTertiary}
          style={{ flex: 1, fontSize: 16, color: C.ink, paddingVertical: SP.md }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={show ? "Hide password" : "Show password"}
          onPress={() => setShow((s) => !s)}
          hitSlop={8}
          style={{ paddingLeft: SP.md, paddingVertical: SP.sm }}
        >
          <Text style={{ fontSize: 13, fontWeight: "700", color: C.primaryText }}>{show ? "Hide" : "Show"}</Text>
        </Pressable>
      </View>
      {hasError ? <Text style={{ fontSize: 12, color: C.error, marginTop: SP.xs }}>{error}</Text> : null}
    </View>
  );
}
