// src/services/trackingMath.ts
// Pure geometry helpers for route-aware live tracking (spec §6–§7): project a
// GPS point onto the active route polyline so the marker snaps to the road, and
// search only a window of nearby segments for performance + correctness where a
// route crosses the same road twice.
import type { LatLng } from "@/components";

const R = 6371000; // earth radius, metres
const RAD = Math.PI / 180;

export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = (b.latitude - a.latitude) * RAD;
  const dLng = (b.longitude - a.longitude) * RAD;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * RAD) * Math.cos(b.latitude * RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

// Local equirectangular XY (metres) relative to a reference point — accurate
// enough for the short segments involved in projection.
function toXY(p: LatLng, ref: LatLng) {
  return {
    x: (p.longitude - ref.longitude) * RAD * R * Math.cos(ref.latitude * RAD),
    y: (p.latitude - ref.latitude) * RAD * R,
  };
}

function lerp(a: LatLng, b: LatLng, t: number): LatLng {
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * t,
    longitude: a.longitude + (b.longitude - a.longitude) * t,
  };
}

// Project p onto segment a→b. Returns the closest point, its parameter t∈[0,1],
// and the perpendicular distance in metres.
function projectOnSegment(p: LatLng, a: LatLng, b: LatLng): { coord: LatLng; t: number; dist: number } {
  const A = toXY(a, a);
  const B = toXY(b, a);
  const P = toXY(p, a);
  const abx = B.x - A.x, aby = B.y - A.y;
  const len2 = abx * abx + aby * aby;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((P.x - A.x) * abx + (P.y - A.y) * aby) / len2));
  const coord = lerp(a, b, t);
  return { coord, t, dist: haversineMeters(p, coord) };
}

export interface RouteMatch {
  coord: LatLng; // point on the route nearest to p
  index: number; // segment start index
  t: number;     // position within the segment [0,1]
  dist: number;  // metres from p to the route
}

// Match p onto `route`, searching only segments [fromIndex-back, fromIndex+ahead]
// so we don't rescan the whole polyline and don't jump to a far-away crossing.
export function matchToRoute(
  p: LatLng,
  route: LatLng[],
  fromIndex: number,
  back = 5,
  ahead = 30,
): RouteMatch | null {
  if (route.length < 2) return null;
  const start = Math.max(0, fromIndex - back);
  const end = Math.min(route.length - 2, fromIndex + ahead);
  let best: RouteMatch | null = null;
  for (let i = start; i <= end; i++) {
    const proj = projectOnSegment(p, route[i], route[i + 1]);
    if (!best || proj.dist < best.dist) best = { coord: proj.coord, index: i, t: proj.t, dist: proj.dist };
  }
  return best;
}

// Compass bearing a→b in degrees [0,360).
export function bearing(a: LatLng, b: LatLng): number {
  const y = Math.sin((b.longitude - a.longitude) * RAD) * Math.cos(b.latitude * RAD);
  const x =
    Math.cos(a.latitude * RAD) * Math.sin(b.latitude * RAD) -
    Math.sin(a.latitude * RAD) * Math.cos(b.latitude * RAD) * Math.cos((b.longitude - a.longitude) * RAD);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}
