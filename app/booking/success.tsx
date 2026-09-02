// app/booking/success.tsx — booking submitted confirmation (screen 114)
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, SP, RADIUS, TYPE, FONT, peso, kg } from "@/theme/tokens";
import { Button } from "@/components";
import { CircleCheck } from "@/theme/icons";
import { useBookingStore } from "@/stores/bookingStore";
import type { BookingServiceLine } from "@/stores/bookingStore";
import { useProvider, Card, Divider } from "@/features/booking/parts";
import { orderNumber } from "@/features/orders/status";
import { PENDING_PRICE_LABEL } from "@/components/PriceBreakdown";

export default function SuccessStep() {
  const params = useLocalSearchParams<{ orderId?: string; orderNumber?: string }>();
  const orderId = typeof params.orderId === "string" ? params.orderId : "";
  const realOrderNumber = typeof params.orderNumber === "string" && params.orderNumber ? params.orderNumber : null;
  // Same "LB-######" the rest of the app shows — previously a different,
  // unprefixed 6-char slice unique to this one screen.
  const refCode = orderId ? `#${orderNumber(orderId, realOrderNumber)}` : null;

  const s = useBookingStore();
  const { name } = useProvider(s.providerId, s.providerType);

  const isPickup = s.pickupMode !== "CUSTOMER_DROPOFF";
  const isDelivered = s.returnMode !== "CUSTOMER_SELF_PICKUP";

  // Server-authoritative total: the quote already includes platform + pickup +
  // return fees (GAP-P0-005). No client fee math.
  const estimatedTotal = s.quote?.estimatedTotalCentavos ?? 0;

  const lineAmount = (l: BookingServiceLine): string => {
    if (l.estimatedWeightKg != null) return `Est. ${kg(l.estimatedWeightKg)}`;
    if (l.estimatedPieceCount != null) return `${l.estimatedPieceCount} item${l.estimatedPieceCount === 1 ? "" : "s"}`;
    return "Amount at pickup";
  };

  const paymentLabel = s.paymentMethod === "CASH" ? "Cash at weigh-in" : s.paymentMethod === "EWALLET_OUTSIDE_APP" ? "E-wallet transfer at weigh-in" : "—";
  const pickupDay = s.pickupDate
    ? new Date(`${s.pickupDate}T00:00:00`).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" })
    : null;
  const pickupText =
    s.pickupMode === "CUSTOMER_DROPOFF"
      ? "Drop off at branch"
      : [
          pickupDay,
          s.pickupTier === "SCHEDULED_PAID" ? "Priority pickup" : "Batched pickup",
        ]
          .filter(Boolean)
          .join(" · ") || "Scheduled";

  const nextSteps: string[] = [
    `${name} reviews and accepts your booking`,
    isPickup ? "We collect your laundry on your chosen day" : "You drop your laundry off at the branch",
    "It's weighed, the final price is confirmed, and you choose to pay then or when it comes back",
    isDelivered ? "Washed, then delivered back to you" : "Washed — we notify you when it's ready to collect",
  ];

  const goToOrder = () => {
    s.reset();
    if (orderId) router.replace(`/orders/${orderId}`);
    else router.replace("/(tabs)");
  };
  const goHome = () => {
    s.reset();
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top", "bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: SP.screen, paddingTop: SP["3xl"], paddingBottom: SP.xl }}
      >
        <View style={{ alignItems: "center" }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: C.successTint,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircleCheck size={52} color={C.success} strokeWidth={2} />
          </View>
          <Text style={{ ...TYPE.pageTitle, marginTop: SP.lg, textAlign: "center" }}>Booking submitted!</Text>
          <Text style={{ fontSize: 15, color: C.textSecondary, textAlign: "center", lineHeight: 22, marginTop: SP.sm }}>
            We've sent your booking to {name}.
          </Text>
        </View>

        {refCode ? (
          <View style={{ marginTop: SP.base, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: SP.xs, backgroundColor: C.surfaceAlt, borderRadius: RADIUS.pill, paddingHorizontal: SP.md, paddingVertical: 6 }}>
            <Text style={{ fontSize: 12.5, color: C.textMuted }}>Reference</Text>
            <Text style={{ fontFamily: FONT.mono, fontSize: 14, fontWeight: "800", color: C.ink }}>{refCode}</Text>
          </View>
        ) : null}

        <Card style={{ marginTop: SP.lg }}>
          {s.serviceLines.map((l, i) => (
            <View key={l.serviceRefId}>
              {i > 0 ? <Divider /> : null}
              <Row label={l.serviceName} value={lineAmount(l)} />
            </View>
          ))}
          <Divider />
          <Row label="Pickup" value={pickupText} />
          <Divider />
          <Row label="Payment" value={paymentLabel} />
          <Divider />
          {/* Same wording as checkout and the order detail — an order still
              waiting to be weighed has no total, and "₱0" reads as free. */}
          <Row
            label="Estimated total"
            value={estimatedTotal === 0 ? PENDING_PRICE_LABEL : peso(estimatedTotal)}
            emphasize
          />
        </Card>

        {/* What happens next */}
        <Text style={{ ...TYPE.label, marginTop: SP.xl, marginBottom: SP.md }}>What happens next</Text>
        <Card>
          {nextSteps.map((step, i) => (
            <View key={step} style={{ flexDirection: "row", alignItems: "flex-start", gap: SP.md, paddingVertical: SP.sm }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.primaryTint, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: C.primaryText }}>{i + 1}</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 13.5, color: C.ink, lineHeight: 20 }}>{step}</Text>
            </View>
          ))}
        </Card>

        <Text style={{ fontSize: 13, color: C.textMuted, textAlign: "center", marginTop: SP.lg, lineHeight: 19 }}>
          Most providers respond within 15 minutes
        </Text>
      </ScrollView>

      <View style={{ paddingHorizontal: SP.screen, paddingTop: SP.md, paddingBottom: SP.base, gap: SP.md }}>
        <Button label="Track my booking" onPress={goToOrder} fullWidth size="lg" />
        <Button label="Back to Home" variant="outline" onPress={goHome} fullWidth size="lg" />
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value, emphasize }: Readonly<{ label: string; value: string; emphasize?: boolean }>) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: SP.md, gap: SP.md }}>
      <Text style={{ fontSize: 14, color: C.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: emphasize ? 16 : 14, fontWeight: emphasize ? "700" : "600", color: C.ink, flexShrink: 1, textAlign: "right" }}>
        {value}
      </Text>
    </View>
  );
}
