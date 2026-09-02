// src/components/ProviderCard.tsx
// Marketplace provider card. The full ("nearby"/"favorites") layout matches the
// discovery design: a cover photo on the left with a provider-type badge and an
// inset operator avatar, and a detail column (name, "Operated by", area, rating
// + reviews, open status, pickup & delivery, distance), with service-category
// chips below. compact/mapPreview keep a slimmer avatar-left layout.

import React, { useState } from "react";
import { Image, Pressable, Text, View, type ViewStyle } from "react-native";
import { Home } from "lucide-react-native";
import { VerifiedBadge } from "./VerifiedBadge";
import { C, RADIUS, SP, SHADOW, peso, type ProviderAccent } from "@/theme/tokens";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
import { Star, Heart, MapPin, Truck, Store } from "@/theme/icons";

export type ProviderType = "laundromat" | "homeWasher";
export type ProviderCardVariant = "nearby" | "compact" | "mapPreview" | "favorites";

// Distance-pin accent (mockup uses violet); no token for it, so it lives here.
const VIOLET = "#7C3AED";
// Max service-category chips shown before collapsing the rest into "+N", so
// the row never wraps regardless of name length or catalog size.
const CHIP_LIMIT = 2;

export interface ProviderCardData {
  id: string;
  name: string;
  type: ProviderType;
  /** Home washer only — "Operated by: {operatorName}". */
  operatorName?: string;
  coverPhotoUrl?: string;
  logoUrl?: string;
  verified?: boolean;
  statusText?: string;
  /** The real booking gate — undefined only for legacy callers that haven't
   *  been updated to pass it; the dot/CTA fall back to "accepting" rather
   *  than wrongly flagging a provider as blocked with no signal either way. */
  isAcceptingBookings?: boolean;
  ratingAverage?: number;
  ratingCount?: number;
  areaLabel?: string;
  distanceKm?: number;
  /** Lowest price in centavos. */
  priceFromCentavos?: number;
  /** Pricing unit shown after the price. */
  priceUnit?: "kg" | "load";
  serviceCategories?: string[];
}

export interface ProviderCardProps {
  data: ProviderCardData;
  variant?: ProviderCardVariant;
  onPress?: () => void;
  /** Favorites variant actions. */
  onBookAgain?: () => void;
  onViewServices?: () => void;
  /** Heart toggle. */
  favorite?: boolean;
  onToggleFavorite?: () => void;
  style?: ViewStyle;
}

function accentOf(type: ProviderType): ProviderAccent {
  return type === "homeWasher" ? "washer" : "merchant";
}

