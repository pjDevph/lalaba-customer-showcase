// app/(auth)/location.tsx  (027)
import React, { useState } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { Button } from "@/components";
import { C, SP } from "@/theme/tokens";
import { MapPin, Check } from "@/theme/icons";
import { notify } from "@/stores/notificationStore";
import { Screen, StepText, SkipButton } from "@/features/auth/parts";

const BULLETS = [
  "Only used while you're using the app",
  "Never shared with providers before booking",
  "You can change this anytime in Settings",
];

export default function LocationStep() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const next = () => router.push("/(auth)/notifications");

  const onAllow = async () => {
    setBusy(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        notify.info("Location off", "No problem — you can enter your address manually.");
      }
    } catch {
      notify.error("Couldn't access location", "You can enter your address manually instead.");
    } finally {
      setBusy(false);
      next();
    }
  };

  return (
    <Screen
      scroll={false}
      footer={
        <>
          <Button label="Allow location access" fullWidth loading={busy} onPress={onAllow} />
          <Button label="Enter my address manually" variant="ghost" fullWidth onPress={next} />
        </>
      }
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <StepText step={3} total={3} />
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
          <MapPin size={52} color={C.primaryText} strokeWidth={1.8} />
        </View>

        <Text style={{ fontSize: 24, fontWeight: "700", color: C.ink, textAlign: "center", marginBottom: 10 }}>
          Find laundry services near you
        </Text>
        <Text style={{ fontSize: 15, color: C.textMuted, lineHeight: 23, textAlign: "center", marginBottom: SP["2xl"] }}>
          Your location helps us show nearby laundromats and Home Washers, accurate delivery fees, and live pickup tracking.
        </Text>

        <View style={{ gap: SP.md, alignSelf: "stretch" }}>
          {BULLETS.map((text) => (
            <View key={text} style={{ flexDirection: "row", alignItems: "center", gap: SP.md }}>
              <Check size={18} color={C.success} strokeWidth={2.5} />
              <Text style={{ flex: 1, fontSize: 14, color: C.textSecondary, lineHeight: 20 }}>{text}</Text>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}
