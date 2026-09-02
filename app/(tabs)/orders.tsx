// app/(tabs)/orders.tsx
// ─────────────────────────────────────────────────────────────────────────────
// MY ORDERS — the customer's list of online orders, partitioned into
// All / Needs action / Active / Completed tabs. Each order renders an OrderCard
// with the variant + CTAs appropriate to its bucket.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { C, SP, RADIUS, TYPE } from "@/theme/tokens";
import { Search, X, ArrowUpDown, Icon, type IconName } from "@/theme/icons";
import {
  TopBar,
  SegmentedControl,
  Chip,
  OrderCard,
  Button,
  type OrderCardVariant,
  type OrderAction,
  type PaymentStatus,
} from "@/components";
import { useOrdersStore } from "@/stores/ordersStore";
import { useBookingStore } from "@/stores/bookingStore";
import { notify } from "@/stores/notificationStore";
import type { OnlineOrder } from "@/types/api";
import {
  bucketOf,
  statusLabel,
  actionTitle,
  orderNumber,
  cardProviderType,
  displayTotalCentavos,
  serviceSummary,
  formatShortDate,
  isTrackable,
  type OrderBucket,
} from "@/features/orders/status";

type TabKey = "all" | "needsAction" | "active" | "completed";

// The BE's `myOnlineOrders` has no pagination args — it returns the customer's
// full history sorted newest-first. Until that query takes limit/offset we page
// the already-loaded list client-side so the screen never renders hundreds of
// cards at once.
const PAGE_SIZE = 10;

// ─── Search / date / sort ─────────────────────────────────────────────────────
// Date range is an opt-in narrowing: no chip selected means the full history,
// so there's no inert "All time" chip carrying the default.
type RangeKey = "today" | "week" | "30d";
type SortKey = "newest" | "oldest";

