// src/components/proof/ProofCardShell.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Shared shell for the "Lalaba Verify" proof/audit card family.
// White card, 3px LEFT accent border, a blue-50 header band (icon + label +
// status badge), and a body slot. Status drives the accent + badge colors:
//   verified → blue · pending → amber · complete → green
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { Text, View, type ViewStyle } from "react-native";
import { C, FONT, RADIUS, SP, SHADOW } from "@/theme/tokens";
import { Icon, type IconName } from "@/theme/icons";
import { Badge, type BadgeTone } from "../Badge";

export type ProofStatus = "verified" | "pending" | "complete";

export interface ProofCardShellProps {
  /** Header label, e.g. "Weight proof". */
  label: string;
  icon: IconName;
  status?: ProofStatus;
  /** Overrides the default status badge text. */
  statusLabel?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

const STATUS: Record<ProofStatus, { accent: string; badge: string; tone: BadgeTone }> = {
  verified: { accent: C.primary, badge: "Verified", tone: "brand" },
  pending: { accent: C.warning, badge: "Pending", tone: "warning" },
  complete: { accent: C.success, badge: "Complete", tone: "success" },
};

export function ProofCardShell({ label, icon, status = "verified", statusLabel, children, style }: Readonly<ProofCardShellProps>) {
  const s = STATUS[status];
  return (
    <View
      style={[
        {
          backgroundColor: C.surface,
          borderRadius: RADIUS.xl,
          borderWidth: 1,
          borderColor: C.border,
          borderLeftWidth: 3,
          borderLeftColor: s.accent,
          overflow: "hidden",
          ...SHADOW.sm,
        },
        style,
      ]}
    >
      {/* Header band */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: SP.sm,
          paddingHorizontal: SP.base,
          paddingVertical: SP.md,
          backgroundColor: C.primaryTint,
          borderBottomWidth: 1,
          borderBottomColor: C.borderSubtle,
        }}
      >
        <Icon name={icon} size={18} color={C.primaryText} />
        <Text style={{ flex: 1, fontSize: 13, fontWeight: "700", color: C.ink, letterSpacing: 0.2 }}>{label}</Text>
        <Badge label={statusLabel ?? s.badge} tone={s.tone} />
      </View>

      {/* Body */}
      <View style={{ padding: SP.base }}>{children}</View>
    </View>
  );
}

// ─── Small shared body primitives reused by the proof cards ───────────────────

export function ProofRow({ label, value, mono, emphasis }: Readonly<{ label: string; value: string; mono?: boolean; emphasis?: boolean }>) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: SP.md, paddingVertical: 5 }}>
      <Text style={{ fontSize: 13, color: C.textSecondary }}>{label}</Text>
      <Text
        style={{
          fontSize: emphasis ? 15 : 13,
          fontWeight: emphasis ? "700" : "600",
          color: C.ink,
          ...(mono ? { fontFamily: FONT.mono } : {}),
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export function ProofDivider() {
  return <View style={{ height: 1, backgroundColor: C.borderSubtle, marginVertical: SP.sm }} />;
}
