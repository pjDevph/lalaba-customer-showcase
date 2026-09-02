// app/orders/[id]/tracking.tsx
// ─────────────────────────────────────────────────────────────────────────────
// LIVE TRACKING — map-dominant view for an in-flight pickup/return leg, with a
// bottom sheet-style card (rider, order #, ETA copy, Call/Chat affordances).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { C, SP, RADIUS, SHADOW, TYPE } from "@/theme/tokens";
import { Phone, MessageCircle, Navigation as NavigationIcon } from "@/theme/icons";
import { TopBar, MapView, Badge, type MapRegion, type TrackingMarker, type LatLng, type MapViewHandle } from "@/components";
import { useOrdersStore } from "@/stores/ordersStore";
import { startConversation, startCourierConversation } from "@/services/graphql/chat";
import { fetchRoute, type Route } from "@/services/routing";
import { matchToRoute, haversineMeters } from "@/services/trackingMath";
import { useCourierTracking, type TrackingStatus } from "@/hooks/useCourierTracking";
import { useAnimatedLatLng } from "@/hooks/useAnimatedLatLng";
import { notify } from "@/stores/notificationStore";
import { userErrorMessage } from "@/utils/userError";
import type { OnlineOrder } from "@/types/api";
import { statusLabel, orderNumber, serviceSummary } from "@/features/orders/status";
import { usePoll } from "../../../src/hooks/usePoll";

// Metro Manila fallback if the order has no geo yet.
const FALLBACK: LatLng = { latitude: 14.5995, longitude: 120.9842 };

function staffMarkerFrom(order: OnlineOrder): LatLng | null {
  const isReturn = order.status === "RETURN_EN_ROUTE" || order.status === "RETURN_ARRIVED";
  const leg = isReturn ? order.returnAssignment : order.pickupAssignment;
  // Prefer the live GPS ping streamed by the courier's app.
  if (leg?.locationLat != null && leg?.locationLng != null) {
    return { latitude: leg.locationLat, longitude: leg.locationLng };
  }
  // Fall back to the last attempt's captured GPS (e.g. a failed-attempt event).
  const attempts = isReturn ? order.deliveryAttempts : order.pickupAttempts;
  const last = attempts?.[attempts.length - 1];
  if (last?.gpsLat != null && last?.gpsLng != null) {
    return { latitude: last.gpsLat, longitude: last.gpsLng };
  }
  return null;
}

// Location-freshness pill (spec §10): live · updating · offline.
// "delayed" (10–20s since the last GPS fix) is routine jitter given the 8s
// poll interval — it reads visually as "Live" so ordinary polling cadence
// doesn't look like a broken connection. Only "stale" (20–40s), where the
// position is genuinely behind, gets the amber "Updating…" treatment.
const FRESHNESS: Record<TrackingStatus, { label: string; color: string }> = {
  live: { label: "Live", color: C.success },
  delayed: { label: "Live", color: C.success },
  stale: { label: "Updating…", color: C.warning },
  offline: { label: "Offline", color: C.textTertiary },
};

function FreshnessRow({ status }: Readonly<{ status: TrackingStatus }>) {
  const meta = FRESHNESS[status];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: meta.color }} />
      <Text style={{ ...TYPE.caption, color: C.textSecondary }}>{meta.label}</Text>
    </View>
  );
}

// Fraction of latitudeDelta the visible center is shifted south so the route
// sits in the upper ~60% of the screen instead of centered behind the bottom
// sheet card, which covers roughly the bottom third of the viewport.
const BOTTOM_SHEET_BIAS = 0.22;

// Region that comfortably frames all given points (home + courier), biased so
// the bottom-sheet card doesn't sit on top of the route.
function fitRegion(points: LatLng[]): MapRegion {
  if (points.length === 0) return { ...FALLBACK, latitudeDelta: 0.03, longitudeDelta: 0.03 };
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const latitudeDelta = Math.max((maxLat - minLat) * 2.0, 0.014);
  const longitudeDelta = Math.max((maxLng - minLng) * 2.0, 0.014);
  return {
    latitude: (minLat + maxLat) / 2 - latitudeDelta * BOTTOM_SHEET_BIAS,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta,
    longitudeDelta,
  };
}

