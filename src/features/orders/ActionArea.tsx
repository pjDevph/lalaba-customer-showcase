// src/features/orders/ActionArea.tsx
// The status-driven action area of the order-detail screen — the block that
// decides which call-to-action a customer sees for the order's current status.
// Split out of [id].tsx (F2, 600-line limit). Underscore keeps expo-router
// from treating this as a route.
import React from "react";
import { Text, View } from "react-native";
import { C, SP, TYPE, peso, kg } from "@/theme/tokens";
import { Button } from "@/components";
import type { OnlineOrder, FulfillmentReturnMode } from "@/types/api";
import { ActionCard, RowLine } from "@/features/orders/detailParts";
import { displayTotalCentavos, isTrackable, isCancellableEarly } from "@/features/orders/status";

// ─── Action area ──────────────────────────────────────────────────────────────
export interface ActionAreaProps {
  order: OnlineOrder;
  busy: boolean;
  alreadyRated: boolean;
  onApproveChange: (approve: boolean) => void;
  onQualityHold: (approve: boolean) => void;
  onChooseReturn: (mode: FulfillmentReturnMode) => void;
  onScheduleRedelivery: () => void;
  onReschedule: () => void;
  onCancelAfterFailed: () => void;
  onCancel: () => void;
  onTrack: () => void;
  onRate: () => void;
  onBookAgain: () => void;
}

export function ActionArea(props: Readonly<ActionAreaProps>) {
  const { order, busy } = props;
  const status = order.status;

  if (status === "PROVIDER_CHANGE_PROPOSED") {
    return (
      <ActionCard title="Confirm final weight and amount" tone="warning">
        <Text style={{ ...TYPE.body, marginBottom: SP.md, lineHeight: 20 }}>
          {order.provider.providerName} weighed your laundry
          {typeof order.pricing.actualWeightKg === "number" ? ` at ${kg(order.pricing.actualWeightKg)}` : ""}
          {typeof order.pricing.estimatedWeightKg === "number" ? ` (you estimated ${kg(order.pricing.estimatedWeightKg)})` : ""}
          . The final total is {peso(displayTotalCentavos(order))}.
        </Text>
        <View style={{ flexDirection: "row", gap: SP.sm, marginTop: SP.md }}>
          <Button label="Decline" variant="outline" onPress={() => props.onApproveChange(false)} disabled={busy} style={{ flex: 1 }} />
          <Button label="Approve" variant="primary" loading={busy} onPress={() => props.onApproveChange(true)} style={{ flex: 1 }} />
        </View>
      </ActionCard>
    );
  }

  if (status === "LAUNDRY_QUALITY_HOLD" && order.activeQualityHold?.customerResponse === "PENDING") {
    const hold = order.activeQualityHold;
    return (
      <ActionCard title="Quality hold" tone="warning">
        <Text style={{ ...TYPE.body, marginBottom: SP.sm }}>{hold.reason}</Text>
        {hold.additionalChargeCentavos != null ? (
          <RowLine label="Additional charge" value={peso(hold.additionalChargeCentavos)} />
        ) : null}
        <View style={{ flexDirection: "row", gap: SP.sm, marginTop: SP.md }}>
          <Button label="Decline" variant="outline" onPress={() => props.onQualityHold(false)} disabled={busy} style={{ flex: 1 }} />
          <Button label="Approve" variant="primary" loading={busy} onPress={() => props.onQualityHold(true)} style={{ flex: 1 }} />
        </View>
      </ActionCard>
    );
  }

  if (status === "AWAITING_RETURN_SELECTION") {
    return (
      <ActionCard title="How do you want it back?" tone="warning">
        <View style={{ gap: SP.sm, marginTop: SP.xs }}>
          <Button label="Have it delivered" variant="primary" loading={busy} onPress={() => props.onChooseReturn("PROVIDER_DELIVERY")} fullWidth />
          <Button label="I'll pick it up" variant="outline" disabled={busy} onPress={() => props.onChooseReturn("CUSTOMER_SELF_PICKUP")} fullWidth />
        </View>
      </ActionCard>
    );
  }

  if (status === "AWAITING_REDELIVERY_SELECTION") {
    return (
      <ActionCard title="Schedule a redelivery" tone="warning">
        <Text style={{ ...TYPE.meta, marginBottom: SP.sm }}>The last delivery attempt didn't go through.</Text>
        <Button label="Schedule redelivery" variant="primary" loading={busy} onPress={props.onScheduleRedelivery} fullWidth />
      </ActionCard>
    );
  }

  if (status === "AWAITING_PICKUP_RESCHEDULE") {
    return (
      <ActionCard title="Pickup didn't happen" tone="warning">
        <View style={{ gap: SP.sm, marginTop: SP.xs }}>
          <Button label="Reschedule pickup" variant="primary" loading={busy} onPress={props.onReschedule} fullWidth />
          <Button label="Cancel order" variant="outline" disabled={busy} onPress={props.onCancelAfterFailed} fullWidth />
        </View>
      </ActionCard>
    );
  }

  // Non-blocking actions (track, cancel, rate, book again).
  const buttons: React.ReactNode[] = [];
  if (isTrackable(status)) {
    buttons.push(<Button key="track" label="Track" variant="primary" onPress={props.onTrack} fullWidth />);
  }
  if (status === "COMPLETED" && !props.alreadyRated) {
    buttons.push(<Button key="rate" label="Rate provider" variant="primary" onPress={props.onRate} fullWidth />);
  }
  if (status === "COMPLETED" || status === "CANCELLED" || status === "REJECTED_BY_PROVIDER" || status === "REFUNDED") {
    buttons.push(<Button key="again" label="Book again" variant="outline" onPress={props.onBookAgain} fullWidth />);
  }
  if (isCancellableEarly(status)) {
    buttons.push(
      <Button
        key="cancel"
        label="Cancel booking"
        variant="ghost"
        loading={busy}
        onPress={props.onCancel}
        fullWidth
        textStyle={{ color: C.error }}
      />,
    );
  }

  if (buttons.length === 0) return null;
  return <View style={{ gap: SP.sm }}>{buttons}</View>;
}

