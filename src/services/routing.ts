// src/services/routing.ts
// Free, keyless road routing via the public OSRM demo server — no Google, no API
// key, no billing. One HTTP call returns a road-following polyline between two
// points. Callers fall back to a straight line if this returns null (offline).
import type { LatLng } from "@/components";

export interface Route {
  coordinates: LatLng[];
  /** OSRM's own road-distance/typical-duration for the whole route — real
   *  routing output, not a straight-line guess. Used to derive a live
   *  distance-remaining/ETA figure as the rider progresses (see tracking.tsx). */
  distanceMeters: number;
  durationSeconds: number;
}

export async function fetchRoute(from: LatLng, to: LatLng): Promise<Route | null> {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${from.longitude},${from.latitude};${to.longitude},${to.latitude}` +
      `?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      routes?: { geometry?: { coordinates?: [number, number][] }; distance?: number; duration?: number }[];
    };
    const first = json.routes?.[0];
    const coords = first?.geometry?.coordinates;
    if (!coords?.length || first?.distance == null || first?.duration == null) return null;
    // GeoJSON is [lng, lat]; our LatLng is { latitude, longitude }.
    return {
      coordinates: coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng })),
      distanceMeters: first.distance,
      durationSeconds: first.duration,
    };
  } catch {
    return null;
  }
}
