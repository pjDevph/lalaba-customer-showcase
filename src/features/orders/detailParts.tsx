// src/features/orders/detailParts.tsx
// Small presentational pieces for the order-detail screen: the status-title
// colour rule and the Card / SectionTitle / ActionCard / RowLine primitives.
// Split out of [id].tsx (F2, 600-line limit). Underscore keeps expo-router
// from treating this as a route.
import React from "react";
import { Text, View } from "react-native";
import { C, SP, RADIUS, TYPE } from "@/theme/tokens";
import { Badge } from "@/components";
import { statusBanner } from "@/features/orders/status";


// Status-header title color by tone (board waiting state uses ink).
export function statusTitleColor(tone: ReturnType<typeof statusBanner>["tone"]): string {
  if (tone === "warning") return C.warningText;
  if (tone === "success") return C.success;
  return C.ink;
}

// ─── Small presentational helpers ─────────────────────────────────────────────
export function Card({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <View style={{ backgroundColor: C.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: C.border, padding: SP.lg }}>
      {children}
    </View>
  );
}

export function SectionTitle({ children }: Readonly<{ children: React.ReactNode }>) {
  return <Text style={{ ...TYPE.cardTitle }}>{children}</Text>;
}

export function ActionCard({ title, tone, children }: Readonly<{ title: string; tone: "warning" | "info"; children: React.ReactNode }>) {
  return (
    <View
      style={{
        backgroundColor: C.surface,
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: tone === "warning" ? C.warning : C.border,
        padding: SP.lg,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: SP.sm }}>
        <Text style={{ ...TYPE.cardTitle }}>{title}</Text>
        <Badge preset="ACTION_REQUIRED" />
      </View>
      {children}
    </View>
  );
}

export function RowLine({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: SP.xs, gap: SP.md }}>
      <Text style={{ ...TYPE.meta }}>{label}</Text>
      <Text style={{ ...TYPE.bodyStrong, textTransform: "capitalize" }}>{value}</Text>
    </View>
  );
}
