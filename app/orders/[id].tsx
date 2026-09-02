// app/orders/[id].tsx
// ─────────────────────────────────────────────────────────────────────────────
// ORDER DETAIL — full state of one online order: status banner, the 5-step
// macro ProgressTimeline, service + fulfillment summary, a PriceBreakdown
// (estimate vs actual), the Lalaba Verify proof cards, and a status-driven
// action area (approve provider change, respond to quality hold, choose return,
// reschedule, cancel, track, rate).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { backOr } from "@/lib/nav";
import { C, SP, TYPE, peso, kg } from "@/theme/tokens";
import { MessageCircle } from "@/theme/icons";
import {
  TopBar,
  ProgressTimeline,
  PriceBreakdown,
  Button,
  WeightProofCard,
  PhotoProofCard,
  PriceAuditCard,
  PaymentAuditCard,
  RiderHandoverCard,
  ReceiptStatusBlock,
  VerifiedBadge,
} from "@/components";
import { confirm } from "@/stores/dialogStore";
import { useOrdersStore } from "@/stores/ordersStore";
import { useBookingStore } from "@/stores/bookingStore";
import { notify } from "@/stores/notificationStore";
import { userErrorMessage } from "@/utils/userError";
import { myRatingForOrder } from "@/services/graphql/ratings";
import { startCourierConversation } from "@/services/graphql/chat";
import {
  statusLabel,
  statusBanner,
  orderNumber,
  displayTotalCentavos,
  serviceSummary,
  formatDateTime,
} from "@/features/orders/status";
import { statusTitleColor, Card, SectionTitle, RowLine } from "@/features/orders/detailParts";
import { buildTimeline, buildPriceLines } from "@/features/orders/detailBuilders";
import { ActionArea } from "@/features/orders/ActionArea";
import { usePoll } from "../../src/hooks/usePoll";
const PICKUP_LABEL = { PROVIDER_PICKUP: "Provider pickup", CUSTOMER_DROPOFF: "You drop off" } as const;
const RETURN_LABEL = { PROVIDER_DELIVERY: "Provider delivery", CUSTOMER_SELF_PICKUP: "You pick up" } as const;

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = String(id);

  const order = useOrdersStore((s) => s.detail[orderId]);
  const timeline = useOrdersStore((s) => s.timelines[orderId]);
  const actionInFlight = useOrdersStore((s) => s.actionInFlight);
  const loadOrder = useOrdersStore((s) => s.loadOrder);
  const loadTimeline = useOrdersStore((s) => s.loadTimeline);
  const startBooking = useBookingStore((s) => s.startBooking);

  const [loading, setLoading] = useState(!order);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [openingWeightChat, setOpeningWeightChat] = useState(false);

  // "Something look off?" nudge (PICKUP_WEIGHED only) — points the customer at
  // the already-working rider chat right when they see the confirmed weight/
  // price, before the rider has collected payment. Reuses the same
  // find-or-create pattern as the tracking screen's Chat button.
  const openWeightChat = async () => {
    if (!order || openingWeightChat) return;
    setOpeningWeightChat(true);
    try {
      const convo = await startCourierConversation(order._id, "PICKUP");
      router.push(`/chat/${convo._id}`);
    } catch (e: unknown) {
      notify.error("Couldn't open chat", userErrorMessage(e, "Please try again."));
    } finally {
      setOpeningWeightChat(false);
    }
  };

  const refresh = useCallback(async () => {
    const loaded = await loadOrder(orderId);
    if (!loaded) setLoadError("We couldn't load this order.");
    else setLoadError(null);
    void loadTimeline(orderId);
    return !!loaded;
  }, [orderId, loadOrder, loadTimeline]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  // Pull-to-refresh — refresh()/loadOrder() already surface a load failure via
  // `loadError` (rendered in the "order not found" empty state below), but
  // that branch only shows when `order` is still unset. Once the order has
  // loaded once, a failed manual refresh needs its own signal — otherwise the
  // spinner just stops with the stale screen still showing, which reads as
  // "stuck" even though the request completed (with an error).
  const onRefresh = async () => {
    setRefreshing(true);
    const ok = await refresh();
    if (!ok) notify.error("Couldn't refresh order", "We couldn't load this order.");
    setRefreshing(false);
  };

  // Poll while the order is live so the progress timeline flips as the provider
  // and courier advance it on their side (the BE has no push channel yet, so
  // both FEs stay in sync by re-reading order status every 10s).
  const TERMINAL_STATUSES = ["COMPLETED", "CANCELLED", "REFUNDED", "DISPUTED"];
  const orderIsLive = !(order?.status && TERMINAL_STATUSES.includes(order.status));
  usePoll(refresh, 10_000, orderIsLive);

  // Hide the rate CTA if a rating already exists.
  useEffect(() => {
    if (order?.status !== "COMPLETED") return;
    let cancelled = false;
    myRatingForOrder(orderId)
      .then((r) => {
        if (!cancelled) setAlreadyRated(!!r);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [orderId, order?.status]);

  // Run a store action, then surface success/failure and refresh the timeline.
  async function runAction(fn: () => Promise<void>, successMsg: string) {
    await fn();
    const err = useOrdersStore.getState().error;
    if (err) {
      notify.error("Something went wrong", err);
    } else {
      notify.success(successMsg);
      void loadTimeline(orderId);
    }
  }

  if (loading && !order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
        <TopBar title="Order" showBack onBack={() => backOr("/(tabs)/orders")} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={C.primaryText} />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
        <TopBar title="Order" showBack onBack={() => backOr("/(tabs)/orders")} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: SP.xl, gap: SP.md }}>
          <Text style={{ ...TYPE.subheading, textAlign: "center" }}>{loadError ?? "Order not found"}</Text>
          <Button label="Try again" onPress={() => void refresh()} variant="primary" />
        </View>
      </SafeAreaView>
    );
  }

  const banner = statusBanner(order);
  const steps = buildTimeline(order);
  const priceLines = buildPriceLines(order);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <TopBar
        title={`Order #${orderNumber(order._id, order.orderNumber)}`}
        subtitleNode={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text
              style={{ fontSize: 12, fontWeight: "400", color: C.textMuted, flexShrink: 1 }}
              numberOfLines={1}
            >
              {order.provider.providerName}
            </Text>
            {order.providerVerified ? (
              <VerifiedBadge verified size={13} showLabel={false} />
            ) : null}
          </View>
        }
        showBack
        onBack={() => backOr("/(tabs)/orders")}
      />

      <ScrollView
        contentContainerStyle={{ padding: SP.screen, paddingBottom: SP["3xl"], gap: SP.base }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={C.primary} />}
      >
        {/* Status header (board: bold title + muted sub-line) */}
        <View style={{ gap: 2 }}>
          <Text style={{ ...TYPE.subheading, color: statusTitleColor(banner.tone) }}>{banner.title}</Text>
          {banner.text ? <Text style={{ ...TYPE.meta }}>{banner.text}</Text> : null}
          {order.status === "PICKUP_WEIGHED" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Something look off? Message your rider"
              onPress={() => void openWeightChat()}
              disabled={openingWeightChat}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: SP.xs }}
            >
              <MessageCircle size={15} color={C.primaryText} />
              <Text style={{ ...TYPE.caption, color: C.primaryText, fontWeight: "600" }}>
                {openingWeightChat ? "Opening…" : "Something look off? Message your rider"}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Progress */}
        <Card>
          <SectionTitle>Order progress</SectionTitle>
          <ProgressTimeline steps={steps} style={{ marginTop: SP.md }} />
        </Card>

        {/* Service summary */}
        <Card>
          <SectionTitle>Service</SectionTitle>
          <Text style={{ ...TYPE.body, marginTop: SP.sm }}>{serviceSummary(order)}</Text>
          {typeof order.pricing.estimatedWeightKg === "number" ? (
            <RowLine label="Estimated weight" value={kg(order.pricing.estimatedWeightKg)} />
          ) : null}
          {typeof order.pricing.actualWeightKg === "number" ? (
            <RowLine label="Actual weight" value={kg(order.pricing.actualWeightKg)} />
          ) : null}
        </Card>

        {/* Fulfillment */}
        <Card>
          <SectionTitle>Fulfillment</SectionTitle>
          <RowLine label="Pickup" value={PICKUP_LABEL[order.fulfillment.pickupMode]} />
          <RowLine label="Return" value={RETURN_LABEL[order.fulfillment.returnMode]} />
          {order.fulfillment.deliverySubMode ? (
            <RowLine label="Delivery" value={order.fulfillment.deliverySubMode.replace(/_/g, " ").toLowerCase()} />
          ) : null}
        </Card>

        {/* Price */}
        <Card>
          <SectionTitle>Price</SectionTitle>
          <PriceBreakdown
            lines={priceLines}
            totalCentavos={displayTotalCentavos(order)}
            totalLabel={
              // "Amount due" on a settled order reads like money is still owed.
              order.amountDueCentavos > 0
                ? "Amount due"
                : order.pricing.customerTotalCentavos != null ||
                    order.pricing.actualServiceTotalCentavos != null
                  ? "Total paid"
                  : "Estimated total"
            }
            style={{ marginTop: SP.xs }}
          />
          {/* Pay Later: say plainly what is still owed and when it is collected,
              so the amount never arrives as a surprise at the door. */}
          {order.amountDueCentavos > 0 && order.paymentTiming === "AT_FINAL_HANDOVER" ? (
            <Text style={{ ...TYPE.caption, color: C.textMuted, marginTop: SP.sm }}>
              You chose to pay later. {peso(order.amountDueCentavos)} is collected when your
              laundry{" "}
              {order.fulfillment.returnMode === "CUSTOMER_SELF_PICKUP"
                ? "is handed over at the shop"
                : "is delivered back to you"}
              .
            </Text>
          ) : null}
        </Card>

        {/* Lalaba Verify proof cards */}
        {typeof order.pricing.actualWeightKg === "number" ? (
          <WeightProofCard
            estimatedKg={order.pricing.estimatedWeightKg ?? undefined}
            actualKg={order.pricing.actualWeightKg}
            weighedAt={formatDateTime(order.updatedAt)}
            // "Recorded", not "Verified": this is the quantity the person who
            // weighed it entered, which nobody counter-checks (§11). Calling it
            // verified implied an audit that does not happen.
            statusLabel="Recorded at pickup"
          />
        ) : null}

        {order.pricing.actualServiceTotalCentavos != null || order.pricing.customerTotalCentavos != null ? (
          // Estimate vs final, both fee-inclusive server totals.
          <PriceAuditCard
            estimateCentavos={order.pricing.estimatedTotalCentavos}
            finalCentavos={displayTotalCentavos(order)}
            statusLabel="Server-calculated"
          />
        ) : null}

        {order.pickupProofUrls.length > 0 ? (
          <PhotoProofCard
            label="Pickup handover"
            status="complete"
            photos={order.pickupProofUrls.map((uri, i) => ({
              id: `pickup-${i}`,
              uri,
              caption: "Taken at pickup",
            }))}
          />
        ) : null}

        {order.returnProofUrls.length > 0 ? (
          <PhotoProofCard
            label="Delivery handover"
            status="complete"
            photos={order.returnProofUrls.map((uri, i) => ({
              id: `return-${i}`,
              uri,
              caption: "Taken at delivery",
            }))}
          />
        ) : null}

        {order.paymentSummary?.amountCollectedCentavos != null ? (
          order.paymentStatus === "BALANCE_DUE" ? (
            // A quality-hold surcharge (approved after collection) left a
            // shortfall — be upfront about the extra owed, not silently "Paid".
            <PaymentAuditCard
              method={order.paymentSummary.method === "CASH" ? "cash" : "gcash"}
              amountCentavos={order.amountDueCentavos}
              paidAt={formatDateTime(order.paymentSummary.collectedAt)}
              status="pending"
              statusLabel="Balance due"
            />
          ) : (
            <PaymentAuditCard
              method={order.paymentSummary.method === "CASH" ? "cash" : "gcash"}
              amountCentavos={order.paymentSummary.amountCollectedCentavos}
              reference={order.paymentSummary.referenceId ?? undefined}
              paidAt={formatDateTime(order.paymentSummary.collectedAt)}
            />
          )
        ) : null}
        {/* TO_PAY_ON_DELIVERY removed from the BE schema (GAP-P0-028): payment
            is collected at weigh-in; uncollected orders read UNPAID and simply
            show the Price card's amount due. Unknown/legacy statuses fall
            through the branches above without rendering — never a crash. */}

        {order.pickupAssignment?.completedAt ? (
          <RiderHandoverCard
            staffName="Pickup rider"
            role="Pickup"
            handedAt={formatDateTime(order.pickupAssignment.completedAt)}
          />
        ) : null}
        {order.returnAssignment?.completedAt ? (
          <RiderHandoverCard
            staffName="Return rider"
            role="Return"
            handedAt={formatDateTime(order.returnAssignment.completedAt)}
          />
        ) : null}

        {order.status === "COMPLETED" ? (
          <ReceiptStatusBlock
            receiptNumber={orderNumber(order._id, order.orderNumber)}
            totalCentavos={displayTotalCentavos(order)}
            issuedAt={formatDateTime(order.completedAt)}
          />
        ) : null}

        {/* Action area */}
        <ActionArea
          order={order}
          busy={actionInFlight}
          alreadyRated={alreadyRated}
          onApproveChange={(approve) =>
            runAction(() => useOrdersStore.getState().approveProviderChange(orderId, approve), approve ? "Change approved" : "Change declined")
          }
          onQualityHold={(approve) =>
            runAction(() => useOrdersStore.getState().respondQualityHold(orderId, approve), approve ? "Approved — work will continue" : "Declined")
          }
          onChooseReturn={(mode) =>
            runAction(() => useOrdersStore.getState().chooseReturn(orderId, mode), "Return option saved")
          }
          onScheduleRedelivery={() =>
            runAction(() => useOrdersStore.getState().scheduleRedeliver(orderId), "Redelivery scheduled")
          }
          onReschedule={() =>
            runAction(() => useOrdersStore.getState().reschedule(orderId), "Pickup rescheduled")
          }
          onCancelAfterFailed={() =>
            runAction(() => useOrdersStore.getState().cancelAfterFailed(orderId), "Order cancelled")
          }
          onCancel={() =>
            confirm({
              title: "Cancel booking?",
              message: "This will cancel your laundry order.",
              confirmLabel: "Cancel booking",
              cancelLabel: "Keep order",
              destructive: true,
              onConfirm: () =>
                void runAction(
                  () => useOrdersStore.getState().cancel(orderId, "Cancelled by customer"),
                  "Order cancelled",
                ),
            })
          }
          onTrack={() => router.push(`/orders/${orderId}/tracking`)}
          onRate={() => router.push(`/orders/${orderId}/rate`)}
          onBookAgain={() => {
            startBooking(order.provider.branchId, order.provider.providerType);
            router.push("/booking/service");
          }}
        />

        {timeline && timeline.length > 0 ? (
          <Text style={{ ...TYPE.caption, textAlign: "center", marginTop: SP.sm }}>
            Last update {formatDateTime(timeline[timeline.length - 1]?.createdAt)} · {statusLabel(order.status)}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

