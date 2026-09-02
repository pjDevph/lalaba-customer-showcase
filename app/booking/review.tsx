// app/booking/review.tsx — Step 3 of 3: review + payment + submit.
// Combines the payment choice, instructions, price breakdown, and final confirm
// into one screen — the last of the 3-step flow.
import React from "react";
import { Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { C, SP, RADIUS, kg } from "@/theme/tokens";
import { PriceBreakdown, RadioSelectCard, Chip, type PriceLine } from "@/components";
import { useBookingStore } from "@/stores/bookingStore";
import { useAddressStore } from "@/stores/addressStore";
import { useNotificationStore } from "@/stores/notificationStore";
import type { FulfillmentReturnMode, DeliverySubMode, FulfillmentPickupMode } from "@/types/api";
import {
  WizardScreen,
  useProvider,
  Card,
  SectionLabel,
  EditableRow,
  EditLink,
  Divider,
  Initials,
  MutedNote,
  AddressPrompt,
} from "@/features/booking/parts";
import { pricingViewOf } from "@/lib/pricingLines";
import { VoucherPicker } from "@/features/booking/VoucherPicker";
import { promoBasisCentavos } from "@/lib/promoBasis";

const EWALLET_METHODS = ["GCash", "Maya", "QR Ph", "Bank"];

function formatDay(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });
}

function returnLabel(returnMode: FulfillmentReturnMode, sub: DeliverySubMode | null): string {
  if (returnMode === "CUSTOMER_SELF_PICKUP") return "Self-pickup at branch";
  switch (sub) {
    // Retired tier — only reachable on orders placed before speed became a
    // turnaround promise. Kept so those orders still render a real label.
    case "EXPRESS": return "Express delivery (legacy)";
    case "SCHEDULED_PAID": return "Scheduled delivery";
    default: return "Free batch delivery";
  }
}

// A day and a tier, never a time — the provider confirms the hour after
// accepting, so promising one here would be a commitment nobody made.
function pickupLabel(
  mode: FulfillmentPickupMode,
  day: string,
  tier: DeliverySubMode | null,
  addr?: string,
): string {
  if (mode === "CUSTOMER_DROPOFF") return "Drop off at branch";
  const tierLabel = tier === "SCHEDULED_PAID" ? "Priority pickup" : "Batched pickup";
  return [day, tierLabel, addr].filter(Boolean).join(" · ");
}

