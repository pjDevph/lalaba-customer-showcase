// src/components/PriceBreakdown.tsx
import React from "react";
import { Text, View, type ViewStyle } from "react-native";
import { C, SP, peso } from "@/theme/tokens";

export interface PriceLine {
  label: string;
  /** Amount in centavos. Ignored when `free` is true. */
  amountCentavos?: number;
  /** Renders "Free" instead of an amount. */
  free?: boolean;
  /** Muted secondary line (e.g. a note under a charge). */
  muted?: boolean;
  /** Show amount as a discount (negative, green). */
  discount?: boolean;
  /**
   * The amount is not known yet — renders the pending copy instead of a
   * figure. Set by the BUILDER, not inferred from a zero here: a line that
   * genuinely costs nothing is `free`, and guessing that 0 means "unknown"
   * would eventually mislabel a real zero.
   */
  pending?: boolean;
}

export interface PriceBreakdownProps {
  lines: PriceLine[];
  /** Total in centavos; renders the emphasized total row when provided. */
  totalCentavos?: number;
  totalLabel?: string;
  style?: ViewStyle;
}

/**
 * What an unpriced amount says, everywhere. An order is priced when the
 * laundry is weighed, so until then "₱0" is not a small number — it is the
 * wrong answer, and it reads as free at the moment someone decides to book.
 */
export const PENDING_PRICE_LABEL = "Confirmed at pickup";

export function PriceBreakdown({ lines, totalCentavos, totalLabel = "Total", style }: Readonly<PriceBreakdownProps>) {
  return (
    <View style={style}>
      {lines.map((l, i) => {
        const amountColor = l.discount ? C.success : l.muted ? C.textMuted : C.textPrimary;
        const value = l.pending
          ? PENDING_PRICE_LABEL
          : l.free
            ? "Free"
            : l.discount
              ? `−${peso(Math.abs(l.amountCentavos ?? 0))}`
              : peso(l.amountCentavos ?? 0);
        return (
          <View
            key={`${l.label}-${i}`}
            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: SP.sm, gap: SP.md }}
          >
            <Text style={{ flex: 1, fontSize: 14, color: l.muted ? C.textMuted : C.textSecondary }}>{l.label}</Text>
            <Text style={{ fontSize: 14, fontWeight: l.free ? "700" : "600", color: l.free ? C.success : amountColor }}>
              {value}
            </Text>
          </View>
        );
      })}

      {typeof totalCentavos === "number" ? (
        <>
          <View style={{ height: 1, backgroundColor: C.borderSubtle, marginVertical: SP.sm }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: SP.xs }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: C.ink }}>{totalLabel}</Text>
            <Text style={{ fontSize: totalCentavos === 0 ? 16 : 20, fontWeight: "700", color: C.ink }}>
              {totalCentavos === 0 ? PENDING_PRICE_LABEL : peso(totalCentavos)}
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );
}