export default function TrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const orderId = String(id);
  // Measured, not guessed — the card's content (distance/ETA line, provider
  // summary) varies in height, so the re-center button above it is positioned
  // off the card's real rendered height rather than a hardcoded offset.
  const [cardHeight, setCardHeight] = useState(220);

  const order = useOrdersStore((s) => s.detail[orderId]);
  const loadOrder = useOrdersStore((s) => s.loadOrder);
  const [loading, setLoading] = useState(!order);

  useEffect(() => {
    if (order) return;
    (async () => {
      await loadOrder(orderId);
      setLoading(false);
    })();
  }, [order, orderId, loadOrder]);

  // Live tracking: poll order status every 8s so the map/markers and status
  // follow the courier's leg as it advances (until the order is terminal).
  const TERMINAL_STATUSES = ["COMPLETED", "CANCELLED", "REFUNDED", "DISPUTED"];
  const trackingIsLive = !(order?.status && TERMINAL_STATUSES.includes(order.status));
  usePoll(() => loadOrder(orderId), 8_000, trackingIsLive);

  // Road-following route (free OSRM API, no key), fetched ONCE from the courier's
  // starting position to home and then held stable — the line is trimmed forward
  // as the courier progresses (below), rather than re-fetched every poll (which
  // made the whole polyline jump ahead of the gliding marker). A confirmed
  // reroute would refresh it; that's a deferred follow-up.
  const staffPos = order ? staffMarkerFrom(order) : null;
  const customerPos: LatLng = order?.customer.mapLocation ?? FALLBACK;
  // `routeInfo` carries OSRM's own distance/duration for the whole route
  // alongside the polyline — real routing output, used below to derive a live
  // distance-remaining/ETA figure rather than inventing one.
  const [routeInfo, setRouteInfo] = useState<Route | null>(null);
  const roadRoute = routeInfo?.coordinates ?? null;
  const hasStaff = !!staffPos;
  const routeReqRef = useRef(false);
  useEffect(() => {
    if (routeReqRef.current || !staffPos) return;
    routeReqRef.current = true;
    let cancelled = false;
    void fetchRoute(staffPos, customerPos).then((r) => { if (!cancelled && r) setRouteInfo(r); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStaff]);

  // Tracking engine: validate → filter → project onto the route (forward-only) →
  // freshness. Produces the route-matched target the map animates to; the raw
  // staffPos above is used only for the region fit + route-fetch origin.
  const isReturnLeg = order?.status === "RETURN_EN_ROUTE" || order?.status === "RETURN_ARRIVED";
  const activeLeg = order ? (isReturnLeg ? order.returnAssignment : order.pickupAssignment) : null;
  const tracking = useCourierTracking(activeLeg, roadRoute ?? (staffPos ? [staffPos, customerPos] : []));
  // Coordinate-level glide toward the route-matched target — drives BOTH the
  // marker and the remaining-route head so the line trims exactly at the dot.
  const displayed = useAnimatedLatLng(tracking.target, 7800);

  // Back must work even when this screen was deep-linked (no history to pop) —
  // fall back to the order detail instead of a no-op "GO_BACK not handled".
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(`/orders/${orderId}`);
  };

  // Chat opens (or reuses) the thread with the RIDER on the active leg — the
  // person the customer actually needs while tracking. If no rider is assigned
  // yet, fall back to the shop/washer thread so the button never dead-ends.
  const [openingChat, setOpeningChat] = useState(false);
  const openChat = async () => {
    if (!order || openingChat) return;
    setOpeningChat(true);
    try {
      const convo = activeLeg?.assignedStaffUid
        ? await startCourierConversation(order._id, isReturnLeg ? "RETURN" : "PICKUP")
        : await startConversation(order.provider.branchId, order.provider.providerType, order._id);
      router.push(`/chat/${convo._id}`);
    } catch (e: unknown) {
      notify.error("Couldn't open chat", userErrorMessage(e, "Please try again."));
    } finally {
      setOpeningChat(false);
    }
  };

  // Freeze the map frame once the route is known (fit to the whole journey), so
  // the region does not re-fit (jump) on every poll — only the marker glides
  // within it. Until the route loads, fit live to the points we have.
  const regionRef = useRef<MapRegion | null>(null);
  if (!regionRef.current && roadRoute && roadRoute.length > 1) {
    regionRef.current = fitRegion(roadRoute);
  }
  const mapRef = useRef<MapViewHandle>(null);

  if (loading && !order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
        <TopBar title="Tracking" showBack onBack={goBack} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={C.primaryText} />
        </View>
      </SafeAreaView>
    );
  }

  const customer = customerPos;
  const staff = staffPos;

  // Frozen once both endpoints are known (regionRef); until then, fit to what we have.
  const region: MapRegion = regionRef.current ?? fitRegion([customer, ...(staff ? [staff] : [])]);

  // The marker follows the smoothly-animated, route-matched position.
  const riderCoord = displayed ?? tracking.target ?? staff;
  const markers: TrackingMarker[] = [
    { id: "customer", coordinate: customer, kind: "customer", label: "You" },
    ...(riderCoord ? [{ id: "staff", coordinate: riderCoord, kind: "staff" as const, label: "Rider", heading: tracking.heading }] : []),
  ];
  // Remaining road AHEAD only: start the line at the animated marker position and
  // draw forward to home. As the marker advances, the traveled part behind it
  // disappears (no leftover trail), and the head stays glued to the dot.
  const route: LatLng[] = (() => {
    if (roadRoute && roadRoute.length > 1 && riderCoord) {
      const m = matchToRoute(riderCoord, roadRoute, 0, 0, roadRoute.length);
      const idx = m ? m.index : 0;
      return [riderCoord, ...roadRoute.slice(idx + 1)];
    }
    return riderCoord ? [riderCoord, customer] : [];
  })();

  // Distance/ETA remaining — real numbers, not fabricated: the polyline sum
  // below is the actual road-following remaining distance (only computed once
  // a real OSRM route has loaded, never from the straight-line fallback), and
  // the ETA scales OSRM's own whole-route duration by that remaining fraction
  // rather than guessing a speed.
  const remainingMeters =
    roadRoute && roadRoute.length > 1 && route.length > 1
      ? route.reduce((sum, p, i) => (i === 0 ? sum : sum + haversineMeters(route[i - 1], p)), 0)
      : null;
  const avgSpeedMps =
    routeInfo && routeInfo.durationSeconds > 0 ? routeInfo.distanceMeters / routeInfo.durationSeconds : null;
  const etaMinutes =
    remainingMeters != null && avgSpeedMps
      ? Math.max(1, Math.round(remainingMeters / avgSpeedMps / 60))
      : null;
  const distanceLabel =
    remainingMeters == null ? null
    : remainingMeters >= 1000 ? `${(remainingMeters / 1000).toFixed(1)} km away`
    : `${Math.max(10, Math.round(remainingMeters / 10) * 10)} m away`;

  const isReturn = order?.status === "RETURN_EN_ROUTE" || order?.status === "RETURN_ARRIVED";
  const etaCopy = order
    ? order.status.endsWith("ARRIVED")
      ? "Your rider has arrived."
      : isReturn
        ? "Your clean laundry is on the way back to you."
        : "Your rider is on the way to collect your laundry."
    : "";
  const showDistance =
    order && !order.status.endsWith("ARRIVED") && tracking.status !== "offline" && distanceLabel != null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <TopBar title="Live tracking" showBack onBack={goBack} />

      <View style={{ flex: 1 }}>
        <MapView
          ref={mapRef}
          mode="liveTracking"
          region={region}
          markers={markers}
          route={route}
          height={undefined}
          style={{ flex: 1, borderRadius: 0, borderWidth: 0 }}
        />

        {/* Re-center — the map never auto-recenters once framed (so the user
            keeps control while panning/zooming); this gives a way back to a
            fresh fit on the rider + home without fighting that. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Re-center map"
          onPress={() => mapRef.current?.recenter(fitRegion(riderCoord ? [riderCoord, customer] : [customer]))}
          style={{
            position: "absolute",
            right: SP.screen,
            bottom: cardHeight + SP.md * 2 + insets.bottom,
            width: 44,
            height: 44,
            borderRadius: RADIUS.pill,
            backgroundColor: C.surface,
            borderWidth: 1,
            borderColor: C.border,
            alignItems: "center",
            justifyContent: "center",
            ...SHADOW.md,
          }}
        >
          <NavigationIcon size={20} color={C.primaryText} strokeWidth={2} />
        </Pressable>

        {/* Bottom sheet card */}
        <View
          onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}
          style={{
            position: "absolute",
            left: SP.screen,
            right: SP.screen,
            bottom: SP.md + insets.bottom,
            backgroundColor: C.surface,
            borderRadius: RADIUS["2xl"],
            borderWidth: 1,
            borderColor: C.border,
            padding: SP.lg,
            gap: SP.sm,
            ...SHADOW.lg,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Badge label={order ? statusLabel(order.status) : "Tracking"} tone="brand" />
            {order ? <Text style={{ ...TYPE.caption }}>#{orderNumber(order._id, order.orderNumber)}</Text> : null}
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ ...TYPE.subheading }}>{isReturn ? "Return rider" : "Pickup rider"}</Text>
            {showDistance ? (
              <Text style={{ ...TYPE.label, color: C.primaryText }}>
                {distanceLabel}{etaMinutes != null ? ` · ETA ${etaMinutes} min` : ""}
              </Text>
            ) : null}
          </View>
          <Text style={{ ...TYPE.meta }}>
            {tracking.status === "stale" || tracking.status === "offline"
              ? "Driver location temporarily unavailable — showing last known position."
              : etaCopy}
          </Text>
          <FreshnessRow status={tracking.status} />
          {order ? (
            <Text style={{ ...TYPE.meta }}>
              {order.provider.providerName} · {serviceSummary(order)}
            </Text>
          ) : null}

          <View style={{ flexDirection: "row", gap: SP.sm, marginTop: SP.sm }}>
            <ContactButton icon="phone" label="Call" onPress={() => notify.info("Call", "In-app calling connects through a masked number — coming with telephony setup.")} />
            <ContactButton icon="chat" label={openingChat ? "Opening…" : "Chat"} onPress={openChat} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function ContactButton({ icon, label, onPress }: Readonly<{ icon: "phone" | "chat"; label: string; onPress: () => void }>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: SP.sm,
        height: SP.touch,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.surface,
      }}
    >
      {icon === "phone" ? <Phone size={18} color={C.primaryText} /> : <MessageCircle size={18} color={C.primaryText} />}
      <Text style={{ fontSize: 14, fontWeight: "700", color: C.primaryText }}>{label}</Text>
    </Pressable>
  );
}