// Five stars with fractional fill — 4.8 → four full + a fifth filled 80%.
// Empty (grey outline) when `rating` is null.
function Stars({ rating, size = 13 }: Readonly<{ rating: number | null; size?: number }>) {
  return (
    <View style={{ flexDirection: "row", gap: 1 }}>
      {[0, 1, 2, 3, 4].map((i) => {
        const frac = rating == null ? 0 : Math.max(0, Math.min(1, rating - i));
        return (
          <View key={i} style={{ width: size, height: size }}>
            <Star size={size} color={C.textTertiary} fill="transparent" />
            {frac > 0 ? (
              <View style={{ position: "absolute", left: 0, top: 0, width: size * frac, height: size, overflow: "hidden" }}>
                <Star size={size} color={C.warning} fill={C.warning} />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function initialsOf(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

/** "200 meters away" under 1km, else "1.2 km away". */
function distanceLabel(km?: number): string | null {
  if (km == null) return null;
  if (km < 1) return `${Math.round(km * 1000)} meters away`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km away`;
}

// A short row with a leading icon (the rich card's meta lines).
function MetaRow({ icon, children }: Readonly<{ icon: React.ReactNode; children: React.ReactNode }>) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 }}>
      {icon}
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>{children}</View>
    </View>
  );
}

export function ProviderCard({
  data,
  variant = "nearby",
  onPress,
  onBookAgain,
  onViewServices,
  favorite,
  onToggleFavorite,
  style,
}: Readonly<ProviderCardProps>) {
  const accent = accentOf(data.type);
  const isWasher = data.type === "homeWasher";
  // A media URL that 404s (or is unreachable from this device) must degrade to
  // the tint / initials, never to an empty box.
  const [coverFailed, setCoverFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const compact = variant === "compact" || variant === "mapPreview";

  const Container = ({ children }: { children: React.ReactNode }) => (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={!onPress}
      style={[
        {
          backgroundColor: C.surface,
          borderRadius: RADIUS.xl,
          borderWidth: 1,
          borderColor: C.border,
          padding: compact ? SP.base : SP.lg,
          ...SHADOW.sm,
          ...(variant === "mapPreview" ? SHADOW.md : {}),
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );

  // ── Compact / map preview: slim avatar-left layout ──────────────────────────
  if (compact) {
    return (
      <Container>
        <View style={{ flexDirection: "row", gap: SP.md }}>
          <Avatar name={data.name} type={accent} size="md" />
          <View style={{ flex: 1 }}>
            <Badge preset={isWasher ? "VERIFIED_HOME_WASHER" : "LAUNDROMAT"} />
            <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: "700", color: C.ink, marginTop: 6 }}>
              {data.name}
            </Text>
            {data.statusText ? (
              <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>{data.statusText}</Text>
            ) : null}
            <View style={{ flexDirection: "row", alignItems: "center", gap: SP.md, marginTop: 6, flexWrap: "wrap" }}>
              {typeof data.ratingAverage === "number" ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <Star size={14} color={C.warning} fill={C.warning} />
                  <Text style={{ fontSize: 13, fontWeight: "700", color: C.ink }}>{data.ratingAverage.toFixed(1)}</Text>
                  {typeof data.ratingCount === "number" ? (
                    <Text style={{ fontSize: 13, color: C.textMuted }}>({data.ratingCount})</Text>
                  ) : null}
                </View>
              ) : null}
              {distanceLabel(data.distanceKm) ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <MapPin size={14} color={C.textMuted} />
                  <Text style={{ fontSize: 13, color: C.textMuted }}>{distanceLabel(data.distanceKm)}</Text>
                </View>
              ) : null}
            </View>
            {!isWasher && typeof data.priceFromCentavos === "number" ? (
              <Text style={{ fontSize: 14, marginTop: 6, color: C.textSecondary }}>
                From <Text style={{ fontWeight: "700", color: C.ink }}>{peso(data.priceFromCentavos)}</Text>
                {data.priceUnit ? `/${data.priceUnit}` : ""}
              </Text>
            ) : null}
          </View>
        </View>
      </Container>
    );
  }

  // ── Full card: cover + inset avatar on the left, detail column on the right ──
  const dist = distanceLabel(data.distanceKm);

  return (
    <Container>
      <View style={{ flexDirection: "row", gap: SP.base }}>
        {/* Cover with type badge + inset operator avatar */}
        <View style={{ width: 116, height: 132, borderRadius: RADIUS.lg, overflow: "hidden", backgroundColor: C.surfaceAlt }}>
          {data.coverPhotoUrl && !coverFailed ? (
            <Image
              source={{ uri: data.coverPhotoUrl }}
              onError={() => setCoverFailed(true)}
              resizeMode="cover"
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <View style={{ width: "100%", height: "100%", backgroundColor: isWasher ? C.washerTint : C.surfaceAlt }} />
          )}

          {/* Type badge (top-left) */}
          <View
            style={{
              position: "absolute", top: 6, left: 6,
              flexDirection: "row", alignItems: "center", gap: 4,
              // Both plates are brand blue — the near-black laundromat badge is
              // gone. primaryText (the deep blue), not primary: the label is
              // white, and white on #00AEEF is ~2.2:1. The provider TYPE is
              // carried by the glyph and the label, not by the plate colour.
              backgroundColor: C.primaryText,
              borderRadius: RADIUS.md, paddingHorizontal: 7, paddingVertical: 4, maxWidth: 100,
            }}
          >
            {isWasher ? <Home size={11} color={C.textInverse} strokeWidth={2.5} /> : <Store size={11} color={C.textInverse} />}
            <Text style={{ fontSize: 10, fontWeight: "800", color: C.textInverse }} numberOfLines={2}>
              {isWasher ? "Home\nWasher" : "Laundromat"}
            </Text>
          </View>

          {/* Inset operator avatar (bottom-left) — rounded SQUARE (matches the
              provider dashboard's own preview). Initials fill the square. */}
          <View
            style={{
              position: "absolute", bottom: 6, left: 6,
              width: 40, height: 40, borderRadius: RADIUS.md, overflow: "hidden",
              borderWidth: 2, borderColor: C.surface,
              backgroundColor: isWasher ? C.washerTint : C.primaryTint,
              alignItems: "center", justifyContent: "center",
            }}
          >
            {data.logoUrl && !logoFailed ? (
              <Image
                source={{ uri: data.logoUrl }}
                onError={() => setLogoFailed(true)}
                resizeMode="cover"
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <Text style={{ fontSize: 13, fontWeight: "800", color: isWasher ? C.washer : C.primary }}>
                {initialsOf(data.name)}
              </Text>
            )}
          </View>
        </View>

        {/* Detail column */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: SP.sm }}>
            <Text numberOfLines={2} style={{ flex: 1, fontSize: 18, fontWeight: "800", color: C.ink }}>
              {data.name}
            </Text>
            {onToggleFavorite ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={favorite ? "Remove from favorites" : "Add to favorites"}
                onPress={onToggleFavorite}
                hitSlop={8}
                style={{ padding: 2 }}
              >
                <Heart size={20} color={favorite ? C.error : C.textTertiary} fill={favorite ? C.error : "transparent"} />
              </Pressable>
            ) : data.verified != null ? (
              <VerifiedBadge verified={data.verified} />
            ) : null}
          </View>

          {data.operatorName ? (
            <Text numberOfLines={1} style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>
              Operated by: {data.operatorName}
            </Text>
          ) : null}

          {/* Area */}
          {data.areaLabel ? (
            <MetaRow icon={<MapPin size={14} color={C.textMuted} />}>
              <Text numberOfLines={1} style={{ fontSize: 13, color: C.textSecondary }}>{data.areaLabel}</Text>
            </MetaRow>
          ) : null}

          {/* Rating + reviews — 5 stars with fractional fill; unrated providers
              get empty grey stars + "Not rated yet". */}
          {typeof data.ratingAverage === "number" ? (
            <MetaRow icon={<Stars rating={data.ratingAverage} />}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.ink }}>{data.ratingAverage.toFixed(1)} </Text>
              {typeof data.ratingCount === "number" ? (
                <Text style={{ fontSize: 13, color: C.textMuted }}>· {data.ratingCount} reviews</Text>
              ) : null}
            </MetaRow>
          ) : (
            <MetaRow icon={<Stars rating={null} />}>
              <Text style={{ fontSize: 13, color: C.textMuted }}>Not rated yet</Text>
            </MetaRow>
          )}

          {/* Open status — the dot used to be hardcoded green regardless of
              statusText, so "Not accepting bookings" still read as go. */}
          {data.statusText ? (
            <MetaRow icon={<View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: data.isAcceptingBookings === false ? C.textTertiary : C.success }} />}>
              <Text numberOfLines={1} style={{ fontSize: 13, color: data.isAcceptingBookings === false ? C.textMuted : C.textSecondary }}>{data.statusText}</Text>
            </MetaRow>
          ) : null}

          {/* Pickup & delivery — every marketplace provider offers this. */}
          <MetaRow icon={<Truck size={14} color={C.primaryText} />}>
            <Text style={{ fontSize: 13, color: C.textSecondary }}>Pickup & delivery available</Text>
          </MetaRow>

          {/* Distance */}
          {dist ? (
            <MetaRow icon={<MapPin size={14} color={VIOLET} />}>
              <Text style={{ fontSize: 13, color: C.textSecondary }}>{dist}</Text>
            </MetaRow>
          ) : null}

          {/* Price — laundromats show a "From ₱X/kg" starting price. Home
              washers omit it (their services are shown as chips instead). */}
          {!isWasher && typeof data.priceFromCentavos === "number" ? (
            <Text style={{ fontSize: 14, marginTop: 6, color: C.textSecondary }}>
              From <Text style={{ fontWeight: "700", color: C.ink }}>{peso(data.priceFromCentavos)}</Text>
              {data.priceUnit ? `/${data.priceUnit}` : ""}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Service category chips — capped to keep a single row regardless of
          name length or catalog size; overflow collapses into a "+N" chip. */}
      {data.serviceCategories && data.serviceCategories.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "nowrap", gap: SP.xs, marginTop: SP.md }}>
          {data.serviceCategories.slice(0, CHIP_LIMIT).map((cat) => (
            <View
              key={cat}
              style={{ flexShrink: 1, paddingHorizontal: SP.md, paddingVertical: 7, borderRadius: RADIUS.pill, backgroundColor: C.surfaceAlt }}
            >
              <Text numberOfLines={1} ellipsizeMode="tail" style={{ fontSize: 12.5, fontWeight: "600", color: C.textSecondary }}>
                {cat}
              </Text>
            </View>
          ))}
          {data.serviceCategories.length > CHIP_LIMIT ? (
            <View style={{ flexShrink: 0, paddingHorizontal: SP.md, paddingVertical: 7, borderRadius: RADIUS.pill, backgroundColor: C.surfaceAlt }}>
              <Text style={{ fontSize: 12.5, fontWeight: "600", color: C.textSecondary }}>
                +{data.serviceCategories.length - CHIP_LIMIT}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Favorites actions */}
      {variant === "favorites" && (onBookAgain || onViewServices) ? (
        <View style={{ flexDirection: "row", gap: SP.sm, marginTop: SP.base }}>
          {onBookAgain ? <FavAction label="Book again" primary onPress={onBookAgain} /> : null}
          {onViewServices ? <FavAction label="View services" onPress={onViewServices} /> : null}
        </View>
      ) : null}
    </Container>
  );
}

function FavAction({ label, primary, onPress }: Readonly<{ label: string; primary?: boolean; onPress: () => void }>) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 40,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: RADIUS.md,
        backgroundColor: primary ? C.primary : C.surface,
        borderWidth: primary ? 0 : 1,
        borderColor: C.border,
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: "700", color: primary ? C.textInverse : C.primary }}>{label}</Text>
    </Pressable>
  );
}
