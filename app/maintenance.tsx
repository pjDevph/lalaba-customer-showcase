// app/maintenance.tsx
// Full-screen block shown while the Customer app is in maintenance (see
// app/_layout.tsx's auth gate + src/stores/maintenanceStore.ts). The ONLY way
// off this screen is the backend actually reporting blocked:false — Scheduled
// still enforces the block server-side, so "Got it" below is honestly a
// "check again now" action, not a bypass.

import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/components";
import { CircleAlert, Clock } from "@/theme/icons";
import { C, SP, RADIUS } from "@/theme/tokens";
import { useAuthStore } from "@/stores/authStore";
import { useMaintenanceStore } from "@/stores/maintenanceStore";
import {
  getMaintenanceStatus,
  getPublicMaintenanceStatus,
} from "@/services/graphql/maintenance";
import { usePoll } from "../src/hooks/usePoll";

const POLL_MS = 15_000;

/** 5425 (seconds) → "1:30:25". */
function hhmmss(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export default function MaintenanceScreen() {
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);
  const { mode, message, endsAt, supportEmail, supportPhone, clear, setActive } =
    useMaintenanceStore();
  const [checking, setChecking] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  const isEmergency = mode === "EMERGENCY";

  // Countdown, SCHEDULED only — recomputed from endsAt each tick rather than
  // decremented locally, so it can't drift from what the server actually
  // means by "ends at".
  useEffect(() => {
    if (isEmergency || !endsAt) {
      setRemaining(null);
      return;
    }
    const tick = () => {
      const secs = Math.round((new Date(endsAt).getTime() - Date.now()) / 1000);
      setRemaining(secs);
    };
    tick();
    // NOT a poll — deliberately left as a raw interval (H2 sweep).
    //
    // Local arithmetic against `endsAt`, no network and no server state. It
    // recomputes from the absolute end time on every tick rather than
    // decrementing, so it cannot drift, and it must keep running while
    // backgrounded: the countdown has to read correctly the instant the user
    // looks at the screen again, not resume from where it paused.
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [isEmergency, endsAt]);

  const signedIn = useAuthStore((s) => s.status) === "authenticated";

  const checkNow = React.useCallback(async () => {
    setChecking(true);
    try {
      // Anonymous callers ask the public query — the authenticated one needs a
      // session they do not have, and would fail forever, stranding a
      // signed-out visitor on this screen long after the outage ended.
      const status = signedIn
        ? await getMaintenanceStatus()
        : await getPublicMaintenanceStatus();
      if (!status.blocked) {
        clear();
        // Signed out, the gate sends them back to the welcome flow on its own
        // once `active` clears; there is no tab bar to return to.
        if (signedIn) router.replace("/(tabs)");
        return;
      }
      // Still blocked — refresh the message/countdown in case the admin
      // changed it since we landed here.
      if (status.type) {
        setActive({
          mode: status.type,
          message: status.message,
          endsAt: status.endsAt,
          supportEmail: status.supportEmail,
          supportPhone: status.supportPhone,
        });
      }
    } catch {
      // A failed check just means try again later — staying on this screen
      // is the safe default, never silently unblocking on a network hiccup.
    } finally {
      setChecking(false);
    }
  }, [clear, router, setActive, signedIn]);

  // Background poll — the same "keep checking a status that changes without
  // us" shape as order-status polling elsewhere in this app.
  usePoll(checkNow, POLL_MS);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C.bg,
        alignItems: "center",
        justifyContent: "center",
        padding: SP.xl,
        gap: SP.lg,
      }}
    >
      <View
        style={{
          width: 84,
          height: 84,
          borderRadius: RADIUS.full,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isEmergency ? C.errorTint : C.warningTint,
        }}
      >
        {isEmergency ? (
          <CircleAlert size={40} color={C.error} />
        ) : (
          <Clock size={40} color={C.warningText} />
        )}
      </View>

      <Text style={{ fontSize: 20, fontWeight: "700", color: C.ink, textAlign: "center" }}>
        {isEmergency ? "Under Maintenance" : "Scheduled Maintenance"}
      </Text>

      <Text
        style={{
          fontSize: 14,
          color: C.textMuted,
          textAlign: "center",
          lineHeight: 20,
          maxWidth: 320,
        }}
      >
        {message ??
          (isEmergency
            ? "Lalaba is temporarily unavailable while we fix a problem. We'll be back as soon as we can."
            : "Lalaba is undergoing scheduled maintenance to improve our service.")}
      </Text>

      {/* What it means for them, always — the admin's message explains the
          outage, not its effect on an order already in progress, which is the
          only thing a customer mid-delivery actually wants to know. */}
      <Text
        style={{
          fontSize: 13,
          color: C.textMuted,
          textAlign: "center",
          lineHeight: 18,
          maxWidth: 320,
        }}
      >
        You can&apos;t place or track orders right now. Any order already
        running is unaffected — it carries on as normal.
      </Text>

      {!isEmergency && remaining != null && remaining > 0 && (
        <Text style={{ fontSize: 28, fontWeight: "700", color: C.ink, fontVariant: ["tabular-nums"] }}>
          {hhmmss(remaining)}
        </Text>
      )}

      {/* Retry in BOTH modes. "Log Out" used to be the only action in
          Emergency, which is the wrong one: this screen already polls and
          releases them by itself, and signing out costs an SMS to get back
          in — on an outage they did not cause — only to be bounced back here
          by the first request. Signing out stays available, in the size that
          choice deserves. */}
      <Button
        label={checking ? "Checking…" : "Try again"}
        variant="primary"
        loading={checking}
        onPress={() => void checkNow()}
      />

      <Text style={{ fontSize: 12, color: C.textMuted, textAlign: "center" }}>
        Checking again automatically. You don&apos;t have to stay on this screen.
      </Text>

      {/* Real actions, not an address inside a paragraph. Both come from the
          admin panel — nobody has to remember to type "contact us at…" into a
          message written while something is on fire, and a phone number here
          dials instead of being copied out by hand. Absent when unconfigured
          rather than falling back to a support address baked into the app,
          which is exactly the kind of constant that outlives the mailbox. */}
      {(supportEmail || supportPhone) && (
        <View style={{ flexDirection: "row", gap: SP.sm, flexWrap: "wrap", justifyContent: "center" }}>
          {supportEmail && (
            <SupportAction
              label="Email support"
              onPress={() => void Linking.openURL(`mailto:${supportEmail}`)}
            />
          )}
          {supportPhone && (
            <SupportAction
              label="Call support"
              onPress={() =>
                void Linking.openURL(`tel:${supportPhone.replace(/[^+\d]/g, "")}`)
              }
            />
          )}
        </View>
      )}

      {signedIn && (
        <Pressable onPress={() => void signOut()} hitSlop={8}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: C.textMuted }}>
            Log out
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/** Outlined, so neither competes with "Try again" — which is still the thing
 *  most likely to get them moving again. */
function SupportAction({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: RADIUS.md,
        paddingVertical: SP.sm,
        paddingHorizontal: SP.base,
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: "600", color: C.ink }}>{label}</Text>
    </Pressable>
  );
}
