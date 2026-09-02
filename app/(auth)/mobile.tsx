// app/(auth)/mobile.tsx  (011)
import React, { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Button, PhoneInput, type PhoneInputValue } from "@/components";
import { SP } from "@/theme/tokens";
import { useAuthStore } from "@/stores/authStore";
import { notify } from "@/stores/notificationStore";
import { Screen, AuthHeader, BackBox, StepText, NoteBox } from "@/features/auth/parts";

export default function Mobile() {
  const router = useRouter();
  const sendOtp = useAuthStore((s) => s.sendOtp);
  const isBusy = useAuthStore((s) => s.isBusy);

  const [phone, setPhone] = useState<PhoneInputValue>({ digits: "", local: "", e164: "", valid: false });

  const onSend = async () => {
    try {
      await sendOtp(phone.e164);
      router.push({ pathname: "/(auth)/otp", params: { phone: phone.e164 } });
    } catch {
      const err = useAuthStore.getState().error;
      notify.error("Couldn't send code", err ?? "Please try again.");
      useAuthStore.getState().clearError();
    }
  };

  return (
    <Screen
      footer={
        <Button
          label="Send verification code"
          fullWidth
          loading={isBusy}
          disabled={!phone.valid || isBusy}
          onPress={onSend}
        />
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
        <StepText step={1} total={3} />
      </View>

      <AuthHeader
        title="What's your mobile number?"
        subtitle="We'll text you a code to verify it's really you."
        style={{ marginBottom: SP["2xl"] }}
      />

      <PhoneInput label="Mobile number" value={phone.digits} onChange={setPhone} />

      <View style={{ marginTop: SP.base }}>
        <NoteBox text="Standard SMS rates may apply. Your number is only shared with providers handling your active order." />
      </View>
    </Screen>
  );
}
