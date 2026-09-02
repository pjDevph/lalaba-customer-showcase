// app/(auth)/splash.tsx  (007)
// Brand splash. Auto-advances after a beat based on the resolved auth status.
import React, { useEffect } from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { C, SP } from "@/theme/tokens";
import { useAuthStore } from "@/stores/authStore";
import { Wordmark } from "@/features/auth/parts";

export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => {
      const { status } = useAuthStore.getState();
      if (status === "authenticated") router.replace("/(tabs)");
      else if (status === "needs-registration") router.replace("/(auth)/complete");
      else router.replace("/(auth)/welcome");
    }, 1200);
    return () => clearTimeout(t);
  }, [router]);

  return (
    // Brand-blue plate so this hands off from the native splash (same
    // backgroundColor in app.config.ts) without a white flash between them.
    <SafeAreaView style={{ flex: 1, backgroundColor: C.primary }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: SP.md }}>
        <Wordmark height={64} variant="white" tagline="Laundry, picked up and delivered" />
      </View>
      <View style={{ alignItems: "center", paddingBottom: SP.xl }}>
        <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>Version 2.0.0</Text>
      </View>
    </SafeAreaView>
  );
}
