// src/components/proof/WeightProofCard.tsx
import React from "react";
import { Text, View, type ViewStyle } from "react-native";
import { C, SP, kg } from "@/theme/tokens";
import { ProofCardShell, ProofRow, ProofDivider, type ProofStatus } from "./ProofCardShell";

export interface WeightProofCardProps {
  /** Weight the customer estimated at booking (kg). */
  estimatedKg?: number;
  /** Actual weighed weight (kg). */
  actualKg: number;
  /** Price per kg in centavos, for the recomputed line. */
  pricePerKgCentavos?: number;
  /** Who weighed it + when. */
  weighedBy?: string;
  weighedAt?: string;
  status?: ProofStatus;
  /** Overrides the badge text — these cards report recorded facts, not audits. */
  statusLabel?: string;
  style?: ViewStyle;
}

export function WeightProofCard({
  estimatedKg,
  actualKg,
  pricePerKgCentavos,
  weighedBy,
  weighedAt,
  status = "verified",
  statusLabel,
  style,
}: Readonly<WeightProofCardProps>) {
  const delta = typeof estimatedKg === "number" ? actualKg - estimatedKg : undefined;
  return (
    <ProofCardShell label="Weight proof" icon="scale" status={status} statusLabel={statusLabel} style={style}>
      <View style={{ alignItems: "center", paddingVertical: SP.sm }}>
        <Text style={{ fontSize: 32, fontWeight: "700", color: C.ink }}>{kg(actualKg)}</Text>
        <Text style={{ fontSize: 12, color: C.textMuted }}>Verified weight</Text>
      </View>
      <ProofDivider />
      {typeof estimatedKg === "number" ? <ProofRow label="You estimated" value={kg(estimatedKg)} /> : null}
      {typeof delta === "number" ? (
        <ProofRow label="Difference" value={`${delta >= 0 ? "+" : "−"}${kg(Math.abs(delta))}`} />
      ) : null}
      {typeof pricePerKgCentavos === "number" ? (
        <ProofRow label="Rate" value={`₱${(pricePerKgCentavos / 100).toFixed(2)}/kg`} mono />
      ) : null}
      {weighedBy || weighedAt ? (
        <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: SP.sm }}>
          {[weighedBy ? `Weighed by ${weighedBy}` : null, weighedAt].filter(Boolean).join(" · ")}
        </Text>
      ) : null}
    </ProofCardShell>
  );
}
