// src/components/proof/PaymentAuditCard.tsx
import React from "react";
import { Text, View, type ViewStyle } from "react-native";
import { C, SP, peso } from "@/theme/tokens";
import { ProofCardShell, ProofRow, ProofDivider, type ProofStatus } from "./ProofCardShell";

export type PaymentMethod = "gcash" | "maya" | "card" | "cash" | "bank";

export interface PaymentAuditCardProps {
  method: PaymentMethod;
  /** Amount paid — or due — in centavos. */
  amountCentavos: number;
  /** Provider reference / transaction id (mono). */
  reference?: string;
  paidAt?: string;
  status?: ProofStatus;
  /** Badge text; defaults to "Paid". Use for e.g. "To pay on delivery". */
  statusLabel?: string;
  style?: ViewStyle;
}

// Timing-agnostic — cash may be collected at pickup or on delivery/return.
const METHOD_LABEL: Record<PaymentMethod, string> = {
  gcash: "GCash",
  maya: "Maya",
  card: "Card",
  cash: "Cash",
  bank: "Bank transfer",
};

export function PaymentAuditCard({
  method,
  amountCentavos,
  reference,
  paidAt,
  status = "complete",
  statusLabel = "Paid",
  style,
}: Readonly<PaymentAuditCardProps>) {
  return (
    <ProofCardShell label="Payment audit" icon="creditCard" status={status} statusLabel={statusLabel} style={style}>
      <View style={{ alignItems: "center", paddingVertical: SP.xs }}>
        <Text style={{ fontSize: 28, fontWeight: "700", color: C.ink }}>{peso(amountCentavos)}</Text>
        <Text style={{ fontSize: 12, color: C.textMuted }}>via {METHOD_LABEL[method]}</Text>
      </View>
      <ProofDivider />
      {reference ? <ProofRow label="Reference" value={reference} mono /> : null}
      {paidAt ? <ProofRow label="Paid" value={paidAt} /> : null}
    </ProofCardShell>
  );
}
