// src/components/OTPInput.tsx
import React, { useMemo, useRef } from "react";
import {
  NativeSyntheticEvent,
  Pressable,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  View,
  type ViewStyle,
} from "react-native";
import { C, FONT, RADIUS, SP } from "@/theme/tokens";

export interface OTPInputProps {
  value: string;
  onChange: (code: string) => void;
  /** Number of boxes (default 6). */
  length?: number;
  /** Fired once the code reaches full length. */
  onComplete?: (code: string) => void;
  error?: string;
  disabled?: boolean;
  /** Seconds remaining before resend is allowed; 0/undefined = ready. */
  resendIn?: number;
  onResend?: () => void;
  style?: ViewStyle;
}

export function OTPInput({
  value,
  onChange,
  length = 6,
  onComplete,
  error,
  disabled = false,
  resendIn,
  onResend,
  style,
}: Readonly<OTPInputProps>) {
  const inputs = useRef<(TextInput | null)[]>([]);
  const digits = useMemo(() => {
    const arr = value.replace(/\D/g, "").slice(0, length).split("");
    while (arr.length < length) arr.push("");
    return arr;
  }, [value, length]);

  const setAt = (index: number, char: string) => {
    const next = digits.slice();
    next[index] = char;
    const code = next.join("").replace(/\s/g, "");
    onChange(code);
    if (char && index < length - 1) inputs.current[index + 1]?.focus();
    if (code.length === length && !code.includes("")) onComplete?.(code);
  };

  const handleChange = (index: number, text: string) => {
    const clean = text.replace(/\D/g, "");
    if (clean.length > 1) {
      // Paste / autofill: distribute across boxes.
      const code = clean.slice(0, length);
      onChange(code);
      const focusIdx = Math.min(code.length, length - 1);
      inputs.current[focusIdx]?.focus();
      if (code.length === length) onComplete?.(code);
      return;
    }
    setAt(index, clean);
  };

  const handleKey = (index: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      setAt(index - 1, "");
    }
  };

  const canResend = (resendIn ?? 0) <= 0;

  return (
    <View style={style}>
      <View style={{ flexDirection: "row", gap: SP.sm, justifyContent: "space-between" }}>
        {digits.map((d, i) => {
          const filled = !!d;
          return (
            <TextInput
              key={i}
              ref={(r) => {
                inputs.current[i] = r;
              }}
              value={d}
              editable={!disabled}
              onChangeText={(t) => handleChange(i, t)}
              onKeyPress={(e) => handleKey(i, e)}
              keyboardType="number-pad"
              maxLength={length}
              textAlign="center"
              accessibilityLabel={`Digit ${i + 1}`}
              style={{
                flex: 1,
                height: 56,
                borderRadius: RADIUS.md,
                borderWidth: 1.5,
                borderColor: error ? C.error : filled ? C.primary : C.border,
                backgroundColor: filled ? C.primaryTint : C.surface,
                fontFamily: FONT.mono,
                fontSize: 22,
                fontWeight: "700",
                color: C.ink,
              }}
            />
          );
        })}
      </View>

      {error ? <Text style={{ fontSize: 12, color: C.error, marginTop: SP.sm }}>{error}</Text> : null}

      {onResend ? (
        <View style={{ marginTop: SP.md, alignItems: "center" }}>
          {canResend ? (
            <Pressable accessibilityRole="button" onPress={onResend} hitSlop={8}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.primaryText }}>Resend code</Text>
            </Pressable>
          ) : (
            <Text style={{ fontSize: 13, color: C.textMuted }}>Resend code in {resendIn}s</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}
