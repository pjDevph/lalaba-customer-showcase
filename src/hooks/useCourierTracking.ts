// src/hooks/useCourierTracking.ts
// Turns the raw accepted courier fix (from the polled order) into a stable,
// route-matched target the map can animate to — implementing the client half of
// the live-tracking spec: never render raw GPS (§1), lightweight accuracy-weighted
// filter (§4), project onto the route with forward-only progress (§6–§7),
// derive heading (§8), and expose a freshness state (§10). The actual smooth
// interpolation to this target happens in <MapView> (native-driven glide).
import { useEffect, useRef, useState } from "react";
import type { LatLng } from "@/components";
import type { LegAssignment } from "@/types/api";
import { matchToRoute, bearing } from "@/services/trackingMath";
import { usePoll } from "./usePoll";

export type TrackingStatus = "live" | "delayed" | "stale" | "offline";

export interface CourierTracking {
  target: LatLng | null; // route-matched, filtered position for the marker
  heading: number | null;
  status: TrackingStatus;
  offRoute: boolean;
  progressIndex: number; // segment the courier has reached (forward-only) — used to trim the drawn route
}

const OFF_ROUTE_M = 60;

function freshness(atIso: string | null): TrackingStatus {
  if (!atIso) return "offline";
  const age = (Date.now() - new Date(atIso).getTime()) / 1000;
  if (age <= 10) return "live";
  if (age <= 20) return "delayed";
  if (age <= 40) return "stale";
  return "offline";
}

export function useCourierTracking(leg: LegAssignment | null, route: LatLng[]): CourierTracking {
  const [out, setOut] = useState<CourierTracking>({ target: null, heading: null, status: "offline", offRoute: false, progressIndex: 0 });

  const filteredRef = useRef<LatLng | null>(null);
  const prevFilteredRef = useRef<LatLng | null>(null);
  const segIdxRef = useRef(0);
  const lastSeqRef = useRef<number | null>(null);

  // Re-route: a new polyline (from the courier's live position) resets progress.
  const routeKey = route.length ? `${route.length}:${route[0].latitude.toFixed(4)},${route[0].longitude.toFixed(4)}` : "";
  useEffect(() => { segIdxRef.current = 0; }, [routeKey]);

  const seq = leg?.locationSequence ?? null;
  const at = leg?.locationAt ?? null;
  const hasFix = leg?.locationLat != null && leg?.locationLng != null;

  // Recompute the target only when a NEW accepted fix arrives (seq/time change);
  // re-filtering the same fix each poll would make the marker drift.
  useEffect(() => {
    if (!hasFix || !leg) {
      setOut((o) => ({ ...o, status: freshness(at), progressIndex: segIdxRef.current }));
      return;
    }
    const raw: LatLng = { latitude: leg.locationLat as number, longitude: leg.locationLng as number };
    const isNew = lastSeqRef.current == null || (seq != null && seq > lastSeqRef.current);
    if (isNew) {
      lastSeqRef.current = seq;
      const acc = leg.locationAccuracy ?? undefined;
      const w = acc != null && acc <= 20 ? 0.8 : 0.4; // trust good fixes more
      const prev = filteredRef.current;
      prevFilteredRef.current = prev;
      filteredRef.current = prev
        ? {
            latitude: prev.latitude + (raw.latitude - prev.latitude) * w,
            longitude: prev.longitude + (raw.longitude - prev.longitude) * w,
          }
        : raw;
    }
    const filtered = filteredRef.current ?? raw;

    let target: LatLng = filtered;
    let offRoute = false;
    const m = matchToRoute(filtered, route, segIdxRef.current);
    if (m) {
      segIdxRef.current = Math.max(segIdxRef.current, m.index); // forward-only
      target = m.coord;
      offRoute = m.dist > OFF_ROUTE_M;
    }
    const heading =
      leg.locationHeading ?? (prevFilteredRef.current ? bearing(prevFilteredRef.current, filtered) : null);

    setOut({ target, heading, status: freshness(at), offRoute, progressIndex: segIdxRef.current });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq, at, hasFix]);

  // Freshness ticker: downgrade live→delayed→stale→offline even when no new fix.
  // No network — this only re-derives live/delayed/stale/offline from the
  // timestamp we already hold. Routed through usePoll anyway so it stops with
  // the rest of the screen; on refocus usePoll ticks immediately, so the
  // status is correct before the first frame rather than up to 3s stale.
  usePoll(() => {
    setOut((o) => {
      const s = freshness(at);
      return s === o.status ? o : { ...o, status: s };
    });
  }, 3000);

  return out;
}