export default function ReviewStep() {
  const s = useBookingStore();
  const { name, profile } = useProvider(s.providerId, s.providerType);
  const push = useNotificationStore((n) => n.push);

  const addresses = useAddressStore((a) => a.addresses);
  const selectedAddressId = useAddressStore((a) => a.selectedAddressId);
  const address = addresses.find((a) => a._id === selectedAddressId) ?? null;
  const addrShort = address ? [address.label, address.address.barangayName].filter(Boolean).join(", ") : undefined;

  const initials = profile?.initials || name.slice(0, 2).toUpperCase();
  const [ewalletChoice, setEwalletChoice] = React.useState<string>(EWALLET_METHODS[0]);
  const [promoInput, setPromoInput] = React.useState("");
  const [pickerOpen, setPickerOpen] = React.useState(false);

  const promoBasis = promoBasisCentavos(s.quote);

  const lineAmount = (l: (typeof s.serviceLines)[number]): string => {
    if (l.estimatedWeightKg != null) return `Est. ${kg(l.estimatedWeightKg)}`;
    if (l.estimatedPieceCount != null) return `${l.estimatedPieceCount} item${l.estimatedPieceCount === 1 ? "" : "s"}`;
    return "Amount confirmed at pickup";
  };

  // Transparent, server-authoritative pricing (GAP-H-015 / GAP-P0-005): every
  // line — service subtotal (platform fee folded in, never itemised), pickup fee,
  // return fee — and the
  // total come straight from the BE quote. No client fee math.
  const { lines, totalCentavos: estimatedTotal }: { lines: PriceLine[]; totalCentavos: number } =
    pricingViewOf(s.quote);

  const onSubmit = async () => {
    if (!address) {
      push({ type: "warning", title: "Add a delivery address", message: "Pick where we should collect and return your laundry." });
      return;
    }
    if (!s.paymentMethod) {
      push({ type: "warning", title: "Choose a payment method", message: "Select how you'll pay the provider." });
      return;
    }
    const order = await s.submit();
    if (order) {
      router.replace({
        pathname: "/booking/success",
        params: { orderId: order._id, orderNumber: order.orderNumber ?? "" },
      });
    } else {
      push({ type: "error", title: "Couldn't submit booking", message: useBookingStore.getState().error ?? "Please try again." });
    }
  };

  const dayLabel = formatDay(s.pickupDate);

  return (
    <WizardScreen
      step={3}
      title="Review and pay"
      subtitle="Check everything before booking"
      estimateCentavos={estimatedTotal}
      estimateLabel="Estimated total"
      ctaLabel="Submit booking"
      ctaLoading={s.isSubmitting}
      ctaDisabled={!address || !s.paymentMethod}
      onContinue={onSubmit}
    >
      <View style={{ gap: SP.base }}>
        {/* Provider + services summary (one row per cart service) */}
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: SP.md }}>
            <Initials text={initials} />
            <Text style={{ flex: 1, fontSize: 15, fontWeight: "700", color: C.ink }}>{name}</Text>
            <EditLink onPress={() => router.push("/booking/service")} />
          </View>
          <View style={{ marginTop: SP.sm, gap: SP.xs }}>
            {s.serviceLines.map((l) => (
              <View key={l.serviceRefId} style={{ paddingTop: SP.xs }}>
                <Text style={{ fontSize: 13.5, fontWeight: "600", color: C.ink }}>
                  {l.serviceName} · <Text style={{ color: C.textMuted, fontWeight: "400" }}>{lineAmount(l)}</Text>
                </Text>
                {l.note?.trim() ? (
                  <Text style={{ fontSize: 12.5, color: C.textSecondary, marginTop: 1 }} numberOfLines={2}>“{l.note.trim()}”</Text>
                ) : null}
              </View>
            ))}
          </View>
        </Card>

        {!address ? <AddressPrompt /> : null}

        {/* Pickup / return (edit → logistics) */}
        <Card>
          <EditableRow label="Pickup" value={pickupLabel(s.pickupMode, dayLabel, s.pickupTier, addrShort)} onEdit={() => router.push("/booking/logistics")} />
          <Divider />
          <EditableRow label="Return" value={returnLabel(s.returnMode, s.deliverySubMode)} onEdit={() => router.push("/booking/logistics")} />
          <Divider />
          <View style={{ paddingTop: SP.md }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: C.ink }}>Instructions</Text>
            <TextInput
              placeholder="e.g. Blue gate, please call on arrival."
              placeholderTextColor={C.textTertiary}
              value={s.instructions.customerGeneralNotes ?? ""}
              onChangeText={(t) => s.setInstructions({ customerGeneralNotes: t })}
              multiline
              style={{
                marginTop: SP.sm, minHeight: 64, backgroundColor: C.surfaceAlt, borderRadius: RADIUS.md,
                borderWidth: 1, borderColor: C.border, paddingHorizontal: SP.base, paddingVertical: SP.md,
                fontSize: 15, color: C.ink, textAlignVertical: "top",
              }}
            />
          </View>
        </Card>

        {/* Payment (inline — was its own step) */}
        <SectionLabel style={{ marginTop: SP.sm }}>Payment · you pay {name} directly</SectionLabel>
        <View style={{ gap: SP.md }}>
          <RadioSelectCard
            title="Cash"
            description="Pay in cash when your laundry is weighed and the final price is confirmed, before pickup."
            selected={s.paymentMethod === "CASH"}
            onPress={() => s.setPaymentMethod("CASH")}
          />
          <RadioSelectCard
            title="E-wallet transfer"
            description="Transfer to the provider's account outside the app once the final price is confirmed at weigh-in."
            selected={s.paymentMethod === "EWALLET_OUTSIDE_APP"}
            onPress={() => s.setPaymentMethod("EWALLET_OUTSIDE_APP")}
          />
          {s.paymentMethod === "EWALLET_OUTSIDE_APP" ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SP.sm, paddingHorizontal: SP.xs }}>
              {EWALLET_METHODS.map((m) => (
                <Chip key={m} label={m} selected={ewalletChoice === m} onPress={() => setEwalletChoice(m)} />
              ))}
            </View>
          ) : null}
        </View>

        {/* When to pay — a real, selectable choice only when the provider has
            opted into Pay Later (merchant Settings → Allow Pay Later). Kept
            separate from the method above: timing and how-you-pay are
            independent choices. */}
        {profile?.allowsPayAtHandover ? (
          <>
            <SectionLabel style={{ marginTop: SP.sm }}>When would you like to pay?</SectionLabel>
            <View style={{ gap: SP.md }}>
              <RadioSelectCard
                title="Pay at pickup"
                description="Pay right away once your laundry is weighed and the final price is confirmed."
                selected={s.paymentTiming === "ON_PICKUP"}
                onPress={() => s.setPaymentTiming("ON_PICKUP")}
              />
              <RadioSelectCard
                title="Pay later"
                description={`No payment now — pay when ${name} brings your laundry back to you.`}
                badge="RECOMMENDED"
                selected={s.paymentTiming === "AT_FINAL_HANDOVER"}
                onPress={() => s.setPaymentTiming("AT_FINAL_HANDOVER")}
              />
            </View>
          </>
        ) : null}

        <MutedNote color={C.textSecondary} style={{ fontSize: 12.5 }}>
          {profile?.allowsPayAtHandover
            ? "Paid in cash or by e-wallet transfer outside the app, once the final price is confirmed at weigh-in. Lalaba never holds your payment."
            : "Payment is collected in cash or via e-wallet transfer outside the app when your laundry is weighed and the final price is confirmed, before pickup. Lalaba never holds your payment."}
        </MutedNote>

        {/* Voucher / promo code */}
        <Card style={{ marginTop: SP.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: C.ink }}>Voucher</Text>
            {/* Offered even when a code is already applied, so swapping one
                voucher for another does not mean removing the first and
                remembering what the second was called. */}
            <Text
              accessibilityRole="button"
              onPress={() => setPickerOpen(true)}
              style={{ fontSize: 13, fontWeight: "700", color: C.primaryText }}
            >
              {s.quote?.promoCode ? "Change" : "Select"}
            </Text>
          </View>
          {s.quote?.promoCode ? (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: SP.sm }}>
              <Text style={{ fontSize: 14, color: C.success, fontWeight: "600" }}>
                {s.quote.promoCode} applied
              </Text>
              <Text
                accessibilityRole="button"
                onPress={() => s.clearPromoCode()}
                style={{ fontSize: 13, color: C.textSecondary, fontWeight: "600" }}
              >
                Remove
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: SP.sm, marginTop: SP.sm, alignItems: "center" }}>
              <TextInput
                placeholder="Enter code"
                placeholderTextColor={C.textTertiary}
                value={promoInput}
                onChangeText={setPromoInput}
                autoCapitalize="characters"
                autoCorrect={false}
                style={{
                  flex: 1, backgroundColor: C.surfaceAlt, borderRadius: RADIUS.md,
                  borderWidth: 1, borderColor: C.border, paddingHorizontal: SP.base, paddingVertical: SP.md,
                  fontSize: 15, color: C.ink,
                }}
              />
              <Text
                accessibilityRole="button"
                onPress={() => {
                  if (!promoInput.trim()) return;
                  void s.applyPromoCode(promoInput);
                  setPromoInput("");
                }}
                style={{
                  fontSize: 14, fontWeight: "700", color: promoInput.trim() ? C.primaryText : C.textTertiary,
                  paddingHorizontal: SP.md, paddingVertical: SP.sm,
                }}
              >
                Apply
              </Text>
            </View>
          )}
          {s.promoError ? (
            <Text style={{ fontSize: 12.5, color: C.error, marginTop: SP.xs }}>{s.promoError}</Text>
          ) : null}
        </Card>

        {/* Price breakdown */}
        <Card style={{ marginTop: SP.sm }}>
          <SectionLabel>Estimated price</SectionLabel>
          <PriceBreakdown lines={lines} totalCentavos={estimatedTotal} totalLabel="Estimated total" />
        </Card>

        <MutedNote color={C.textSecondary} style={{ fontSize: 13 }}>
          The final laundry amount may change once your laundry is actually weighed at pickup.
        </MutedNote>
      </View>

      <VoucherPicker
        visible={pickerOpen}
        orderTotalCentavos={promoBasis}
        onPick={(code) => {
          setPickerOpen(false);
          // Straight into the code field that already existed — the picker
          // fills it in, it does not price anything.
          void s.applyPromoCode(code);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </WizardScreen>
  );
}
