// app/(auth)/sign-up.tsx  (010)
import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import Svg, { Rect, Path } from "react-native-svg";
import { C, SP } from "@/theme/tokens";
import { Phone } from "@/theme/icons";
import { useAuthStore } from "@/stores/authStore";
import { notify } from "@/stores/notificationStore";
import {
  Screen,
  AuthHeader,
  LegalFooter,
  BackBox,
  MethodRow,
  GoogleGlyph,
  AppleGlyph,
} from "@/features/auth/parts";

function EnvelopeGlyph({ color = C.textMuted }: Readonly<{ color?: string }>) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="2" y="4" width="20" height="16" rx="2" />
      <Path d="M22 7l-10 6L2 7" />
    </Svg>
  );
}

// Phone OTP is stubbed: `sendOtp` calls signInWithPhoneNumber() with no
// appVerifier (see the TODO in authStore.ts), so it always rejects on device.
// The row stays visible but disabled — the method is real and coming, and a
// greyed row reads as "not yet" where a missing one reads as "not offered".
// Flip this to true once the verifier (or native RNFirebase auth) is wired;
// it is the only switch — dev and production deliberately show the same thing.
const PHONE_AUTH_READY = false;

// Apple sign-in needs an Apple Developer account set up (see CLAUDE.md's
// "Known follow-ups") before `signInWithApple` can be wired. Same on/off
// switch shape as PHONE_AUTH_READY above — flip once that's done.
const APPLE_AUTH_READY = false;

export default function SignUp() {
  const router = useRouter();
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);

  const onGoogle = async () => {
    await signInWithGoogle();
    const err = useAuthStore.getState().error;
    if (err) {
      notify.error("Google sign-in failed", err);
      useAuthStore.getState().clearError();
    }
  };

  return (
    <Screen footer={<LegalFooter prefix="By creating an account you agree to our" />}>
      <View style={{ marginBottom: SP.xl }}>
        <BackBox onPress={() => router.back()} />
      </View>

      <AuthHeader
        title="Create your account"
        subtitle="Choose how you'd like to sign up."
        style={{ marginBottom: SP["2xl"] }}
      />

      <View style={{ gap: SP.md }}>
        <MethodRow
          title="Mobile number"
          description={
            PHONE_AUTH_READY ? "Verify with a one-time SMS code" : "SMS verification is coming soon"
          }
          badge={PHONE_AUTH_READY ? undefined : "SOON"}
          disabled={!PHONE_AUTH_READY}
          icon={<Phone size={22} color={PHONE_AUTH_READY ? C.primaryText : C.textMuted} />}
          onPress={PHONE_AUTH_READY ? () => router.push("/(auth)/mobile") : undefined}
        />

        <MethodRow
          title="Email address"
          description="Sign up with email and password"
          icon={<EnvelopeGlyph />}
          onPress={() => router.push("/(auth)/register")}
        />

        <MethodRow
          title="Continue with Google"
          icon={<GoogleGlyph size={20} />}
          onPress={onGoogle}
        />

        <MethodRow
          title="Continue with Apple"
          description={APPLE_AUTH_READY ? undefined : "Apple sign-in is coming soon"}
          badge={APPLE_AUTH_READY ? undefined : "SOON"}
          disabled={!APPLE_AUTH_READY}
          icon={<AppleGlyph size={20} />}
        />
      </View>
    </Screen>
  );
}
