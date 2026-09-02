// src/components/MapView.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Thin, typed wrapper over `react-native-maps`. It always renders REAL Google
// Maps tiles with Google's own map styling (PROVIDER_GOOGLE on both platforms,
// no customMapStyle) — and there is no schematic/offline stand-in map: a fake
// map misleads a customer watching a courier. Three modes:
// pricePins | serviceArea | liveTracking.
//
// Requires the platform Google Maps key (src/config/maps.ts → app.config.ts →
// Info.plist / AndroidManifest at prebuild). Missing key ⇒ Google renders blank
// tiles, which is a build-config error, not a runtime state to design around.
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { C, RADIUS, SP, peso } from "@/theme/tokens";
import { MapPin, Navigation } from "@/theme/icons";

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface MapRegion extends LatLng {
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface PricePin {
  id: string;
  coordinate: LatLng;
  /** Price in centavos, rendered inside the pin. */
  priceCentavos: number;
  selected?: boolean;
  onPress?: () => void;
}

export interface TrackingMarker {
  id: string;
  coordinate: LatLng;
  kind: "customer" | "staff";
  label?: string;
  /** Compass bearing in degrees [0,360) — rotates the "staff" marker into a
   *  directional arrow instead of a plain dot. Real GPS-derived heading (see
   *  useCourierTracking), omitted (not fabricated) when no fix has a heading yet. */
  heading?: number | null;
}

/** Imperative handle so a caller can recenter the camera on demand (e.g. a
 *  "recenter" button) without the component re-fitting the region itself on
 *  every poll, which would fight the user's own pan/zoom. */
export interface MapViewHandle {
  recenter: (region: MapRegion) => void;
}

export type MapMode = "pricePins" | "serviceArea" | "liveTracking";

export interface MapViewProps {
  mode: MapMode;
  region: MapRegion;
  height?: number;
  /** pricePins mode. */
  pins?: PricePin[];
  /** serviceArea mode: shaded circle center + radius (meters). */
  areaCenter?: LatLng;
  areaRadiusMeters?: number;
  /** liveTracking mode. */
  route?: LatLng[];
  markers?: TrackingMarker[];
  /** Skip the native map (tests / snapshotting only). */
  forcePlaceholder?: boolean;
  style?: ViewStyle;
}

// Attempt to load native maps once. Any failure → null → placeholder.
interface NativeMaps {
  MapView: React.ComponentType<Record<string, unknown>>;
  Marker: React.ComponentType<Record<string, unknown>>;
  Circle: React.ComponentType<Record<string, unknown>>;
  Polyline: React.ComponentType<Record<string, unknown>>;
  PROVIDER_GOOGLE?: unknown;
}

function loadNativeMaps(): NativeMaps | null {
  try {
     
    const mod = require("react-native-maps") as {
      default?: NativeMaps["MapView"];
      Marker?: NativeMaps["Marker"];
      Circle?: NativeMaps["Circle"];
      Polyline?: NativeMaps["Polyline"];
      PROVIDER_GOOGLE?: unknown;
    };
    if (!mod?.default) return null;
    return {
      MapView: mod.default,
      Marker: mod.Marker as NativeMaps["Marker"],
      Circle: mod.Circle as NativeMaps["Circle"],
      Polyline: mod.Polyline as NativeMaps["Polyline"],
      PROVIDER_GOOGLE: mod.PROVIDER_GOOGLE,
    };
  } catch {
    return null;
  }
}

const NATIVE = loadNativeMaps();

export const MapView = React.forwardRef<MapViewHandle, MapViewProps>(function MapView({
  mode,
  region,
  height = 220,
  pins,
  areaCenter,
  areaRadiusMeters = 800,
  route,
  markers,
  forcePlaceholder = false,
  style,
}, ref) {
  const containerStyle: ViewStyle = {
    height,
    borderRadius: RADIUS.xl,
    overflow: "hidden",
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
  };

  // See `tracksViewChanges` on the tracking markers below: true for the first
  // frames so the custom marker view rasterises, then off for good.
  const [tracks, setTracks] = React.useState(true);
  React.useEffect(() => {
    const t = setTimeout(() => setTracks(false), 1200);
    return () => clearTimeout(t);
  }, []);

  const nativeMapRef = React.useRef<{ animateToRegion: (r: MapRegion, duration?: number) => void } | null>(null);
  React.useImperativeHandle(ref, () => ({
    recenter: (r: MapRegion) => nativeMapRef.current?.animateToRegion(r, 350),
  }), []);

  // The native module is only absent under Expo Go / a stripped test renderer;
  // in that case say so plainly rather than drawing a substitute map.
  if (forcePlaceholder || !NATIVE) {
    return <MapUnavailable style={[containerStyle, style]} />;
  }

  const { MapView: RNMap, Marker, Circle, Polyline, PROVIDER_GOOGLE } = NATIVE;

  return (
    <View style={[containerStyle, style]}>
      <RNMap
        ref={nativeMapRef}
        style={{ flex: 1 }}
        // Google on both platforms (not Apple Maps on iOS) so the custom Lalaba
        // map style and the pin/route treatment are identical everywhere.
        provider={PROVIDER_GOOGLE}
        // Google's standard map styling — no customMapStyle. Custom styling of
        // roads/labels made the map unreadable for tracking; the familiar
        // Google look is what a customer expects to see under a courier.
        initialRegion={region}
        // Tracking is pannable/zoomable like any real map; the caller frames the
        // initial region and never re-centres, so the user keeps control.
        toolbarEnabled={false}
        moveOnMarkerPress={false}
      >
        {mode === "pricePins" &&
          (pins ?? []).map((p) => (
            <Marker key={p.id} coordinate={p.coordinate} onPress={p.onPress} anchor={{ x: 0.5, y: 1 }}>
              <View
                style={{
                  paddingHorizontal: SP.sm,
                  paddingVertical: 4,
                  borderRadius: RADIUS.pill,
                  backgroundColor: p.selected ? C.primaryPressed : C.primary,
                  borderWidth: 2,
                  borderColor: C.surface,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: C.textInverse }}>
                  {peso(p.priceCentavos, { decimals: false })}
                </Text>
              </View>
            </Marker>
          ))}

        {mode === "serviceArea" && areaCenter ? (
          <Circle
            center={areaCenter}
            radius={areaRadiusMeters}
            fillColor="rgba(36,87,214,0.12)"
            strokeColor="rgba(36,87,214,0.5)"
            strokeWidth={2}
          />
        ) : null}

        {mode === "liveTracking" && route && route.length > 1 ? (
          <Polyline coordinates={route} strokeColor={C.primary} strokeWidth={4} />
        ) : null}

        {mode === "liveTracking" &&
          (markers ?? []).map((m) => (
            <Marker
              key={m.id}
              coordinate={m.coordinate}
              title={m.label}
              anchor={{ x: 0.5, y: 0.5 }}
              // Custom marker views must be rasterised at least once or iOS
              // renders nothing at all; `tracks` starts true and flips off after
              // the first frame, which is also what stops the re-rasterise storm
              // as the courier coordinate updates.
              tracksViewChanges={tracks}
              zIndex={m.kind === "staff" ? 2 : 1}
            >
              <TrackingDot kind={m.kind} label={m.label} heading={m.heading} />
            </Marker>
          ))}
      </RNMap>
    </View>
  );
});

// ─── Marker + fallback views ─────────────────────────────────────────────────

function TrackingDot({ kind, label, heading }: Readonly<{ kind: TrackingMarker["kind"]; label?: string; heading?: number | null }>) {
  const color = kind === "staff" ? C.washer : C.primary;
  // A rider fix with a real heading gets a directional arrow so the customer
  // can tell which way they're moving, not just where they are. Falls back to
  // the plain dot when no heading is available yet (e.g. the very first fix) —
  // never invents a direction.
  const showArrow = kind === "staff" && heading != null;
  return (
    <View style={{ alignItems: "center" }}>
      {label ? (
        <View
          style={{
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: RADIUS.pill,
            backgroundColor: C.surface,
            borderWidth: 1,
            borderColor: C.border,
            marginBottom: 3,
          }}
        >
          <Text style={{ fontSize: 9, fontWeight: "700", color: C.textSecondary }}>{label}</Text>
        </View>
      ) : null}
      {showArrow ? (
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: color,
            borderWidth: 3,
            borderColor: C.surface,
            alignItems: "center",
            justifyContent: "center",
            transform: [{ rotate: `${heading}deg` }],
          }}
        >
          <Navigation size={13} color={C.textInverse} strokeWidth={2.5} fill={C.textInverse} />
        </View>
      ) : (
        <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: color, borderWidth: 3, borderColor: C.surface }} />
      )}
    </View>
  );
}

// Shown only when the native map module can't be loaded at all (Expo Go, tests).
// It is deliberately NOT a stand-in map — no invented pins, routes or geometry.
function MapUnavailable({ style }: Readonly<{ style: StyleProp<ViewStyle> }>) {
  return (
    <View style={[{ alignItems: "center", justifyContent: "center", padding: SP.lg }, style]}>
      <MapPin size={28} color={C.textTertiary} />
      <Text style={{ fontSize: 12, color: C.textMuted, marginTop: SP.sm, textAlign: "center", maxWidth: 240 }}>
        Map unavailable on this build — open the app in a development build to see it.
      </Text>
    </View>
  );
}
