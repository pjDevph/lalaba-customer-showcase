// src/components/proof/OTPProofCard.tsx
import React from "react";
import { Text, View, type ViewStyle } from "react-native";
import { C, FONT, RADIUS, SP } from "@/theme/tokens";
import { ProofCardShell, type ProofStatus } from "./ProofCardShell";

export interface OTPProofCardProps {
  /** The handoff/pickup code to show or confirm. */
  code: string;
  /** Instruction line, e.g. "Share this code with your rider at pickup." */
  instruction?: string;
  /** When the code was confirmed (complete state). */
  confirmedAt?: string;
  confirmedBy?: string;
  status?: ProofStatus;
  style?: ViewStyle;
}

export function OTPProofCard({ code, instruction, confirmedAt, confirmedBy, status = "pending", style }: Readonly<OTPProofCardProps>) {
  const chars = code.split("");
  return (
    <ProofCardShell label="Handoff code" icon="shieldCheck" status={status} style={style}>
      {instruction ? (
        <Text style={{ fontSize: 13, color: C.textSecondary, marginBottom: SP.md, lineHeight: 18 }}>{instruction}</Text>
      ) : null}
      <View style={{ flexDirection: "row", gap: SP.sm, justifyContent: "center" }}>
        {chars.map((ch, i) => (
          <View
            key={i}
            style={{
              minWidth: 40,
              height: 52,
              paddingHorizontal: 6,
              borderRadius: RADIUS.md,
              borderWidth: 1.5,
              borderColor: C.primary,
              backgroundColor: C.primaryTint,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontFamily: FONT.mono, fontSize: 24, fontWeight: "700", color: C.primaryText }}>{ch}</Text>
          </View>
        ))}
      </View>
      {confirmedAt || confirmedBy ? (
        <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: SP.md, textAlign: "center" }}>
          {[confirmedBy ? `Confirmed by ${confirmedBy}` : "Confirmed", confirmedAt].filter(Boolean).join(" · ")}
        </Text>
      ) : null}
    </ProofCardShell>
  );
}
