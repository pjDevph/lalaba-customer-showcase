// src/features/provider/tabs.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Tab bodies for the provider profile screen (Overview / Services / Reviews /
// Policies). Split out of [branchId].tsx to keep that route under the
// file-size budget. Underscore prefix → not an Expo Router route.
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { C, SP } from "@/theme/tokens";
import { MapPin, Clock, Truck, Calendar } from "@/theme/icons";
import { InfoBanner, ServiceRow, RatingSummary, ReviewRow } from "@/components";
import type { ProviderProfile, ProviderServiceItem, Rating, PricingType } from "@/types/api";
import { histogramToDistribution, formatBranchAddress, summarizeHours, EmptyState } from "./parts";

function firstName(name: string): string {
  return (name ?? "").trim().split(/\s+/)[0] || "This washer";
}

function unitForPricing(t: PricingType): "kg" | "load" | "item" {
  // PER_LOAD_WITH_CAPACITY is a home washer charging per machine load; the
  // rate she quotes is per load, same as a flat per-load service.
  if (t === "PER_LOAD" || t === "PER_LOAD_WITH_CAPACITY") return "load";
  if (t === "PER_PIECE") return "item";
  return "kg";
}

function formatReviewDate(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} wk ago`;
  if (days < 365) return `${Math.floor(days / 30)} mo ago`;
  return `${Math.floor(days / 365)} yr ago`;
}

function fulfillmentLabel(token: string): string {
  switch (token) {
    case "PROVIDER_PICKUP":
    case "PROVIDER_DELIVERY":
      return "Pickup & return";
    case "CUSTOMER_SELF_PICKUP":
      return "Self-pickup";
    case "CUSTOMER_DROPOFF":
      return "Drop-off";
    default:
      return token
        .split("_")
        .map((w) => (w.length ? w[0] + w.slice(1).toLowerCase() : w))
        .join(" ");
  }
}

// Home washers have no shopfront to visit, so their own photos of equipment,
// workspace and finished laundry are the only look a customer gets before
// booking. Rendered as a horizontal strip inside Overview rather than a fifth
// tab — it's supporting evidence, not a destination.
function PhotoStrip({ photos, accent }: Readonly<{ photos: readonly string[]; accent: string }>) {
  // Track failures per URL so one dead object doesn't blank the whole strip.
  const [failed, setFailed] = React.useState<readonly string[]>([]);
  const usable = photos.filter((p) => !failed.includes(p));
  if (usable.length === 0) return null;

  return (
    <View style={{ gap: SP.sm }}>
      <Text style={{ fontSize: 16, fontWeight: "700", color: C.ink }}>Photos</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: SP.sm, paddingRight: SP.md }}
      >
        {usable.map((uri) => (
          <Image
            key={uri}
            source={{ uri }}
            onError={() => setFailed((f) => [...f, uri])}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
            style={{ width: 132, height: 99, borderRadius: 12, backgroundColor: C.surfaceAlt }}
          />
        ))}
      </ScrollView>
      <Text style={{ fontSize: 12, color: C.textMuted }}>
        Photos are provided by the provider.
      </Text>
      <View style={{ height: 1, backgroundColor: accent, opacity: 0.12 }} />
    </View>
  );
}

function FeatureRow({ icon, label }: Readonly<{ icon: React.ReactNode; label: string }>) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: SP.sm }}>
      {icon}
      <Text style={{ flex: 1, fontSize: 15, color: C.ink }}>{label}</Text>
    </View>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────
export function OverviewTab({
  profile,
  services,
  isWasher,
  accent,
  onSeeAllServices,
  onOpenServiceArea,
}: Readonly<{
  profile: ProviderProfile;
  services: ProviderServiceItem[];
  isWasher: boolean;
  accent: string;
  onSeeAllServices: () => void;
  onOpenServiceArea: () => void;
}>) {
  const popular = services.slice(0, 2);
  const hours = summarizeHours(profile.operatingHours);
  const fulfillmentLine =
    profile.supportedFulfillment.length > 0
      ? [...new Set(profile.supportedFulfillment.map(fulfillmentLabel))].join(" · ")
      : null;

  const goodToKnow: string[] = [];
  if (profile.policies.minOrderKg != null) goodToKnow.push(`Minimum order ${profile.policies.minOrderKg} kg`);
  if (profile.policies.freeBatchDelivery) goodToKnow.push("Free batch delivery on scheduled routes");
  if (profile.policies.expressCutoff) goodToKnow.push(`Same-day express available before ${profile.policies.expressCutoff}`);

  return (
    <View style={{ gap: SP.lg }}>
      {profile.description ? (
        <Text style={{ fontSize: 15, color: C.textSecondary, lineHeight: 22 }}>{profile.description}</Text>
      ) : null}

      <PhotoStrip photos={profile.featuredPhotos} accent={accent} />

      {isWasher ? (
        <>
          {/* Area line */}
          {profile.areaLabel ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: SP.sm }}>
              <MapPin size={18} color={C.washer} />
              <Text style={{ flex: 1, fontSize: 15, color: C.ink }}>Serving {profile.areaLabel} — general area only</Text>
            </View>
          ) : null}

          {/* Feature rows */}
          <View style={{ gap: SP.sm }}>
            <FeatureRow icon={<Truck size={18} color={C.washer} />} label="Pickup and return only" />
            <FeatureRow icon={<Calendar size={18} color={C.washer} />} label="Limited daily bookings" />
          </View>

          {/* Privacy banner + why link */}
          <InfoBanner
            tone="washer"
            text={`${firstName(profile.name)}'s exact address is private. It is shared with delivery staff only after your booking is accepted.`}
          />
          <Pressable accessibilityRole="button" onPress={onOpenServiceArea} hitSlop={6}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: C.washer }}>Why no exact address?</Text>
          </Pressable>
        </>
      ) : (
        <>
          {/* Address */}
          {profile.address ? (
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: SP.sm }}>
              <MapPin size={18} color={C.textMuted} />
              <Text style={{ flex: 1, fontSize: 15, color: C.ink, lineHeight: 21 }}>{formatBranchAddress(profile.address)}</Text>
            </View>
          ) : null}

          {/* Hours (single-line summary) */}
          {hours ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: SP.sm }}>
              <Clock size={18} color={C.textMuted} />
              <Text style={{ flex: 1, fontSize: 15, color: C.ink }}>{hours}</Text>
            </View>
          ) : null}

          {/* Fulfillment */}
          {fulfillmentLine ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: SP.sm }}>
              <Truck size={18} color={C.textMuted} />
              <Text style={{ flex: 1, fontSize: 15, color: C.ink }}>{fulfillmentLine}</Text>
            </View>
          ) : null}
        </>
      )}

      {/* Popular / Approved services */}
      {popular.length > 0 ? (
        <View style={{ gap: SP.xs }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: C.ink }}>
              {isWasher ? "Offered services" : "Popular services"}
            </Text>
            <Pressable accessibilityRole="button" onPress={onSeeAllServices} hitSlop={6}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: accent }}>See all</Text>
            </Pressable>
          </View>
          {popular.map((s) => (
            <ServiceRow
              key={s.serviceRefId}
              variant="menu"
              data={{
                id: s.serviceRefId,
                name: s.name,
                priceCentavos: s.price,
                unit: unitForPricing(s.pricingType),
              }}
            />
          ))}
        </View>
      ) : null}

      {/* Good to know (merchant) — single paragraph per board */}
      {!isWasher && goodToKnow.length > 0 ? (
        <View style={{ gap: SP.sm }}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: C.ink }}>Good to know</Text>
          <Text style={{ fontSize: 14, color: C.textSecondary, lineHeight: 21 }}>{goodToKnow.join(" · ")}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── Services ─────────────────────────────────────────────────────────────────
