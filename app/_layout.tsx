// app/_layout.tsx
// ─────────────────────────────────────────────────────────────────────────────
// ROOT layout. Boots the auth listener, hosts the global toast, and enforces
// auth gating on top of expo-router's file-based nesting.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Stack, useRouter, useSegments } from "expo-router";
import "react-native-reanimated";

import { C, RADIUS, SP, SHADOW } from "@/theme/tokens";
import { Icon, type IconName } from "@/theme/icons";
import { useAuthStore } from "@/stores/authStore";
import { useMaintenanceStore } from "@/stores/maintenanceStore";
import {
  useNotificationStore,
  type AppNotification,
  type NotificationType,
} from "@/stores/notificationStore";
import { CampaignPopup, ConfirmDialog, OfflineBanner } from "@/components";
import { startNetworkMonitor } from "@/services/network";
import { pingBackendUntilReady, setMaintenanceModeHandler, setUnauthenticatedHandler } from "@/config/graphql";

// ─── Toast host ───────────────────────────────────────────────────────────────
const TOAST_STYLE: Record<NotificationType, { tint: string; fg: string; icon: IconName }> = {
  success: { tint: C.successTint, fg: C.success, icon: "circleCheck" },
  error: { tint: C.errorTint, fg: C.error, icon: "circleAlert" },
  info: { tint: C.infoTint, fg: C.info, icon: "info" },
  warning: { tint: C.warningTint, fg: C.warningText, icon: "circleAlert" },
};

function ToastCard({ item, onDismiss }: Readonly<{ item: AppNotification; onDismiss: () => void }>) {
  const s = TOAST_STYLE[item.type];
  return (
    <Pressable
      accessibilityRole="alert"
      onPress={onDismiss}
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: SP.md,
        padding: SP.base,
        borderRadius: RADIUS.lg,
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.border,
        borderLeftWidth: 4,
        borderLeftColor: s.fg,
        ...SHADOW.lg,
      }}
    >
      <View style={{ paddingTop: 1 }}>
        <Icon name={s.icon} size={20} color={s.fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: C.ink }}>{item.title}</Text>
        {item.message ? (
          <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 2, lineHeight: 18 }}>
            {item.message}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function ToastHost() {
  const insets = useSafeAreaInsets();
  const notifications = useNotificationStore((s) => s.notifications);
  const dismiss = useNotificationStore((s) => s.dismiss);
  if (notifications.length === 0) return null;
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: insets.top + SP.sm,
        left: SP.screen,
        right: SP.screen,
        gap: SP.sm,
        zIndex: 1000,
      }}
    >
      {notifications.map((n) => (
        <ToastCard key={n.id} item={n} onDismiss={() => dismiss(n.id)} />
      ))}
    </View>
  );
}

// ─── Auth gating ──────────────────────────────────────────────────────────────
// Watches auth status + the current route group and redirects. Only acts from
// "the wrong side" of a boundary so it never interrupts the manual onboarding
// steps (mobile → otp → location → notifications → complete) nor loops.
function useAuthGate() {
  const status = useAuthStore((s) => s.status);
  const maintenanceActive = useMaintenanceStore((s) => s.active);
  const bootstrapChecked = useMaintenanceStore((s) => s.bootstrapChecked);
  const checkPublic = useMaintenanceStore((s) => s.checkPublic);
  const segments = useSegments();
  const router = useRouter();

  // GAP-MNT-001 — the cold-start check, once, before anything else routes.
  // Never rejects and always flips bootstrapChecked, including on failure, so
  // the gate below cannot be held open by a network problem.
  useEffect(() => {
    void checkPublic();
  }, [checkPublic]);

  useEffect(() => {
    const inAuthGroup = segments[0] === "(auth)";
    const route = segments.join("/");
    // Screens inside (auth) that are meaningless without a Firebase session.
    // Being in the group is normally enough to leave someone alone, but these
    // describe an account — a signed-out user must be pushed off them.
    const onSessionOnlyScreen = route === "(auth)/verify-email";

    if (status === "loading") return; // sit tight on splash

    // Hold the splash until the cold-start check has answered, so the welcome
    // and sign-in screens never become actionable before we know whether
    // signing in is pointless. Bounded: checkPublic always resolves, timeout
    // and failure included, and a failure leaves the app OPEN.
    if (!bootstrapChecked) return;

    // Checked before every other branch, and now for anonymous visitors too.
    // It used to be gated on `status === "authenticated"`, on the reasoning
    // that the backend only blocks authenticated requests — true, and exactly
    // the problem: a signed-out customer met a perfectly normal welcome
    // screen, typed a phone number, paid for an OTP, signed in, and only then
    // learned the platform was down. Pinned the same way
    // needs-email-verification is: while blocked, this is the one place to be.
    if (maintenanceActive) {
      if (route !== "maintenance") router.replace("/maintenance");
      return;
    }

    if (status === "authenticated") {
      if (inAuthGroup) router.replace("/(tabs)");
      return;
    }

    if (status === "needs-email-verification") {
      // A hard gate, unlike the steps below: an unverified account is pinned to
      // this one screen (not merely kept inside the group) so it can't wander
      // back into sign-up or forward into the app. Signing out from there flips
      // the status to unauthenticated, which releases it below.
      if (!onSessionOnlyScreen) router.replace("/(auth)/verify-email");
      return;
    }

    if (status === "needs-registration") {
      // Let the user move through the onboarding steps inside (auth); only pull
      // them back to complete if they somehow escaped the group.
      if (!inAuthGroup) router.replace("/(auth)/complete");
      return;
    }

    // unauthenticated — leaving them anywhere in (auth) is right for the
    // onboarding steps, but not for a screen that needs the session that just
    // ended (signing out of verify-email would otherwise strand them there).
    if (!inAuthGroup || onSessionOnlyScreen) router.replace("/(auth)/welcome");
  }, [status, maintenanceActive, bootstrapChecked, segments, router]);
}

function RootNavigator() {
  useAuthGate();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        {/* Sheet-styled route: keep the screen underneath visible behind the scrim. */}
        <Stack.Screen
          name="address-select"
          options={{
            presentation: "transparentModal",
            animation: "fade",
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
        {/* No swipe/hardware back out of a maintenance block — the screen
            itself is the only thing that navigates away, once it confirms
            (via poll) the block has actually lifted. */}
        <Stack.Screen name="maintenance" options={{ gestureEnabled: false }} />
      </Stack>
      <OfflineBanner />
      <ToastHost />
      <ConfirmDialog />
      {/* Last in the tree so it sits above everything, and mounted at the root
          so it is not tied to whichever tab happens to be showing. It renders
          nothing unless the backend says a campaign is due. */}
      <CampaignPopup />
    </View>
  );
}

export default function RootLayout() {
  const initAuthListener = useAuthStore((s) => s.initAuthListener);

  useEffect(() => {
    const unsub = initAuthListener();
    const stopNetwork = startNetworkMonitor();
    setMaintenanceModeHandler((info) => useMaintenanceStore.getState().setActive(info));
    setUnauthenticatedHandler((message) => useAuthStore.getState().handleDeadSession(message));
    // Fire-and-forget: warms a spun-down Render backend while Firebase auth
    // bootstraps, so the user's first real query is more likely to land on an
    // already-woken instance instead of hitting the 15s request timeout.
    // Deliberately not gating navigation on this — unlike checkPublic()
    // above, an unreachable backend here should never hold up the app.
    void pingBackendUntilReady();
    return () => {
      unsub();
      stopNetwork();
      setMaintenanceModeHandler(null);
      setUnauthenticatedHandler(null);
    };
  }, [initAuthListener]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
