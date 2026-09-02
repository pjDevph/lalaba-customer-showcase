// app/(tabs)/index.tsx  (032 — Home / Marketplace)
// Delivery header, tap-to-search bar, provider-type + category filters, and
// "Available nearby" / "Top rated" provider sections driven by the discovery store.

import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { C, SP, RADIUS, SHADOW } from "@/theme/tokens";
import { Search, MapPin, ChevronRight, SlidersHorizontal, X } from "@/theme/icons";
import { Chip, ProviderCard, InfoBanner } from "@/components";
import { NotificationBell } from "@/components/NotificationBell";
import { SearchOverlay } from "@/components/SearchOverlay";
import { FiltersSheet, activeFilterCount } from "@/components/FiltersSheet";
import { useDiscoveryStore, DEFAULT_RADIUS_KM } from "@/stores/discoveryStore";
import { useAddressStore } from "@/stores/addressStore";
import { notify } from "@/stores/notificationStore";
import type { ProviderTypeFilter } from "@/types/api";
import { toCardData, CATEGORY_CHIPS, Section, LoadingState, EmptyState, EndOfResults } from "@/features/provider/parts";

const TYPE_CHIPS: readonly { label: string; value: ProviderTypeFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Laundromats", value: "MERCHANT" },
  { label: "Home Washers", value: "WASHER" },
];

