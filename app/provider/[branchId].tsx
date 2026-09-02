// app/provider/[branchId].tsx  (059/067 profile + 060/063/068/073 tabs + 075 verify sheet)
// One screen for both provider types (read `type` param). Cover + identity header,
// an internal tab strip (Overview / Services / Reviews / Policies
// merchants]), and a sticky "Book laundry service" CTA.

import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ShieldCheck, Shield } from "lucide-react-native";
import { backOr } from "@/lib/nav";
import { C, SP, SHADOW, accentColor, accentTint } from "@/theme/tokens";
import { ArrowLeft, Star } from "@/theme/icons";
import { Avatar, Badge, Button, SegmentedControl } from "@/components";
import { providerProfile, providerServices } from "@/services/graphql/discovery";
import { shopRatings } from "@/services/graphql/ratings";
import { useBookingStore } from "@/stores/bookingStore";
import type { ProviderProfile, ProviderServiceItem, ProviderType, Rating } from "@/types/api";
import { accentForType, LoadingState, EmptyState } from "@/features/provider/parts";
import { OverviewTab, ServicesTab, ReviewsTab, PoliciesTab } from "@/features/provider/tabs";
import { VerifySheet, ServiceAreaSheet } from "@/features/provider/sheets";

type TabKey = "overview" | "services" | "reviews" | "policies";

