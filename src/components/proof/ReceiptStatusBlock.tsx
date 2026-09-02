// src/components/proof/ReceiptStatusBlock.tsx
import React from "react";
import { Pressable, Text, View, type ViewStyle } from "react-native";
import { C, SP, peso } from "@/theme/tokens";
import { FileText, ChevronRight } from "@/theme/icons";
import { ProofCardShell, ProofRow, ProofDivider, type ProofStatus } from "./ProofCardShell";

export interface ReceiptStatusBlockProps {
  /** Receipt / order reference (mono). */
  receiptNumber: string;
  /** Total on the receipt (centavos). */
  totalCentavos: number;
  issuedAt?: string;
  /** Whether an official receipt has been issued. */
  status?: ProofStatus;
  statusLabel?: string;
  /** Tap to view/download the full receipt. */
  onView?: () => void;
  style?: ViewStyle;
}

export function ReceiptStatusBlock({
  receiptNumber,
  totalCentavos,
  issuedAt,
  status = "complete",
  statusLabel,
  onView,
  style,
}: Readonly<ReceiptStatusBlockProps>) {
  return (
    <ProofCardShell label="Receipt" icon="fileText" status={status} statusLabel={statusLabel} style={style}>
      <ProofRow label="Receipt no." value={receiptNumber} mono />
      <ProofRow label="Total" value={peso(totalCentavos)} emphasis />
      {issuedAt ? <ProofRow label="Issued" value={issuedAt} /> : null}

      {onView ? (
        <>
          <ProofDivider />
          <Pressable
            accessibilityRole="button"
            onPress={onView}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: SP.sm,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: SP.sm }}>
              <FileText size={18} color={C.primaryText} />
              <Text style={{ fontSize: 14, fontWeight: "700", color: C.primaryText }}>View full receipt</Text>
            </View>
            <ChevronRight size={18} color={C.primaryText} />
          </Pressable>
        </>
      ) : null}
    </ProofCardShell>
  );
}
