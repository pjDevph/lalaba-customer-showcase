// src/features/provider/parts.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers used across the marketplace / provider screens: API→component mappers, small formatters,
// and a few presentational primitives (Section / states) so the screens stay
// declarative. Owned by the marketplace agent.
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { ActivityIndicator, Text, View, type ViewStyle } from "react-native";
import { C, SP, TYPE } from "@/theme/tokens";
import type { ProviderCardData } from "@/components";
import type {
  ProviderCard as ApiProviderCard,
  ProviderType,
  RatingHistogramBucket,
  BranchAddress,
  OperatingHours,
} from "@/types/api";

// ─── Type / accent helpers ────────────────────────────────────────────────────

/** Component accent key from the wire provider type. */
export function accentForType(providerType: ProviderType): "merchant" | "washer" {
  return providerType === "WASHER" ? "washer" : "merchant";
}

/** Component ProviderCard `type` from the wire provider type. */
export function cardType(providerType: ProviderType): "laundromat" | "homeWasher" {
  return providerType === "WASHER" ? "homeWasher" : "laundromat";
}

/** Pricing unit shown on cards: WASHER prices per load, MERCHANT per kilo. */
export function priceUnitFor(providerType: ProviderType): "kg" | "load" {
  return providerType === "WASHER" ? "load" : "kg";
}

// ─── Category formatting ──────────────────────────────────────────────────────

/** "WASH_AND_FOLD" → "Wash & Fold". */
export function humanizeCategory(raw: string): string {
  return raw
    .split("_")
    // `.toUpperCase()` on the first letter, which was missing: the words stayed
    // lowercase, so the `\bAnd\b` replace below never matched its own output and
    // "wash_and_fold" rendered as "wash and fold" instead of "Wash & Fold".
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ")
    .replace(/\bAnd\b/g, "&");
}

// ─── API → component ProviderCard ─────────────────────────────────────────────

export function toCardData(p: ApiProviderCard): ProviderCardData {
  return {
    id: p.branchId,
    name: p.name,
    type: cardType(p.providerType),
    operatorName: p.operatorName ?? undefined,
    coverPhotoUrl: p.coverPhotoUrl ?? undefined,
    logoUrl: p.logoUrl ?? undefined,
    verified: p.isVerified,
    statusText: p.statusText || undefined,
    isAcceptingBookings: p.isAcceptingBookings,
    ratingAverage: p.ratingCount > 0 ? p.ratingAverage : undefined,
    ratingCount: p.ratingCount > 0 ? p.ratingCount : undefined,
    areaLabel: p.areaLabel ?? undefined,
    distanceKm: p.distanceKm ?? undefined,
    priceFromCentavos: p.priceFromCentavos ?? undefined,
    priceUnit: priceUnitFor(p.providerType),
    serviceCategories: (p.serviceCategories ?? []).slice(0, 4).map(humanizeCategory),
  };
}

// ─── Ratings ──────────────────────────────────────────────────────────────────

/** Histogram buckets → fixed [1★,2★,3★,4★,5★] tuple RatingSummary expects. */
export function histogramToDistribution(
  hist: RatingHistogramBucket[] | null | undefined,
): [number, number, number, number, number] {
  const out: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (const b of hist ?? []) {
    if (b.star >= 1 && b.star <= 5) out[b.star - 1] = b.count;
  }
  return out;
}

// ─── Address formatting ───────────────────────────────────────────────────────

export function formatBranchAddress(addr: BranchAddress | null | undefined): string {
  if (!addr) return "";
  const parts = [
    addr.unit,
    addr.streetAddress,
    addr.barangayName,
    addr.cityMunicipalityName,
    addr.provinceName,
  ].filter((s): s is string => !!s && s.trim().length > 0);
  return parts.join(", ");
}

// ─── Category chips (Home / Search "Browse services") ─────────────────────────
// Marketing labels mapped to distinct ServiceCategory tokens for the discovery
// `category` filter. Distinct values keep the selection highlight unambiguous.
export const CATEGORY_CHIPS: readonly { label: string; value: string }[] = [
  { label: "Wash & Fold", value: "WASH_AND_FOLD" },
  { label: "Wash, Dry & Fold", value: "WASH_AND_IRON" },
  { label: "Per Kilo", value: "WASH_ONLY" },
  { label: "Comforters", value: "BEDDING" },
];

