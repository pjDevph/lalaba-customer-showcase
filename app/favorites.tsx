// app/favorites.tsx  (054 — saved providers)
// Favorites list with Book again / View services actions and a heart to unfavorite.

import React, { useEffect, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { backOr } from "@/lib/nav";
import { C, SP } from "@/theme/tokens";
import { Heart } from "@/theme/icons";
import { TopBar, ProviderCard } from "@/components";
import { useFavoritesStore } from "@/stores/favoritesStore";
import { useBookingStore } from "@/stores/bookingStore";
import { notify } from "@/stores/notificationStore";
import { toCardData, LoadingState, EmptyState } from "@/features/provider/parts";

export default function FavoritesScreen() {
  const favorites = useFavoritesStore((s) => s.favorites);
  const isLoading = useFavoritesStore((s) => s.isLoading);
  const load = useFavoritesStore((s) => s.load);
  const toggle = useFavoritesStore((s) => s.toggle);
  const startBooking = useBookingStore((s) => s.startBooking);

  // Deliberately separate from the store's `isLoading` — binding
  // RefreshControl's `refreshing` straight to a shared store flag that's also
  // driven by mount effects can leave the native pull indicator stuck mid-
  // gesture until a later, unrelated fetch happens to flip it. Only ever set
  // from this screen's own pull gesture below.
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  // load() swallows its own errors into store state (so the initial mount
  // doesn't throw) but never surfaces them — a pull-to-refresh that fails
  // would otherwise just stop the spinner with no sign anything went wrong.
  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    const err = useFavoritesStore.getState().error;
    if (err) notify.error("Couldn't refresh favorites", err);
    setRefreshing(false);
  };

  function openProvider(branchId: string, type: string, tab?: string) {
    router.push({ pathname: "/provider/[branchId]", params: { branchId, type, ...(tab ? { tab } : {}) } });
  }

  function bookAgain(branchId: string, providerType: "MERCHANT" | "WASHER") {
    startBooking(branchId, providerType);
    router.push("/booking/service");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <TopBar
        title="Favorites"
        subtitle={`${favorites.length} provider${favorites.length === 1 ? "" : "s"}`}
        onBack={() => backOr("/(tabs)")}
      />

      {isLoading && favorites.length === 0 ? (
        <LoadingState />
      ) : favorites.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState
            title="No favorites yet"
            body="Tap the heart on any provider to save it here for quick re-booking."
            icon={<Heart size={30} color={C.textTertiary} />}
          />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: SP.screen, gap: SP.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={C.primary} />}
        >
          {favorites.map((p) => (
            <ProviderCard
              key={p.branchId}
              data={toCardData(p)}
              variant="favorites"
              favorite
              onToggleFavorite={() => void toggle(p.branchId, p.providerType)}
              onPress={() => openProvider(p.branchId, p.providerType)}
              onBookAgain={() => bookAgain(p.branchId, p.providerType)}
              onViewServices={() => openProvider(p.branchId, p.providerType, "services")}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
