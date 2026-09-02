// src/components/proof/RefundTimelineCard.tsx
import React from "react";
import { Text, View, type ViewStyle } from "react-native";
import { C, SP, peso } from "@/theme/tokens";
import { ProofCardShell, ProofDivider, type ProofStatus } from "./ProofCardShell";
import { ProgressTimeline, type TimelineStep } from "../ProgressTimeline";

export interface RefundTimelineCardProps {
  /** Refund amount (centavos). */
  amountCentavos: number;
  /** Reason shown under the amount. */
  reason?: string;
  /** Timeline: requested → approved → processed → completed. */
  steps: TimelineStep[];
  /** Expected settlement copy, e.g. "In 3–5 banking days". */
  expected?: string;
  status?: ProofStatus;
  style?: ViewStyle;
}

export function RefundTimelineCard({
  amountCentavos,
  reason,
  steps,
  expected,
  status = "pending",
  style,
}: Readonly<RefundTimelineCardProps>) {
  return (
    <ProofCardShell label="Refund status" icon="wallet" status={status} style={style}>
      <View style={{ marginBottom: SP.md }}>
        <Text style={{ fontSize: 24, fontWeight: "700", color: C.ink }}>{peso(amountCentavos)}</Text>
        {reason ? <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{reason}</Text> : null}
      </View>
      <ProofDivider />
      <View style={{ marginTop: SP.sm }}>
        <ProgressTimeline steps={steps} />
      </View>
      {expected ? (
        <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: SP.md }}>Expected: {expected}</Text>
      ) : null}
    </ProofCardShell>
  );
}