export default function ProviderProfileScreen() {
  const params = useLocalSearchParams<{ branchId: string; type?: string; tab?: string }>();
  const branchId = params.branchId;
  const providerType: ProviderType = params.type === "WASHER" ? "WASHER" : "MERCHANT";
  const isWasher = providerType === "WASHER";
  const accent = accentColor(accentForType(providerType));
  const tint = accentTint(accentForType(providerType));
  // A broken cover URL should fall back to the tint, not a blank band.
  const [coverFailed, setCoverFailed] = useState(false);

  const startBooking = useBookingStore((s) => s.startBooking);
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [services, setServices] = useState<ProviderServiceItem[]>([]);
  const [reviews, setReviews] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>(
    params.tab === "services" || params.tab === "reviews" || params.tab === "policies"
      ? (params.tab as TabKey)
      : "overview",
  );
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [prof, svcs, rt] = await Promise.all([
          providerProfile(branchId, providerType),
          providerServices(branchId, providerType),
          shopRatings(branchId, { limit: 20 }).catch(() => null),
        ]);
        if (!alive) return;
        setProfile(prof);
        setServices(svcs);
        setReviews(rt?.data ?? []);
      } catch {
        if (alive) setError("Could not load this provider. Please try again.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [branchId, providerType]);

  // Overview · Services · Reviews · Policies. The washer photo gallery lives
  // inside Overview rather than as a fifth tab.
  const tabOptions = useMemo(
    () => [
      { key: "overview", label: "Overview" },
      { key: "services", label: "Services" },
      { key: "reviews", label: "Reviews" },
      { key: "policies", label: "Policies" },
    ],
    [],
  );

  // Same signal as the discovery card's `isVerified` — the BE derives both from
  // verifiedAt (VERIFIED_BUSINESS / VERIFIED_HOME_WASHER badges), so card and
  // profile always agree.
  const verified = (profile?.verificationBadges ?? []).some(
    (b) => b === "VERIFIED_BUSINESS" || b === "VERIFIED_HOME_WASHER",
  );

  // Verification is a trust badge, not a gate (GAP-P0-027): discovery now lists
  // funded, operational providers whether or not they're verified, so booking an
  // Unverified provider is a normal path — no interstitial warning.
  function book() {
    startBooking(branchId, providerType);
    router.push("/booking/service");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      {/* Floating back button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => backOr("/(tabs)")}
        style={{
          position: "absolute",
          top: insets.top + SP.sm,
          left: SP.screen,
          zIndex: 10,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: C.surface,
          alignItems: "center",
          justifyContent: "center",
          ...SHADOW.md,
        }}
      >
        <ArrowLeft size={22} color={C.ink} />
      </Pressable>

      {loading ? (
        <LoadingState label="Loading provider…" />
      ) : error || !profile ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState title="Something went wrong" body={error ?? "Provider not found."} />
        </View>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
            {/* Cover — the provider's own photo when they've uploaded one, the
                accent tint otherwise. The tint doubles as the backdrop while
                the image loads and if it fails. */}
            <View style={{ height: 120, backgroundColor: tint }}>
              {profile.coverPhotoUrl && !coverFailed ? (
                <Image
                  source={{ uri: profile.coverPhotoUrl }}
                  onError={() => setCoverFailed(true)}
                  resizeMode="cover"
                  style={{ width: "100%", height: "100%" }}
                />
              ) : null}
            </View>

            {/* Identity header */}
            <View style={{ paddingHorizontal: SP.screen, marginTop: -36 }}>
              <Avatar
                name={profile.name}
                type={accentForType(providerType)}
                size="xl"
                solid
                imageUrl={profile.logoUrl}
                style={{ borderWidth: 3, borderColor: C.surface }}
              />

              <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: SP.xs, marginTop: SP.md }}>
                {/* Provider type + the SAME shield used on the discovery card.
                    Verification is data-driven (verifiedAt), never hardcoded, so
                    the card shield and this one always agree. */}
                {isWasher ? <Badge label="Home Washer" tone="washer" /> : <Badge preset="LAUNDROMAT" />}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={verified ? "Verified provider" : "Unverified provider — learn more"}
                  onPress={() => setVerifyOpen(true)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 4, marginLeft: 2 }}
                >
                  {verified ? <ShieldCheck size={16} color={C.success} /> : <Shield size={16} color={C.textTertiary} />}
                  <Text style={{ fontSize: 12, fontWeight: "700", color: verified ? C.success : C.textTertiary }}>
                    {verified ? "Verified" : "Unverified"}
                  </Text>
                </Pressable>
              </View>

              <Text style={{ fontSize: 24, fontWeight: "700", color: C.ink, marginTop: SP.sm }}>{profile.name}</Text>
              {profile.statusText ? (
                <Text style={{ fontSize: 14, color: C.textMuted, marginTop: 2 }}>{profile.statusText}</Text>
              ) : null}
              {/* Neutral, factual note — Unverified is a state, not a warning. */}
              {!verified ? (
                <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 4, lineHeight: 19 }}>
                  Lalaba hasn&apos;t completed its verification checks for this provider yet. They can still take
                  bookings.
                </Text>
              ) : null}

              {/* rating · reviews (· area for merchant) */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: SP.sm, flexWrap: "wrap" }}>
                {profile.ratingCount > 0 ? (
                  <>
                    <Star size={15} color={C.warning} fill={C.warning} />
                    <Text style={{ fontSize: 14, fontWeight: "700", color: C.ink }}>{profile.ratingAverage.toFixed(1)}</Text>
                    <Text style={{ fontSize: 14, color: C.textMuted }}>· {profile.ratingCount} reviews</Text>
                    {!isWasher && profile.areaLabel ? (
                      <Text style={{ fontSize: 14, color: C.textMuted }}>· {profile.areaLabel}</Text>
                    ) : null}
                  </>
                ) : (
                  <Text style={{ fontSize: 14, color: C.textMuted }}>No reviews yet</Text>
                )}
              </View>
            </View>

            {/* Tab strip */}
            <View style={{ paddingHorizontal: SP.screen, paddingVertical: SP.base }}>
              <SegmentedControl options={tabOptions} value={tab} onChange={(k) => setTab(k as TabKey)} />
            </View>

            {/* Tab content */}
            <View style={{ paddingHorizontal: SP.screen, gap: SP.lg }}>
              {tab === "overview" ? (
                <OverviewTab
                  profile={profile}
                  services={services}
                  isWasher={isWasher}
                  accent={accent}
                  onSeeAllServices={() => setTab("services")}
                  onOpenServiceArea={() => setAreaOpen(true)}
                />
              ) : null}
              {tab === "services" ? <ServicesTab services={services} isWasher={isWasher} providerName={profile.name} /> : null}
              {tab === "reviews" ? <ReviewsTab profile={profile} reviews={reviews} /> : null}
              {tab === "policies" ? <PoliciesTab profile={profile} /> : null}
            </View>
          </ScrollView>

          {/* Sticky CTA */}
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              paddingHorizontal: SP.screen,
              paddingTop: SP.md,
              paddingBottom: SP.md + insets.bottom,
              backgroundColor: C.surface,
              borderTopWidth: 1,
              borderTopColor: C.borderSubtle,
              ...SHADOW.lg,
            }}
          >
            <Button
              label={profile?.isAcceptingBookings === false ? "Not accepting bookings right now" : "Book laundry service"}
              fullWidth
              onPress={book}
              disabled={profile?.isAcceptingBookings === false}
              style={{ backgroundColor: accent }}
            />
          </View>
        </>
      )}

      {/* 075 — Verified Home Washer sheet */}
      <VerifySheet visible={verifyOpen} onClose={() => setVerifyOpen(false)} profile={profile} />
      {/* 073 — Privacy-safe service area sheet */}
      <ServiceAreaSheet visible={areaOpen} onClose={() => setAreaOpen(false)} profile={profile} />
    </SafeAreaView>
  );
}