export function ServicesTab({
  services,
  isWasher,
  providerName,
}: Readonly<{ services: ProviderServiceItem[]; isWasher: boolean; providerName: string }>) {
  if (services.length === 0) {
    return <EmptyState title="No services listed" body="This provider hasn't published a service menu yet." />;
  }
  return (
    <View>
      <Text style={{ fontSize: 14, fontWeight: "700", color: C.ink, marginBottom: SP.sm }}>
        {isWasher ? "Lalaba-approved service catalog" : "Merchant-created services and prices"}
      </Text>
      <View>
        {services.map((s, i) => (
          <View key={s.serviceRefId} style={{ borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.borderSubtle }}>
            <ServiceRow
              variant="menu"
              data={{
                id: s.serviceRefId,
                name: s.name,
                description: s.description ?? undefined,
                readyIn: s.readyInHint ?? undefined,
                priceCentavos: s.price,
                unit: unitForPricing(s.pricingType),
              }}
            />
          </View>
        ))}
      </View>

      {/* Footer notes */}
      {isWasher ? (
        <View style={{ marginTop: SP.base, gap: 2 }}>
          <Text style={{ fontSize: 13, color: C.textMuted, lineHeight: 18 }}>Services and billing units are approved by Lalaba.</Text>
          <Text style={{ fontSize: 13, color: C.textMuted, lineHeight: 18 }}>Prices are selected by {firstName(providerName)}.</Text>
        </View>
      ) : (
        <Text style={{ fontSize: 13, color: C.textMuted, lineHeight: 18, marginTop: SP.base }}>
          Prices are set by {providerName} for this branch.
        </Text>
      )}
    </View>
  );
}

