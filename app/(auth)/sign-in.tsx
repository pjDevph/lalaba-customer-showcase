// app/(auth)/sign-in.tsx  (009)
import React, { useState } from "react";
import { View, Text, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { Button, PasswordInput } from "@/components";
import { C, RADIUS, SP } from "@/theme/tokens";
import { useAuthStore } from "@/stores/authStore";
import { notify } from "@/stores/notificationStore";
import { useFormValidation } from "@/hooks/useFormValidation";
import { loginSchema } from "@/lib/validation";
import { Screen, AuthHeader, TextLink, OrDivider, SocialButton, BackBox } from "@/features/auth/parts";

export default function SignIn() {
  const router = useRouter();
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const isBusy = useAuthStore((s) => s.isBusy);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);

  // Sign-in only checks that the email is well-formed — password strength is a
  // sign-up concern, and an existing account may predate the current rules.
  const { isValid, errors } = useFormValidation(loginSchema, { email: email.trim(), password });
  const emailError = emailTouched ? errors.email : undefined;
  const canSubmit = isValid && !isBusy;

  const onSignIn = async () => {
    await signInWithEmail(email, password);
    const err = useAuthStore.getState().error;
    if (err) {
      notify.error("Couldn't sign in", err);
      useAuthStore.getState().clearError();
    }
    // Success routing is handled by the root auth gate.
  };

  const onGoogle = async () => {
    await signInWithGoogle();
    const err = useAuthStore.getState().error;
    if (err) {
      notify.error("Google sign-in failed", err);
      useAuthStore.getState().clearError();
    }
  };

  return (
    <Screen
      footer={
        <View style={{ flexDirection: "row", justifyContent: "center", gap: SP.xs }}>
          <Text style={{ fontSize: 14, color: C.textMuted }}>New to Lalaba?</Text>
          <TextLink label="Create account" onPress={() => router.replace("/(auth)/sign-up")} />
        </View>
      }
    >
      <View style={{ marginBottom: SP.xl }}>
        <BackBox onPress={() => router.back()} />
      </View>

      <AuthHeader
        title="Welcome back"
        subtitle="Sign in to manage your laundry bookings."
        style={{ marginBottom: SP["2xl"] }}
      />

      <View style={{ gap: 18 }}>
        <View>
          <Text style={{ fontSize: 13, fontWeight: "600", color: C.ink, marginBottom: 6 }}>
            Email address
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            onBlur={() => setEmailTouched(true)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            placeholder="you@example.com"
            placeholderTextColor={C.textTertiary}
            style={{
              borderWidth: 1,
              borderColor: emailError ? C.error : C.border,
              borderRadius: RADIUS.md,
              backgroundColor: C.surface,
              paddingHorizontal: SP.base,
              minHeight: SP.touch + 4,
              fontSize: 16,
              color: C.ink,
            }}
          />
          {emailError ? (
            <Text style={{ fontSize: 12, color: C.error, marginTop: SP.xs }}>{emailError}</Text>
          ) : null}
        </View>

        <PasswordInput label="Password" value={password} onChangeText={setPassword} />

        <TextLink label="Forgot password?" onPress={() => {}} align="right" />

        <Button label="Sign in" fullWidth loading={isBusy} disabled={!canSubmit} onPress={onSignIn} />
      </View>

      <OrDivider />

      <View style={{ flexDirection: "row", gap: SP.md }}>
        <SocialButton provider="google" onPress={onGoogle} disabled={isBusy} />
        <SocialButton provider="apple" disabled />
      </View>
    </Screen>
  );
}
