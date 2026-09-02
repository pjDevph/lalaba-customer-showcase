// src/hooks/useAnimatedLatLng.ts
// Interpolates a coordinate toward each new target over ~the update interval,
// emitting the in-between positions (~20fps). Used so the courier marker AND the
// remaining-route head can be driven by the SAME animated coordinate — the line
// then trims exactly at the marker as it advances, with no desync.
import { useEffect, useRef, useState } from "react";
import type { LatLng } from "@/components";

export function useAnimatedLatLng(target: LatLng | null, durationMs = 7800): LatLng | null {
  const [pos, setPos] = useState<LatLng | null>(target);
  const posRef = useRef<LatLng | null>(target);
  const fromRef = useRef<LatLng | null>(target);
  const toRef = useRef<LatLng | null>(target);
  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!target) return;
    // First fix: snap, don't animate from nowhere.
    if (!posRef.current) {
      posRef.current = target;
      fromRef.current = target;
      toRef.current = target;
      setPos(target);
      return;
    }
    fromRef.current = posRef.current; // animate from where we currently are
    toRef.current = target;
    startRef.current = Date.now();
    let lastEmit = 0;

    const tick = () => {
      const now = Date.now();
      const t = Math.min(1, (now - startRef.current) / durationMs);
      const a = fromRef.current as LatLng;
      const b = toRef.current as LatLng;
      const cur = {
        latitude: a.latitude + (b.latitude - a.latitude) * t,
        longitude: a.longitude + (b.longitude - a.longitude) * t,
      };
      posRef.current = cur;
      if (now - lastEmit > 50) { lastEmit = now; setPos(cur); } // throttle to ~20fps
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else setPos(cur);
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target?.latitude, target?.longitude, durationMs]);

  return pos;
}
