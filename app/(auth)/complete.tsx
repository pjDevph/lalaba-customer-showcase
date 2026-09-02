// app/(auth)/complete.tsx  (031)
// Dual-purpose: profile completion for needs-registration users (name + phone
// wiring), and the board's "you're all set" confirmation for anyone already
// authenticated.
import React, { useState } from "react";
import { View, Text, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { Button, AddressRow, PhoneInput } from "@/components";
import type { PhoneInputValue } from "@/components";
import { C, RADIUS, SP } from "@/theme/tokens";
import { Check } from "@/theme/icons";
import { useAuthStore } from "@/stores/authStore";
import { notify } from "@/stores/notificationStore";
import { signupRoles } from "@/services/graphql/auth";
import { auth } from "@/config/firebase";
import { Screen, AuthHeader } from "@/features/auth/parts";

function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
}: Readonly<{ label: string; value: string; onChangeText: (v: string) => void; placeholder: string }>) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: C.ink, marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.textTertiary}
        autoCapitalize="words"
        style={{
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: RADIUS.md,
          backgroundColor: C.surface,
          paddingHorizontal: SP.base,
          minHeight: SP.touch + 4,
          fontSize: 16,
          color: C.ink,
        }}
      />
    </View>
  );
}

export default function Complete() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const profile = useAuthStore((s) => s.profile);
  const completeRegistration = useAuthStore((s) => s.completeRegistration);
  const isBusy = useAuthStore((s) => s.isBusy);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  // Phone-OTP signups already carry a verified number on the Firebase user, so
  // the board's 031 frame (that path) shows no phone field. Email/Google signups
  // have none — and the backend requires a valid PH mobile — so we collect it
  // here, shown only when it's actually missing.
  const existingPhone = (auth.currentUser?.phoneNumber ?? "").replace(/\D/g, "").slice(-10);
  const needsPhone = existingPhone.length !== 10;
  const [phoneDigits, setPhoneDigits] = useState(needsPhone ? "" : existingPhone);
  const [phone, setPhone] = useState<PhoneInputValue | null>(null);

  // ── Already authenticated: board confirmation ───────────────────────────────
  if (status === "authenticated") {
    const greeting = profile?.firstName ? `You're all set, ${profile.firstName}!` : "You're all set!";
    return (
      <Screen
        scroll={false}
        footer={
          <Button label="Start browsing laundry services" fullWidth onPress={() => router.replace("/(tabs)")} />
        }
      >
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: SP.sm }}>
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: C.successTint,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: SP["2xl"],
            }}
          >
            <Check size={56} color={C.success} strokeWidth={2.2} />
          </View>

          <Text style={{ fontSize: 24, fontWeight: "700", color: C.ink, textAlign: "center", marginBottom: 10 }}>
            {greeting}
          </Text>
          <Text style={{ fontSize: 15, color: C.textMuted, lineHeight: 23, textAlign: "center", marginBottom: SP.xl }}>
            Your account is ready. Add a delivery address now, or later when you book your first
            pickup.
          </Text>

          <Button
            label="Add your address"
            variant="outline"
            fullWidth
            onPress={() => router.push("/address-select")}
          />
        </View>
      </Screen>
    );
  }

  // ── needs-registration: complete the profile (keeps phone wiring) ───────────
  const phoneValid = !needsPhone || (phone?.valid ?? /^9\d{9}$/.test(phoneDigits));
  const canSubmit =
    firstName.trim().length > 0 && lastName.trim().length > 0 && phoneValid && !isBusy;

  const onStart = async () => {
    try {
      const roles = await signupRoles();
      const customer = roles.find((r) => r.roleId === "customer");
      if (!customer) {
        notify.error("Setup issue", "Couldn't find the customer role. Please try again.");
        return;
      }
      await completeRegistration({
        role: customer._id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: needsPhone
          ? phone?.local ?? (phoneDigits ? `0${phoneDigits}` : "")
          : `0${existingPhone}`,
        consents: [
          { policyType: "terms_of_service", version: "1.0" },
          { policyType: "privacy_policy", version: "1.0" },
        ],
      });
      // Success → gate routes to tabs.
    } catch {
      const err = useAuthStore.getState().error;
      notify.error("Couldn't finish setup", err ?? "Please try again.");
      useAuthStore.getState().clearError();
    }
  };

  return (
    <Screen
      footer={
        <Button
          label="Start browsing laundry services"
          fullWidth
          loading={isBusy}
          disabled={!canSubmit}
          onPress={onStart}
        />
      }
    >
      <AuthHeader
        title="Almost there"
        subtitle="Tell us your name so providers know who to greet."
        style={{ marginBottom: SP.xl }}
      />

      <View style={{ gap: SP.lg }}>
        <View style={{ flexDirection: "row", gap: SP.md }}>
          <LabeledInput label="First name" value={firstName} onChangeText={setFirstName} placeholder="Ana" />
          <LabeledInput label="Last name" value={lastName} onChangeText={setLastName} placeholder="Dela Cruz" />
        </View>

        {needsPhone ? (
          <View style={{ gap: SP.sm }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: C.ink }}>Mobile number</Text>
            <PhoneInput
              value={phoneDigits}
              onChange={(v) => {
                setPhoneDigits(v.digits);
                setPhone(v);
              }}
            />
            <Text style={{ fontSize: 12, color: C.textMuted }}>
              Shared only with providers handling your active order.
            </Text>
          </View>
        ) : null}

        <View style={{ gap: SP.sm }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: C.ink }}>Your default address</Text>
          <AddressRow
            label="Home"
            addressLine="We'll confirm your exact address when you book."
            isDefault
            style={{ backgroundColor: C.bg, borderColor: C.surfaceSubtle }}
          />
          <Text style={{ fontSize: 12, color: C.textMuted }}>
            You can add and edit addresses anytime from your profile.
          </Text>
        </View>
      </View>
    </Screen>
  );
}