// ─── Reviews ──────────────────────────────────────────────────────────────────
export function ReviewsTab({ profile, reviews }: Readonly<{ profile: ProviderProfile; reviews: Rating[] }>) {
  return (
    <View style={{ gap: SP.lg }}>
      {profile.ratingCount > 0 ? (
        <Text style={{ fontSize: 14, fontWeight: "700", color: C.ink }}>
          {profile.ratingCount} verified customer reviews
        </Text>
      ) : null}
      {profile.ratingCount > 0 ? (
        <RatingSummary
          average={profile.ratingAverage}
          count={profile.ratingCount}
          distribution={histogramToDistribution(profile.ratingHistogram)}
        />
      ) : null}

      {reviews.length === 0 ? (
        <EmptyState title="No reviews yet" body="Be the first to book and review this provider." />
      ) : (
        <View style={{ gap: SP.lg }}>
          {reviews.map((r) => (
            <ReviewRow
              key={r._id}
              authorName="Verified customer"
              rating={r.overallScore}
              comment={r.comment ?? undefined}
              meta={formatReviewDate(r.createdAt)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Policies ─────────────────────────────────────────────────────────────────
export function PoliciesTab({ profile }: Readonly<{ profile: ProviderProfile }>) {
  const rows: { label: string; value: string }[] = [
    { label: "Minimum order", value: profile.policies.minOrderKg != null ? `${profile.policies.minOrderKg} kg` : "No minimum" },
    { label: "Free batch delivery", value: profile.policies.freeBatchDelivery ? "Available" : "Not available" },
    {
      label: "Express turnaround",
      value: profile.policies.expressTurnaround?.enabled
        ? `Ready in ${profile.policies.expressTurnaround.slaHours ?? "—"} hrs`
        : "Not offered",
    },
  ];
  return (
    <View style={{ gap: SP.md }}>
      {rows.map((r) => (
        <View
          key={r.label}
          style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: SP.sm, borderBottomWidth: 1, borderBottomColor: C.borderSubtle }}
        >
          <Text style={{ fontSize: 15, color: C.textSecondary }}>{r.label}</Text>
          <Text style={{ fontSize: 15, fontWeight: "600", color: C.ink }}>{r.value}</Text>
        </View>
      ))}
      <Text style={{ fontSize: 13, color: C.textMuted, lineHeight: 19, marginTop: SP.xs }}>
        Payment is collected in cash or via e-wallet transfer outside the app when your laundry is weighed and the
        final price is confirmed, before pickup. Cancellations and reschedules are subject to
        the provider's confirmation and pickup status.
      </Text>
    </View>
  );
}
