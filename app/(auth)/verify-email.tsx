// app/(auth)/verify-email.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Hard gate between "Firebase account created" and the rest of the app, ported
// from the partner app's verify-email screen. Reached only via the
// `needs-email-verification` status in app/_layout.tsx, which pins the user
// here — there is no route off this screen except verifying or signing out.
//
// Google/Apple accounts arrive pre-verified and phone accounts have no email,
// so neither ever lands here (see needsEmailVerification in authStore).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from "react";
import { View, Text } from "react-native";
import { Button } from "@/components";
import { C, RADIUS, SP } from "@/theme/tokens";
import { Mail } from "@/theme/icons";
import { useAuthStore } from "@/stores/authStore";
import { notify } from "@/stores/notificationStore";
import { auth } from "@/config/firebase";
import { Screen, AuthHeader, TextLink } from "@/features/auth/parts";
import { usePoll } from "../../src/hooks/usePoll";

/** How often to re-read the Firebase user while the user is off in their inbox. */
const POLL_INTERVAL_MS = 4000;
/** Matches the partner app's resend throttle. */
const RESEND_COOLDOWN_S = 60;

export default function VerifyEmail() {
  const checkEmailVerified = useAuthStore((s) => s.checkEmailVerified);
  const resendVerificationEmail = useAuthStore((s) => s.resendVerificationEmail);
  const signOut = useAuthStore((s) => s.signOut);

  const email = auth.currentUser?.email ?? "your email address";
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);
  const [error, setError] = useState<string | null>(null);

  // ─── Auto-detect ────────────────────────────────────────────────────────────
  // The user verifies in their mail app, not here, so poll until it takes. On
  // success the store advances the status and the root gate moves us on — this
  // screen never navigates itself.
  // Was a recursive setTimeout that self-terminated on success. usePoll takes
  // the stop condition as `enabled` instead, so it also stops on blur and on
  // background — a mail-app round trip is exactly when this screen loses
  // focus, and the old loop kept polling Firebase throughout.
  const [emailVerified, setEmailVerified] = useState(false);
  usePoll(
    async () => {
      if (await checkEmailVerified()) setEmailVerified(true);
    },
    POLL_INTERVAL_MS,
    !emailVerified,
  );

  // ─── Resend cooldown ────────────────────────────────────────────────────────
  // Starts ticking immediately: registerCustomer already sent the first mail.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const onCheck = useCallback(async () => {
    setChecking(true);
    setError(null);
    const verified = await checkEmailVerified();
    if (!verified) setError("Not verified yet. Open the link in your inbox, then try again.");
    setChecking(false);
  }, [checkEmailVerified]);

  const onResend = useCallback(async () => {
    if (cooldown > 0) return;
    setResending(true);
    setError(null);
    try {
      await resendVerificationEmail();
      setCooldown(RESEND_COOLDOWN_S);
      notify.success("Verification email sent", `Check the inbox for ${email}.`);
    } catch {
      setError("Couldn't resend the email. Try again in a moment.");
    } finally {
      setResending(false);
    }
  }, [cooldown, resendVerificationEmail, email]);

  return (
    <Screen
      footer={
        <>
          <Button label="I've verified my email" fullWidth loading={checking} onPress={onCheck} />
          <Button
            label={cooldown > 0 ? `Resend email in ${cooldown}s` : "Resend verification email"}
            variant="outline"
            fullWidth
            loading={resending}
            disabled={cooldown > 0}
            onPress={onResend}
          />
          <TextLink label="Sign out and use a different email" onPress={signOut} />
        </>
      }
    >
      <View style={{ flex: 1, paddingTop: SP["2xl"] }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: RADIUS.xl,
            backgroundColor: C.primaryTint,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: SP.xl,
          }}
        >
          <Mail size={30} color={C.primaryText} />
        </View>

        <AuthHeader
          title="Check your email"
          subtitle="We sent a verification link to"
          style={{ marginBottom: SP.sm }}
        />
        <Text style={{ fontSize: 15, fontWeight: "700", color: C.ink, marginBottom: SP.base }}>
          {email}
        </Text>
        <Text style={{ fontSize: 14, color: C.textMuted, lineHeight: 21 }}>
          Open the link to confirm this address. We&apos;ll pick it up automatically — you can
          leave this screen open. Verifying your email keeps your bookings and order updates
          reaching you.
        </Text>

        {error ? (
          <Text style={{ fontSize: 13, color: C.error, marginTop: SP.base }}>{error}</Text>
        ) : null}

        <Text style={{ fontSize: 13, color: C.textTertiary, marginTop: SP.xl, lineHeight: 19 }}>
          No email? Check your spam folder, or resend it below.
        </Text>
      </View>
    </Screen>
  );
}
