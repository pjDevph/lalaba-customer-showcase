// app/(auth)/notifications.tsx  (030)
import React from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Button, PushPreviewCard } from "@/components";
import { C, SP } from "@/theme/tokens";
import { Screen, SkipButton } from "@/features/auth/parts";

function BellGlyph() {
  return (
    <Svg width={52} height={52} viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </Svg>
  );
}

export default function Notifications() {
  const router = useRouter();
  const next = () => router.push("/(auth)/complete");

  return (
    <Screen
      scroll={false}
      footer={
        <>
          <Button label="Enable notifications" fullWidth onPress={next} />
          <Button
            label="Maybe later"
            variant="ghost"
            fullWidth
            onPress={next}
            textStyle={{ color: C.textMuted }}
          />
        </>
      }
    >
      <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
        <SkipButton onPress={next} />
      </View>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: SP.sm }}>
        <View
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: C.primaryTint,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: SP["2xl"],
          }}
        >
          <BellGlyph />
          <View
            style={{
              position: "absolute",
              top: 24,
              right: 24,
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: C.error,
              borderWidth: 3,
              borderColor: C.surface,
            }}
          />
        </View>

        <Text style={{ fontSize: 24, fontWeight: "700", color: C.ink, textAlign: "center", marginBottom: 10 }}>
          Stay updated on your laundry
        </Text>
        <Text style={{ fontSize: 15, color: C.textMuted, lineHeight: 23, textAlign: "center", marginBottom: SP.xl }}>
          Get notified when your provider accepts, when pickup staff is on the way, and when payment needs your confirmation.
        </Text>

        <PushPreviewCard
          time="now"
          title="Your laundry was picked up"
          body="2 bags collected by Juan D. · Order #LB-5210"
          style={{ alignSelf: "stretch" }}
        />
      </View>
    </Screen>
  );
}