const RANGES: readonly { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "30d", label: "Last 30 days" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

// Earliest createdAt a range accepts, in local time. Today/This week are
// calendar-anchored (midnight / Monday midnight); 30 days is a rolling window.
function rangeStart(range: RangeKey, now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (range === "today") return d.getTime();
  if (range === "week") {
    const dow = (d.getDay() + 6) % 7; // Monday = 0
    return d.getTime() - dow * DAY_MS;
  }
  return now - 30 * DAY_MS;
}

// Everything the customer might type: order number, provider, service, status.
function searchHaystack(order: OnlineOrder): string {
  return [
    orderNumber(order._id, order.orderNumber),
    order.provider.providerName,
    serviceSummary(order),
    statusLabel(order.status),
  ]
    .join(" ")
    .toLowerCase();
}

function matchesQuery(order: OnlineOrder, query: string): boolean {
  const q = query.trim().toLowerCase().replace(/^#/, "");
  if (!q) return true;
  return searchHaystack(order).includes(q);
}

function withinRange(order: OnlineOrder, range: RangeKey | null, now: number): boolean {
  if (!range) return true; // no range chip selected — whole history
  if (!order.createdAt) return true; // never hide an order for a missing date
  const created = new Date(order.createdAt).getTime();
  if (Number.isNaN(created)) return true;
  return created >= rangeStart(range, now);
}

function createdMs(order: OnlineOrder): number {
  const t = order.createdAt ? new Date(order.createdAt).getTime() : NaN;
  return Number.isNaN(t) ? 0 : t;
}

const VARIANT: Record<OrderBucket, OrderCardVariant> = {
  needsAction: "actionRequired",
  active: "active",
  completed: "completed",
};

// Maps the BE's resolved paymentStatus (real — computed from paymentTiming +
// paymentSummary + pricing) to the order-card badge. REFUNDED order status
// still overrides everything else.
function paymentStatusFor(order: OnlineOrder): PaymentStatus | undefined {
  if (order.status === "REFUNDED") return "refunded";
  switch (order.paymentStatus) {
    case "PAID": return "paid";
    case "BALANCE_DUE": return "balanceDue";
    case "UNPAID":
      // UNPAID now means two different things. On a Pay Later order the money
      // is genuinely owed and the customer needs to have it ready, so it gets
      // an "Unpaid" badge; before pickup nothing is due yet and a badge would
      // just be noise.
      return order.paymentTiming === "AT_FINAL_HANDOVER" &&
        order.amountDueCentavos > 0
        ? "unpaid"
        : undefined;
    // Any unknown/legacy value falls through to "no badge" rather than crashing.
    default: return undefined;
  }
}

// Board status line per bucket: action copy / "Completed · Jul 28" / plain label.
function cardStatusText(order: OnlineOrder, bucket: OrderBucket): string {
  if (bucket === "needsAction") return actionTitle(order);
  if (bucket === "completed") {
    if (order.status === "COMPLETED") {
      const when = formatShortDate(order.completedAt);
      return when ? `Completed · ${when}` : "Completed";
    }
    return statusLabel(order.status);
  }
  return statusLabel(order.status);
}

export default function OrdersScreen() {
  const orders = useOrdersStore((s) => s.orders);
  const isLoading = useOrdersStore((s) => s.isLoading);
  const error = useOrdersStore((s) => s.error);
  const loadOrders = useOrdersStore((s) => s.loadOrders);
  const startBooking = useBookingStore((s) => s.startBooking);

  const [tab, setTab] = useState<TabKey>("all");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<RangeKey | null>(null);
  const [sort, setSort] = useState<SortKey>("newest");
  // Deliberately separate from the store's `isLoading` — `loadOrders()` is
  // also called from other screens (e.g. the Chat tab's active-order pin),
  // and binding RefreshControl's `refreshing` straight to the shared flag
  // means an unrelated background fetch elsewhere toggles this screen's pull
  // indicator, which can leave it stuck mid-gesture until a real pull fixes
  // it. Only ever set from this screen's own pull gesture below.
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  // The empty-state "Try again" card already surfaces `error` when the list
  // is empty — but a pull-to-refresh on an already-populated list fails
  // silently (the empty-state branch never renders), so the spinner just
  // stops with no sign anything went wrong. Toast it in that case.
  const onRefresh = async () => {
    setRefreshing(true);
    const hadOrders = useOrdersStore.getState().orders.length > 0;
    await loadOrders();
    const err = useOrdersStore.getState().error;
    if (err && hadOrders) notify.error("Couldn't refresh orders", err);
    setRefreshing(false);
  };

  // Search + date range apply across every tab, so the bucket counts shown on
  // the segmented control always match what the tab will actually render.
  const matching = useMemo(() => {
    const now = Date.now();
    const filtered = orders.filter((o) => matchesQuery(o, query) && withinRange(o, range, now));
    // The BE already sorts newest-first; only re-sort when the customer flips it.
    return sort === "oldest" ? [...filtered].sort((a, b) => createdMs(a) - createdMs(b)) : filtered;
  }, [orders, query, range, sort]);

  const buckets = useMemo(() => {
    const byBucket: Record<OrderBucket, OnlineOrder[]> = {
      needsAction: [],
      active: [],
      completed: [],
    };
    for (const o of matching) byBucket[bucketOf(o)].push(o);
    return byBucket;
  }, [matching]);

  const visible = useMemo(() => {
    if (tab === "all") return matching;
    return buckets[tab];
  }, [tab, matching, buckets]);

  const page = useMemo(() => visible.slice(0, shown), [visible, shown]);
  const hasMore = visible.length > page.length;

  const needsActionCount = buckets.needsAction.length;
  const isFiltered = query.trim().length > 0 || range !== null;
  // `isFiltered` keeps the toolbar up when a search has emptied the list —
  // otherwise the controls would vanish along with the results.
  const showControls = orders.length > 0 || isFiltered;

  // Any change to what's being listed rewinds paging to the first page.
  useEffect(() => {
    setShown(PAGE_SIZE);
  }, [tab, query, range, sort]);

  function bookAgain(order: OnlineOrder) {
    startBooking(order.provider.branchId, order.provider.providerType);
    router.push("/booking/service");
  }

  function actionsFor(order: OnlineOrder, bucket: OrderBucket): OrderAction[] {
    const detail = () => router.push(`/orders/${order._id}`);
    if (bucket === "needsAction") {
      return [{ label: "Review and confirm", onPress: detail, variant: "primary" }];
    }
    if (bucket === "active") {
      // While a courier is en route/arrived, lead with live tracking so it's
      // reachable straight from the list (not buried in the order detail).
      if (isTrackable(order.status)) {
        return [
          { label: "Track order", onPress: () => router.push(`/orders/${order._id}/tracking`), variant: "primary" },
          { label: "Open order", onPress: detail, variant: "outline" },
        ];
      }
      return [{ label: "Open order", onPress: detail, variant: "outline" }];
    }
    // completed bucket
    const secondary: OrderAction =
      order.status === "COMPLETED"
        ? { label: "Rate provider", onPress: () => router.push(`/orders/${order._id}/rate`), variant: "outline" }
        : { label: "View receipt", onPress: detail, variant: "outline" };
    return [
      { label: "Book again", onPress: () => bookAgain(order), variant: "primary" },
      secondary,
    ];
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <TopBar title="My orders" />

      {/* Search / tabs / range / sort are all narrowing tools — they're noise on
          an account with nothing to narrow, so a customer with zero orders sees
          only the empty state and its CTA. */}
      {showControls ? (
      <View style={{ paddingHorizontal: SP.screen, paddingTop: SP.sm, paddingBottom: SP.md, gap: SP.sm }}>
        {/* Search — order number, provider, service or status */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: SP.sm,
            height: 44,
            paddingHorizontal: SP.md,
            borderRadius: RADIUS.lg,
            backgroundColor: C.surfaceAlt,
          }}
        >
          <Search size={18} color={C.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search order #, provider or service"
            placeholderTextColor={C.textTertiary}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            style={{ flex: 1, fontSize: 15, color: C.ink, paddingVertical: 0 }}
          />
          {query.length > 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8} onPress={() => setQuery("")}>
              <X size={16} color={C.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <SegmentedControl
          value={tab}
          onChange={(k) => setTab(k as TabKey)}
          options={[
            { key: "all", label: "All" },
            { key: "needsAction", label: "Needs action", count: needsActionCount },
            { key: "active", label: "Active" },
            { key: "completed", label: "Completed" },
          ]}
        />

        {/* Date range (scrolls) + sort (pinned right, never clipped) */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: SP.sm }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flex: 1 }}
            contentContainerStyle={{ gap: SP.sm, alignItems: "center", paddingRight: SP.sm }}
          >
            {RANGES.map((r) => (
              <Chip
                key={r.key}
                label={r.label}
                selected={range === r.key}
                // Tapping the selected chip clears it — back to the full history.
                onPress={() => setRange((cur) => (cur === r.key ? null : r.key))}
              />
            ))}
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={sort === "newest" ? "Sorted newest first — tap for oldest first" : "Sorted oldest first — tap for newest first"}
            onPress={() => setSort((s) => (s === "newest" ? "oldest" : "newest"))}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: SP.xs,
              height: 36,
              paddingHorizontal: SP.md,
              borderRadius: RADIUS.pill,
              borderWidth: 1,
              borderColor: sort === "oldest" ? C.primary : C.border,
              backgroundColor: sort === "oldest" ? C.primaryTint : C.surface,
            }}
          >
            <ArrowUpDown size={14} color={sort === "oldest" ? C.primary : C.textSecondary} />
            <Text style={{ fontSize: 13, fontWeight: "600", color: sort === "oldest" ? C.primary : C.textSecondary }}>
              {sort === "newest" ? "Newest" : "Oldest"}
            </Text>
          </Pressable>
        </View>
      </View>
      ) : null}

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: SP.screen, paddingBottom: SP.xl, gap: SP.md, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={C.primary} />}
      >
        {isFiltered && visible.length > 0 ? (
          <Text style={{ ...TYPE.meta, paddingTop: SP.xs }}>
            {visible.length} matching order{visible.length === 1 ? "" : "s"}
          </Text>
        ) : null}

        {tab === "needsAction" && needsActionCount > 0 ? (
          <View style={{ paddingTop: SP.xs }}>
            <Text style={{ ...TYPE.bodyStrong }}>
              {needsActionCount} order{needsActionCount === 1 ? "" : "s"} {needsActionCount === 1 ? "needs" : "need"} your response
            </Text>
          </View>
        ) : null}

        {error && orders.length === 0 ? (
          <EmptyBlock
            icon="circleAlert"
            title="Couldn't load your orders"
            body={error}
            cta={{ label: "Try again", onPress: () => void loadOrders() }}
          />
        ) : visible.length === 0 ? (
          isFiltered && orders.length > 0 ? (
            <EmptyBlock
              icon="search"
              title="No matching orders"
              body="Try a different search term, or widen the date range."
              cta={{
                label: "Clear filters",
                onPress: () => {
                  setQuery("");
                  setRange(null);
                },
              }}
            />
          ) : (
            <EmptyForTab tab={tab} loading={isLoading} />
          )
        ) : (
          page.map((order) => {
            const bucket = bucketOf(order);
            return (
              <OrderCard
                key={order._id}
                variant={VARIANT[bucket]}
                onPress={() => router.push(`/orders/${order._id}`)}
                actions={actionsFor(order, bucket)}
                data={{
                  id: order._id,
                  orderNumber: `#${orderNumber(order._id, order.orderNumber)}`,
                  providerName: order.provider.providerName,
                  providerType: cardProviderType(order.provider.providerType),
                  statusText: cardStatusText(order, bucket),
                  serviceSummary: serviceSummary(order),
                  amountCentavos: displayTotalCentavos(order),
                  paymentStatus: paymentStatusFor(order),
                }}
              />
            );
          })
        )}

        {hasMore ? (
          <View style={{ alignItems: "center", gap: SP.xs, paddingTop: SP.xs }}>
            <Button
              label="Load more"
              variant="outline"
              size="md"
              onPress={() => setShown((n) => n + PAGE_SIZE)}
              style={{ alignSelf: "center" }}
            />
            <Text style={{ ...TYPE.meta }}>
              Showing {page.length} of {visible.length}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────
function EmptyForTab({ tab, loading }: Readonly<{ tab: TabKey; loading: boolean }>) {
  if (loading) {
    return <EmptyBlock title="Loading your orders…" body="Hang tight for a moment." />;
  }
  switch (tab) {
    case "needsAction":
      return <EmptyBlock icon="circleCheck" title="Nothing needs your attention" body="You're all caught up — no pending requests." />;
    case "active":
      return <EmptyBlock icon="clock" title="No active orders" body="Orders in progress will show up here." />;
    case "completed":
      return <EmptyBlock icon="fileText" title="No completed orders yet" body="Finished orders and receipts live here." />;
    default:
      return (
        <EmptyBlock
          icon="fileText"
          // Deliberately fulfillment-agnostic: "book a service" still reads
          // right once drop-off joins pickup.
          title="No orders yet"
          body="Your laundry orders will appear here once you book a service."
          cta={{ label: "Find a provider", onPress: () => router.push("/(tabs)") }}
        />
      );
  }
}

function EmptyBlock({
  title,
  body,
  cta,
  icon,
}: Readonly<{ title: string; body: string; cta?: { label: string; onPress: () => void }; icon?: IconName }>) {
  return (
    // The extra bottom padding lifts the group off dead-centre to roughly the
    // upper-middle of the viewport, where the eye lands first.
    <View style={{ alignItems: "center", justifyContent: "center", paddingTop: SP.lg, paddingBottom: SP["3xl"] * 2, paddingHorizontal: SP.lg, gap: SP.sm, flex: 1 }}>
      {icon ? (
        <View style={{ marginBottom: SP.xs }}>
          {/* textTertiary at 1.5 stroke all but vanished — one step darker and
              a touch larger reads as deliberate without becoming decoration. */}
          <Icon name={icon} size={36} color={C.textMuted} strokeWidth={1.75} />
        </View>
      ) : null}
      <Text style={{ ...TYPE.subheading, textAlign: "center" }}>{title}</Text>
      <Text style={{ ...TYPE.meta, textAlign: "center", maxWidth: 280 }}>{body}</Text>
      {/* alignSelf beats the parent's alignItems — Button defaults to flex-start. */}
      {cta ? (
        <Button
          label={cta.label}
          onPress={cta.onPress}
          variant="primary"
          size="md"
          style={{ marginTop: SP.sm, alignSelf: "center" }}
        />
      ) : null}
    </View>
  );
}
