// src/features/provider/sheets.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Bottom sheets for the provider profile screen: 075 "Verified Home Washer"
// explainer and 073 privacy-safe "Service area" map. Split out of [branchId].tsx
// to keep that route under the file-size budget. Underscore prefix → not a route.
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { Text, View } from "react-native";
import { C, SP } from "@/theme/tokens";
import { ShieldCheck, CircleCheck } from "@/theme/icons";
import { Button, MapView, BottomSheet } from "@/components";
import type { ProviderProfile } from "@/types/api";

// ─── 075 — Verified Home Washer sheet ─────────────────────────────────────────
export function VerifySheet({
  visible,
  onClose,
  profile,
}: Readonly<{ visible: boolean; onClose: () => void; profile: ProviderProfile | null }>) {
  const v = profile?.washerVerification;
  const checks: { label: string; desc: string; ok: boolean }[] = [
    { label: "Identity verified", desc: "Government ID checked by Lalaba", ok: !!v?.identityVerified },
    { label: "Residence confirmed", desc: "Service address validated on site", ok: !!v?.residenceConfirmed },
    { label: "Services reviewed", desc: "Catalog and pricing approved by Lalaba", ok: !!v?.servicesReviewed },
    { label: "Payment account verified", desc: "Direct-payment details confirmed by Lalaba", ok: !!v?.paymentAccountVerified },
  ];
  const verifiedOn = v?.verifiedOn ? new Date(v.verifiedOn).toLocaleDateString() : null;

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Verified Home Washer">
      <View style={{ gap: SP.md }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: C.ink }}>What this badge means</Text>
        <View style={{ gap: SP.base }}>
          {checks.map((c) => (
            <View key={c.label} style={{ flexDirection: "row", alignItems: "flex-start", gap: SP.md }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: c.ok ? C.washerTint : C.surfaceAlt,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CircleCheck size={18} color={c.ok ? C.washer : C.textTertiary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: C.ink }}>{c.label}</Text>
                <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 1 }}>{c.desc}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={{ marginTop: SP.xs }}>
          <Text style={{ fontSize: 13, color: C.textMuted }}>
            <Text style={{ fontWeight: "700", color: C.ink }}>Verified on </Text>
            {verifiedOn ?? "recently"} · Re-checked every 6 months
          </Text>
        </View>
        <Button label="Got it" fullWidth onPress={onClose} style={{ backgroundColor: C.washer, marginTop: SP.sm }} />
      </View>
    </BottomSheet>
  );
}

// ─── 073 — Privacy-safe service area sheet ────────────────────────────────────
export function ServiceAreaSheet({
  visible,
  onClose,
  profile,
}: Readonly<{ visible: boolean; onClose: () => void; profile: ProviderProfile | null }>) {
  const center = profile?.mapLocation
    ? { latitude: profile.mapLocation.latitude, longitude: profile.mapLocation.longitude }
    : { latitude: 14.5995, longitude: 120.9842 };
  const bullets = [
    "Pickup and return are handled by assigned staff",
    "You never need to visit the washer's home",
    "Live tracking covers pickup and return legs",
  ];
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Service area">
      <View style={{ gap: SP.md }}>
        {profile ? (
          <>
            <Text style={{ fontSize: 15, fontWeight: "700", color: C.ink }}>{profile.name}</Text>
            <MapView
              mode="serviceArea"
              region={{ ...center, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
              areaCenter={center}
              areaRadiusMeters={900}
              height={160}
            />
            <Text style={{ fontSize: 14, color: C.textSecondary }}>{profile.areaLabel ?? "General area only"}</Text>
          </>
        ) : null}

        <Text style={{ fontSize: 16, fontWeight: "700", color: C.ink, marginTop: SP.xs }}>Why no exact address?</Text>
        <Text style={{ fontSize: 14, color: C.textSecondary, lineHeight: 21 }}>
          Home Washers work from their residence. To keep them safe, Lalaba shows only their approved general service area
          while you browse.
        </Text>
        <View style={{ gap: SP.sm }}>
          {bullets.map((b) => (
            <View key={b} style={{ flexDirection: "row", alignItems: "flex-start", gap: SP.sm }}>
              <ShieldCheck size={18} color={C.washer} />
              <Text style={{ flex: 1, fontSize: 14, color: C.textSecondary, lineHeight: 20 }}>{b}</Text>
            </View>
          ))}
        </View>
        <Button label="Got it" fullWidth onPress={onClose} style={{ backgroundColor: C.washer, marginTop: SP.sm }} />
      </View>
    </BottomSheet>
  );
}
