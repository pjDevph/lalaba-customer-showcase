// src/components/StickyBookingFooter.tsx
import React from "react";
import { View, Text, type ViewStyle } from "react-native";
import { C, SP, SHADOW, peso } from "@/theme/tokens";
import { Button } from "./Button";
import { PENDING_PRICE_LABEL } from "./PriceBreakdown";

export interface StickyBookingFooterProps {
  /** Running estimate in centavos (the low end when a range is shown). */
  estimateCentavos?: number;
  /** Optional high end — when set and above estimateCentavos, renders "₱x – ₱y". */
  estimateMaxCentavos?: number;
  estimateLabel?: string;
  /** Secondary caption under the estimate (e.g. "Final price after weighing"). */
  estimateHint?: string;
  ctaLabel: string;
  onPressCta: () => void;
  ctaLoading?: boolean;
  ctaDisabled?: boolean;
  /** Bottom safe-area inset to pad for (px). */
  safeBottom?: number;
  style?: ViewStyle;
}

export function StickyBookingFooter({
  estimateCentavos,
  estimateMaxCentavos,
  estimateLabel = "Estimated total",
  estimateHint,
  ctaLabel,
  onPressCta,
  ctaLoading = false,
  ctaDisabled = false,
  safeBottom = 0,
  style,
}: Readonly<StickyBookingFooterProps>) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: SP.base,
          paddingHorizontal: SP.screen,
          paddingTop: SP.base,
          paddingBottom: SP.base + safeBottom,
          backgroundColor: C.surface,
          borderTopWidth: 1,
          borderTopColor: C.borderSubtle,
          ...SHADOW.lg,
        },
        style,
      ]}
    >
      {typeof estimateCentavos === "number" ? (
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, color: C.textMuted }}>{estimateLabel}</Text>
          <Text style={{ fontSize: 20, fontWeight: "700", color: C.ink }}>
            {typeof estimateMaxCentavos === "number" && estimateMaxCentavos > estimateCentavos
              ? `${peso(estimateCentavos)} – ${peso(estimateMaxCentavos)}`
              // An order whose weight is not known yet quotes zero — there is
              // nothing to price until it is weighed. Printing "₱0" read as a
              // free order, right after step 1 had shown a real range. Shares
              // the constant with PriceBreakdown so checkout and the order
              // detail cannot end up wording it differently.
              : estimateCentavos === 0
                ? PENDING_PRICE_LABEL
                : peso(estimateCentavos)}
          </Text>
          {estimateHint ? <Text style={{ fontSize: 11, color: C.textTertiary }}>{estimateHint}</Text> : null}
        </View>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      <Button
        label={ctaLabel}
        onPress={onPressCta}
        loading={ctaLoading}
        disabled={ctaDisabled}
        size="lg"
        style={{ flexShrink: 0, minWidth: 150 }}
      />
    </View>
  );
}
