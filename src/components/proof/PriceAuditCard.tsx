// src/components/proof/PriceAuditCard.tsx
import React from "react";
import { Text, View, type ViewStyle } from "react-native";
import { C, SP, peso } from "@/theme/tokens";
import { ProofCardShell, ProofRow, ProofDivider, type ProofStatus } from "./ProofCardShell";

export interface PriceAuditLine {
  label: string;
  /** Amount in centavos. */
  amountCentavos: number;
  mono?: boolean;
}

export interface PriceAuditCardProps {
  /** Original estimate at booking (centavos). */
  estimateCentavos: number;
  /** Final charged amount after weighing/adjustments (centavos). */
  finalCentavos: number;
  /** Optional itemized adjustment lines between estimate and final. */
  adjustments?: PriceAuditLine[];
  note?: string;
  status?: ProofStatus;
  /** Overrides the badge text — these cards report recorded facts, not audits. */
  statusLabel?: string;
  style?: ViewStyle;
}

export function PriceAuditCard({
  estimateCentavos,
  finalCentavos,
  adjustments,
  note,
  status = "verified",
  statusLabel,
  style,
}: Readonly<PriceAuditCardProps>) {
  const delta = finalCentavos - estimateCentavos;
  const deltaColor = delta > 0 ? C.warningText : delta < 0 ? C.success : C.textMuted;
  return (
    <ProofCardShell label="Price audit" icon="fileText" status={status} statusLabel={statusLabel} style={style}>
      <ProofRow label="Booking estimate" value={peso(estimateCentavos)} />
      {(adjustments ?? []).map((a, i) => (
        <ProofRow key={`${a.label}-${i}`} label={a.label} value={peso(a.amountCentavos)} mono={a.mono} />
      ))}
      <ProofDivider />
      <ProofRow label="Final total" value={peso(finalCentavos)} emphasis />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: SP.xs }}>
        <Text style={{ fontSize: 12, color: C.textMuted }}>Change vs estimate</Text>
        <Text style={{ fontSize: 13, fontWeight: "700", color: deltaColor }}>
          {delta === 0 ? "No change" : `${delta > 0 ? "+" : "−"}${peso(Math.abs(delta))}`}
        </Text>
      </View>
      {note ? <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: SP.sm }}>{note}</Text> : null}
    </ProofCardShell>
  );
}