export default function HomeScreen() {
  const filters = useDiscoveryStore((s) => s.filters);
  const results = useDiscoveryStore((s) => s.results);
  const isLoading = useDiscoveryStore((s) => s.isLoading);
  const setFilter = useDiscoveryStore((s) => s.setFilter);
  const setCoords = useDiscoveryStore((s) => s.setCoords);
  const search = useDiscoveryStore((s) => s.search);
  // Deliberately separate from the store's `isLoading` — `search()` is also
  // called from app/search.tsx, app/address-select.tsx, and FiltersSheet, so
  // binding RefreshControl's `refreshing` straight to the shared flag means
  // an unrelated search triggered elsewhere toggles this screen's pull
  // indicator, which can leave it stuck mid-gesture until a real pull fixes
  // it. Only ever set from this screen's own pull gesture below.
  const [refreshing, setRefreshing] = useState(false);

  // search() swallows its own errors into store state — surface a failed
  // pull-to-refresh, otherwise the spinner just stops with no sign anything
  // went wrong (reads as "stuck" even though the request did complete).
  const onRefresh = async () => {
    setRefreshing(true);
    await search();
    const err = useDiscoveryStore.getState().error;
    if (err) notify.error("Couldn't refresh", err);
    setRefreshing(false);
  };

  const addresses = useAddressStore((s) => s.addresses);
  const selectedId = useAddressStore((s) => s.selectedAddressId);
  const loadAddresses = useAddressStore((s) => s.load);

  const selectedAddress = useMemo(
    () => addresses.find((a) => a._id === selectedId) ?? addresses.find((a) => a.isDefault) ?? addresses[0],
    [addresses, selectedId],
  );
  // Coords of the active delivery address — the "you" point for nearest sorting
  // + per-card distance. Null until addresses load; the effect re-runs once set.
  const lat = selectedAddress?.mapLocation?.latitude ?? null;
  const lng = selectedAddress?.mapLocation?.longitude ?? null;
  // discoveryStore only sends latitude/longitude when both are non-null, and
  // there is no device-location fallback — with no address set, results are
  // not distance-ordered at all, so nothing on this screen may claim "nearby".
  const hasLocation = lat != null && lng != null;

  // Load saved addresses once (for the delivery header + location).
  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  // Feed the delivery location into discovery, then (re)search whenever the
  // provider-type/category filter or the delivery address changes (and on mount).
  useEffect(() => {
    if (lat != null && lng != null) setCoords(lat, lng);
    void search();
  }, [filters.providerType, filters.category, lat, lng, setCoords, search]);
  const areaParts = selectedAddress
    ? [selectedAddress.address.barangayName, selectedAddress.address.cityMunicipalityName]
        .filter((s): s is string => !!s)
        .join(", ")
    : "";
  const deliverLine = selectedAddress
    ? `${selectedAddress.label ?? "Home"} · ${areaParts || selectedAddress.address.cityMunicipalityName}`
    : "Set delivery address";

  const nearby = results;
  const topRated = useMemo(
    () =>
      [...results]
        .filter((p) => p.ratingCount > 0)
        .sort((a, b) => b.ratingAverage - a.ratingAverage)
        .slice(0, 5),
    [results],
  );

  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Active-filter tokens (removable) — everything set beyond provider type,
  // which stays a selected chip.
  const activeCount = activeFilterCount(filters);
  const tokens: { key: string; label: string; clear: () => void }[] = [];
  if (filters.radiusKm !== DEFAULT_RADIUS_KM) {
    tokens.push({ key: "dist", label: `Within ${filters.radiusKm} km`, clear: () => { setFilter("radiusKm", DEFAULT_RADIUS_KM); void search(); } });
  }
  if (filters.category != null) {
    const label = CATEGORY_CHIPS.find((c) => c.value === filters.category)?.label ?? filters.category;
    tokens.push({ key: "cat", label, clear: () => { setFilter("category", null); void search(); } });
  }
  if (filters.minRating != null) {
    tokens.push({ key: "rating", label: `${filters.minRating}+ ★`, clear: () => { setFilter("minRating", null); void search(); } });
  }
  if (filters.openNow) {
    tokens.push({ key: "open", label: "Open now", clear: () => { setFilter("openNow", false); void search(); } });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <FiltersSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SP["3xl"] }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={C.primary} />}
      >
        {/* Header: delivery target + profile avatar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: SP.screen,
            paddingTop: SP.sm,
            paddingBottom: SP.md,
            gap: SP.md,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change delivery address"
            onPress={() => router.push("/address-select")}
            style={{ flex: 1 }}
          >
            <Text style={{ fontSize: 12, color: C.textMuted, fontWeight: "600" }}>Delivering to</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
              <MapPin size={16} color={C.primaryText} />
              <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: "700", color: C.ink, flexShrink: 1 }}>
                {deliverLine}
              </Text>
              <ChevronRight size={16} color={C.textTertiary} />
            </View>
          </Pressable>

          {/* The bell alone. The profile avatar that sat beside it duplicated
              the Profile tab an inch below, and two entry points to the same
              screen crowded out the one thing here that is actually new. */}
          <NotificationBell />
        </View>

        {/* Search bar → inline search overlay (stays on Home) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search laundry services"
          onPress={() => setSearchOpen(true)}
          style={{
            marginHorizontal: SP.screen,
            flexDirection: "row",
            alignItems: "center",
            gap: SP.sm,
            height: 48,
            paddingHorizontal: SP.base,
            borderRadius: RADIUS.lg,
            backgroundColor: C.surface,
            borderWidth: 1,
            borderColor: C.border,
            ...SHADOW.sm,
          }}
        >
          <Search size={20} color={C.textMuted} />
          <Text style={{ fontSize: 15, color: C.textMuted }}>Search services or laundry providers</Text>
        </Pressable>

        {/* Quick filters: provider type + Filters entry (everything else lives
            in the Filters sheet). */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: SP.sm, paddingHorizontal: SP.screen, paddingVertical: SP.base, alignItems: "center" }}
        >
          {TYPE_CHIPS.map((c) => (
            <Chip
              key={c.value}
              label={c.label}
              selected={filters.providerType === c.value}
              onPress={() => setFilter("providerType", c.value)}
            />
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open filters"
            onPress={() => setFiltersOpen(true)}
            style={{
              flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: SP.md,
              borderRadius: RADIUS.pill, borderWidth: 1,
              borderColor: activeCount > 0 ? C.primary : C.border,
              backgroundColor: activeCount > 0 ? C.primaryTint : C.surface,
            }}
          >
            <SlidersHorizontal size={16} color={C.primaryText} />
            <Text style={{ fontSize: 14, fontWeight: "600", color: C.primaryText }}>
              Filters{activeCount > 0 ? ` • ${activeCount}` : ""}
            </Text>
          </Pressable>
        </ScrollView>

        {/* Active-filter tokens (removable) */}
        {tokens.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: SP.sm, paddingHorizontal: SP.screen, paddingBottom: SP.base }}
          >
            {tokens.map((t) => (
              <Pressable
                key={t.key}
                accessibilityRole="button"
                accessibilityLabel={`Remove filter ${t.label}`}
                onPress={t.clear}
                style={{ flexDirection: "row", alignItems: "center", gap: 5, height: 32, paddingLeft: SP.md, paddingRight: SP.sm, borderRadius: RADIUS.pill, backgroundColor: C.primaryTint }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: C.primaryText }}>{t.label}</Text>
                <X size={14} color={C.primaryText} />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {/* Results */}
        {isLoading && results.length === 0 ? (
          <LoadingState label="Finding providers near you…" />
        ) : results.length === 0 ? (
          <EmptyState
            title="No providers found"
            body="Try clearing filters or choosing a different service category."
            icon={<Search size={28} color={C.textTertiary} />}
          />
        ) : filters.providerType === "MERCHANT" ? (
          // 046 — Laundromats filter
          <View style={{ gap: SP.md, paddingHorizontal: SP.screen }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: C.ink }}>
              {results.length} laundromat{results.length === 1 ? "" : "s"}
              {hasLocation ? " near you" : " available"}
            </Text>
            {results.map((p) => (
              <ProviderCard
                key={p.branchId}
                data={toCardData(p)}
                variant="nearby"
                favorite={p.isFavorite}
                onPress={() =>
                  router.push({ pathname: "/provider/[branchId]", params: { branchId: p.branchId, type: p.providerType } })
                }
              />
            ))}
            <EndOfResults />
          </View>
        ) : filters.providerType === "WASHER" ? (
          // 047 — Home Washers filter
          <View style={{ gap: SP.md, paddingHorizontal: SP.screen }}>
            <InfoBanner
              tone="washer"
              text="Home Washers serve a general area and offer limited daily bookings. Exact addresses stay private."
            />
            {results.map((p) => (
              <ProviderCard
                key={p.branchId}
                data={toCardData(p)}
                variant="nearby"
                favorite={p.isFavorite}
                onPress={() =>
                  router.push({ pathname: "/provider/[branchId]", params: { branchId: p.branchId, type: p.providerType } })
                }
              />
            ))}
            <EndOfResults />
          </View>
        ) : (
          // 032 — All
          <View style={{ gap: SP.xl, paddingHorizontal: SP.screen }}>
            {!hasLocation ? (
              <InfoBanner
                tone="info"
                text="Set a delivery address to see providers near you and sort by distance."
                icon="mapPin"
              />
            ) : null}
            <Section
              title={hasLocation ? "Available nearby" : "All providers"}
              action={
                <Pressable accessibilityRole="button" onPress={() => router.push("/map")} hitSlop={6}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: C.primaryText }}>See all</Text>
                </Pressable>
              }
            >
              <View style={{ gap: SP.md }}>
                {nearby.map((p) => (
                  <ProviderCard
                    key={p.branchId}
                    data={toCardData(p)}
                    variant="nearby"
                    favorite={p.isFavorite}
                    onPress={() =>
                      router.push({ pathname: "/provider/[branchId]", params: { branchId: p.branchId, type: p.providerType } })
                    }
                  />
                ))}
              </View>
            </Section>

            {topRated.length > 0 ? (
              <Section
                title="Top rated"
                action={
                  <Pressable accessibilityRole="button" onPress={() => router.push("/search")} hitSlop={6}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: C.primaryText }}>See all</Text>
                  </Pressable>
                }
              >
                <View style={{ gap: SP.md }}>
                  {topRated.map((p) => (
                    <ProviderCard
                      key={`top-${p.branchId}`}
                      data={toCardData(p)}
                      variant="nearby"
                      favorite={p.isFavorite}
                      onPress={() =>
                        router.push({ pathname: "/provider/[branchId]", params: { branchId: p.branchId, type: p.providerType } })
                      }
                    />
                  ))}
                </View>
              </Section>
            ) : null}

            <EndOfResults />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