// Search "Browse services" (038) shows the full seven.
export const BROWSE_CHIPS: readonly { label: string; value: string }[] = [
  { label: "Wash & Fold", value: "WASH_AND_FOLD" },
  { label: "Wash, Dry & Fold", value: "WASH_AND_IRON" },
  { label: "Per Kilo", value: "WASH_ONLY" },
  { label: "Per Load", value: "EXPRESS" },
  { label: "Comforters", value: "BEDDING" },
  { label: "Delicates", value: "DELICATE" },
  { label: "Express", value: "DRY_CLEAN" },
];

// ─── Operating-hours summary ──────────────────────────────────────────────────
// One-line summary matching the board ("Open daily · 8:00 AM–8:00 PM"), using the
// DaySchedule shape { isOpen, is24Hours, timeSlots[{ open, close }] }.
const DAY_KEYS: readonly (keyof OperatingHours)[] = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
];
const DAY_NAMES: Record<keyof OperatingHours, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
  friday: "Fri", saturday: "Sat", sunday: "Sun",
};

function slotLabel(d: OperatingHours[keyof OperatingHours]): string {
  if (d.is24Hours) return "Open 24 hours";
  const s = d.timeSlots?.[0];
  return s ? `${s.open}–${s.close}` : "";
}

export function summarizeHours(oh: OperatingHours | null | undefined): string | null {
  if (!oh) return null;
  const days = DAY_KEYS.map((k) => oh[k]);
  const openDays = days.filter((d) => d.isOpen);
  if (openDays.length === 0) return "Temporarily closed";

  const first = slotLabel(openDays[0]);
  const allSame = openDays.length === 7 && openDays.every((d) => slotLabel(d) === first);
  if (allSame) return first ? `Open daily · ${first}` : "Open daily";

  const todayIdx = (new Date().getDay() + 6) % 7; // Mon=0
  const today = days[todayIdx];
  const name = DAY_NAMES[DAY_KEYS[todayIdx]];
  return today.isOpen ? `Open ${name} · ${slotLabel(today)}` : `Closed ${name}`;
}

// ─── Presentational primitives ────────────────────────────────────────────────

export function Section({
  title,
  action,
  children,
  style,
}: Readonly<{
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
}>) {
  return (
    <View style={[{ gap: SP.md }, style]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={TYPE.section}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

export function LoadingState({ label = "Loading…" }: Readonly<{ label?: string }>) {
  return (
    <View style={{ paddingVertical: SP["3xl"], alignItems: "center", gap: SP.md }}>
      <ActivityIndicator color={C.primaryText} />
      <Text style={{ fontSize: 13, color: C.textMuted }}>{label}</Text>
    </View>
  );
}

/**
 * Closes off a finished result list. Discovery returns every match in one
 * response (no pagination), so reaching this really is the end — it isn't a
 * "loaded so far" marker. Render it only when there's at least one result;
 * EmptyState already speaks for the zero case.
 */
export function EndOfResults({ label = "End of results" }: Readonly<{ label?: string }>) {
  return (
    <View
      accessibilityRole="text"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: SP.md,
        paddingTop: SP.lg,
        paddingBottom: SP.sm,
      }}
    >
      <View style={{ flex: 1, height: 1, backgroundColor: C.borderSubtle }} />
      <Text style={{ fontSize: 12, color: C.textTertiary, letterSpacing: 0.3 }}>{label}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: C.borderSubtle }} />
    </View>
  );
}

export function EmptyState({
  title,
  body,
  icon,
}: Readonly<{ title: string; body?: string; icon?: React.ReactNode }>) {
  return (
    <View style={{ paddingVertical: SP["3xl"], paddingHorizontal: SP.lg, alignItems: "center", gap: SP.sm }}>
      {icon ? <View style={{ marginBottom: SP.xs }}>{icon}</View> : null}
      <Text style={{ fontSize: 16, fontWeight: "700", color: C.ink, textAlign: "center" }}>{title}</Text>
      {body ? (
        <Text style={{ fontSize: 14, color: C.textMuted, textAlign: "center", lineHeight: 20, maxWidth: 300 }}>
          {body}
        </Text>
      ) : null}
    </View>
  );
}
