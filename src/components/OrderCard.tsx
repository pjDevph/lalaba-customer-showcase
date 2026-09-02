// src/components/OrderCard.tsx
import React from "react";
import { Pressable, Text, View, type ViewStyle } from "react-native";
import { C, FONT, RADIUS, SP, SHADOW, peso } from "@/theme/tokens";
import { Badge } from "./Badge";
import { Button } from "./Button";
import type { ProviderType } from "./ProviderCard";
import { PENDING_PRICE_LABEL } from "./PriceBreakdown";

export type OrderCardVariant = "actionRequired" | "active" | "completed";
export type PaymentStatus = "paid" | "unpaid" | "refunded" | "pending" | "balanceDue";

export interface OrderAction {
  label: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "ghost";
}

export interface OrderCardData {
  id: string;
  /** Human order number, e.g. "LAL-20482". */
  orderNumber: string;
  providerName: string;
  providerType: ProviderType;
  statusText: string;
  serviceSummary?: string;
  /** Total in centavos. */
  amountCentavos?: number;
  paymentStatus?: PaymentStatus;
}

export interface OrderCardProps {
  data: OrderCardData;
  variant?: OrderCardVariant;
  onPress?: () => void;
  actions?: OrderAction[];
  style?: ViewStyle;
}

const PAYMENT_LABEL: Record<PaymentStatus, { label: string; tone: "success" | "warning" | "neutral" | "error" }> = {
  paid: { label: "Paid", tone: "success" },
  unpaid: { label: "Unpaid", tone: "warning" },
  pending: { label: "Payment pending", tone: "warning" },
  refunded: { label: "Refunded", tone: "neutral" },
  balanceDue: { label: "Balance due", tone: "error" },
};

export function OrderCard({ data, variant = "active", onPress, actions, style }: Readonly<OrderCardProps>) {
  const isWasher = data.providerType === "homeWasher";
  const accentBorder = variant === "actionRequired" ? C.warning : undefined;
  const pay = data.paymentStatus ? PAYMENT_LABEL[data.paymentStatus] : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={!onPress}
      style={[
        {
          backgroundColor: C.surface,
          borderRadius: RADIUS.xl,
          borderWidth: 1,
          borderColor: C.border,
          padding: SP.lg,
          overflow: "hidden",
          ...SHADOW.sm,
        },
        style,
      ]}
    >
      {accentBorder ? (
        <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, backgroundColor: accentBorder }} />
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SP.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: SP.sm }}>
          <Badge preset={isWasher ? "VERIFIED_HOME_WASHER" : "LAUNDROMAT"} />
          {variant === "actionRequired" ? <Badge preset="ACTION_REQUIRED" /> : null}
        </View>
        <Text style={{ fontFamily: FONT.mono, fontSize: 12, color: C.textMuted }}>{data.orderNumber}</Text>
      </View>

      <Text style={{ fontSize: 16, fontWeight: "700", color: C.ink, marginTop: SP.sm }}>{data.providerName}</Text>
      <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>{data.statusText}</Text>
      {data.serviceSummary ? (
        <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>{data.serviceSummary}</Text>
      ) : null}

      {typeof data.amountCentavos === "number" || pay ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: SP.md }}>
          {typeof data.amountCentavos === "number" ? (
            // Same wording as checkout, the order detail and the success
            // screen. An order still waiting to be weighed has no total, and
            // "₱0" on a card reads as a free wash.
            <Text
              style={{
                fontSize: data.amountCentavos === 0 ? 14 : 18,
                fontWeight: "700",
                color: data.amountCentavos === 0 ? C.textMuted : C.ink,
              }}
            >
              {data.amountCentavos === 0 ? PENDING_PRICE_LABEL : peso(data.amountCentavos)}
            </Text>
          ) : (
            <View />
          )}
          {pay ? <Badge label={pay.label} tone={pay.tone} /> : null}
        </View>
      ) : null}

      {actions && actions.length > 0 ? (
        <View style={{ flexDirection: "row", gap: SP.sm, marginTop: SP.base }}>
          {actions.map((a) => (
            <Button
              key={a.label}
              label={a.label}
              onPress={a.onPress}
              variant={a.variant ?? "outline"}
              size="md"
              style={{ flex: 1 }}
            />
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}
