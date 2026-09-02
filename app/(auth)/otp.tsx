// app/(auth)/otp.tsx  (012)
import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Button, OTPInput } from "@/components";
import { C, FONT, SP } from "@/theme/tokens";
import { useAuthStore } from "@/stores/authStore";
import { notify } from "@/stores/notificationStore";
import { Screen, BackBox, StepText } from "@/features/auth/parts";

const RESEND_SECONDS = 45;

/** "+639171234567" → "+63 917 ••• 4567". */
function maskE164(e164: string): string {
  const digits = e164.replace(/[^\d]/g, "");
  const local = digits.startsWith("63") ? digits.slice(2) : digits;
  if (local.length !== 10) return e164 || "your number";
  return `+63 ${local.slice(0, 3)} ••• ${local.slice(6)}`;
}

/** 42 → "0:42". */
function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Otp() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone?: string }>();
  const confirmOtp = useAuthStore((s) => s.confirmOtp);
  const sendOtp = useAuthStore((s) => s.sendOtp);
  const isBusy = useAuthStore((s) => s.isBusy);

  const [code, setCode] = useState("");
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const onVerify = async () => {
    await confirmOtp(code);
    const err = useAuthStore.getState().error;
    if (err) {
      notify.error("Verification failed", err);
      useAuthStore.getState().clearError();
      setCode("");
      return;
    }
    // Existing accounts become authenticated (gate → tabs); new numbers become
    // needs-registration and continue onboarding.
    if (useAuthStore.getState().status === "needs-registration") {
      router.push("/(auth)/location");
    }
  };

  const onResend = async () => {
    if (!phone) return;
    try {
      await sendOtp(phone);
      setResendIn(RESEND_SECONDS);
      notify.success("Code sent", "We texted you a new verification code.");
    } catch {
      const err = useAuthStore.getState().error;
      notify.error("Couldn't resend", err ?? "Please try again.");
      useAuthStore.getState().clearError();
    }
  };

  return (
    <Screen
      footer={
        <>
          <Button
            label="Verify"
            fullWidth
            loading={isBusy}
            disabled={code.length !== 6 || isBusy}
            onPress={onVerify}
          />
          <Text style={{ fontSize: 12, color: C.textTertiary, textAlign: "center" }}>
            Button activates when all 6 digits are entered
          </Text>
        </>
      }
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: SP.xl,
        }}
      >
        <BackBox onPress={() => router.back()} />
        <StepText step={2} total={3} />
      </View>

      <Text style={{ fontSize: 24, fontWeight: "700", color: C.ink, marginBottom: 6 }}>
        Enter the 6-digit code
      </Text>
      <Text style={{ fontSize: 15, color: C.textMuted, lineHeight: 22, marginBottom: SP["2xl"] }}>
        Sent by SMS to <Text style={{ fontWeight: "700", color: C.ink }}>{maskE164(phone ?? "")}</Text>.{" "}
        <Text
          accessibilityRole="button"
          onPress={() => router.back()}
          style={{ color: C.primaryText, fontWeight: "600" }}
        >
          Change number
        </Text>
      </Text>

      <OTPInput value={code} onChange={setCode} />

      <View style={{ marginTop: SP.lg, alignItems: "center" }}>
        {resendIn > 0 ? (
          <Text style={{ fontSize: 14, color: C.textMuted }}>
            Resend code in{" "}
            <Text style={{ fontFamily: FONT.mono, fontWeight: "700", color: C.ink }}>{mmss(resendIn)}</Text>
          </Text>
        ) : (
          <Text accessibilityRole="button" onPress={onResend} style={{ fontSize: 14, fontWeight: "700", color: C.primaryText }}>
            Resend code
          </Text>
        )}
      </View>
    </Screen>
  );
}
