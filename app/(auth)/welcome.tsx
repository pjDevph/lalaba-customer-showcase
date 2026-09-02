// app/(auth)/welcome.tsx  (008)
import React from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/components";
import { C, RADIUS, SP } from "@/theme/tokens";
import { Truck, Clock, Wallet, type LucideIcon } from "@/theme/icons";
import { Screen, BrandRow, LegalFooter } from "@/features/auth/parts";

interface Feature {
  icon: LucideIcon;
  title: string;
  sub: string;
  tint: string;
  fg: string;
}

const FEATURES: Feature[] = [
  // Pickup/delivery is a per-provider policy (`ProviderPolicies.freeBatchDelivery`,
  // and drop-off is a valid fulfillment mode) — so this can't promise "free" flatly.
  { icon: Truck, title: "Pickup, delivery, or drop-off", sub: "Free batch delivery from providers that offer it", tint: C.primaryTint, fg: C.primaryText },
  { icon: Clock, title: "Track every step", sub: "From pickup to return, live", tint: C.primaryTint, fg: C.primaryText },
  { icon: Wallet, title: "Pay the provider directly", sub: "Cash or GCash, Maya and more", tint: C.washerTint, fg: C.washer },
];

function FeatureRow({ icon: IconCmp, title, sub, tint, fg }: Readonly<Feature>) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: SP.base }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: RADIUS.md,
          backgroundColor: tint,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconCmp size={22} color={fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: C.ink }}>{title}</Text>
        <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>{sub}</Text>
      </View>
    </View>
  );
}

export default function Welcome() {
  const router = useRouter();
  return (
    <Screen
      footer={
        <>
          <Button label="Create account" fullWidth onPress={() => router.push("/(auth)/sign-up")} />
          <Button
            label="Sign in"
            variant="outline"
            fullWidth
            onPress={() => router.push("/(auth)/sign-in")}
          />
          <LegalFooter style={{ marginTop: SP.xs }} />
        </>
      }
    >
      <View style={{ flex: 1, paddingTop: SP.xl, justifyContent: "space-between" }}>
        <View>
          <BrandRow height={44} style={{ justifyContent: "center", marginBottom: SP["2xl"] }} />

          <Text
            style={{
              fontSize: 32,
              fontWeight: "800",
              color: C.ink,
              lineHeight: 38,
              letterSpacing: -0.8,
              marginBottom: SP.md,
            }}
          >
            Clean laundry, without leaving home
          </Text>
          <Text style={{ fontSize: 15, color: C.textMuted, lineHeight: 23 }}>
            Book trusted laundromats and verified Home Washers near you. Track every step until your laundry is back.
          </Text>
        </View>

        <View style={{ gap: SP.lg }}>
          {FEATURES.map((f) => (
            <FeatureRow key={f.title} {...f} />
          ))}
        </View>
      </View>
    </Screen>
  );
}
