// app/map.tsx  (044 — nearby providers map)
// Full-bleed price-pin map with an area/List header pill and a bottom preview
// card for the selected pin. Discovery cards carry no coordinates, so pins are
// placed deterministically around the map center using each provider's real
// distanceKm (illustrative until the backend returns per-provider coordinates).

import React, { useMemo, useState } from "react";
import { Dimensions, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { backOr } from "@/lib/nav";
import { C, SP, RADIUS, SHADOW } from "@/theme/tokens";
import { MapPin, ArrowLeft } from "@/theme/icons";
import { MapView, ProviderCard, type PricePin, type MapRegion } from "@/components";
import { useDiscoveryStore } from "@/stores/discoveryStore";
import { useAddressStore } from "@/stores/addressStore";
import { toCardData } from "@/features/provider/parts";

// Metro Manila fallback center when the user hasn't shared coordinates.
const DEFAULT_CENTER = { latitude: 14.5995, longitude: 120.9842 };

export default function MapScreen() {
  const results = useDiscoveryStore((s) => s.results);
  const filters = useDiscoveryStore((s) => s.filters);
  const addresses = useAddressStore((s) => s.addresses);
  const selectedAddrId = useAddressStore((s) => s.selectedAddressId);

  const center = {
    latitude: filters.latitude ?? DEFAULT_CENTER.latitude,
    longitude: filters.longitude ?? DEFAULT_CENTER.longitude,
  };

  const [selectedId, setSelectedId] = useState<string | null>(results[0]?.branchId ?? null);

  // Deterministic scatter around the center using real distanceKm + a fanned bearing.
  const placed = useMemo(() => {
    const n = Math.max(results.length, 1);
    return results.map((p, i) => {
      const d = p.distanceKm ?? 0.6 + (i % 5) * 0.4; // km
      const bearing = (i * (360 / n) * Math.PI) / 180;
      const dLat = (d / 111) * Math.cos(bearing);
      const dLng = (d / (111 * Math.cos((center.latitude * Math.PI) / 180))) * Math.sin(bearing);
      return {
        provider: p,
        coordinate: { latitude: center.latitude + dLat, longitude: center.longitude + dLng },
      };
    });
  }, [results, center.latitude, center.longitude]);

  const pins: PricePin[] = placed.map(({ provider, coordinate }) => ({
    id: provider.branchId,
    coordinate,
    priceCentavos: provider.priceFromCentavos ?? 0,
    selected: provider.branchId === selectedId,
    onPress: () => setSelectedId(provider.branchId),
  }));

  const region: MapRegion = { ...center, latitudeDelta: 0.08, longitudeDelta: 0.08 };
  const selected = results.find((p) => p.branchId === selectedId) ?? results[0];

  const addr = addresses.find((a) => a._id === selectedAddrId) ?? addresses.find((a) => a.isDefault) ?? addresses[0];
  const areaLabel =
    (addr
      ? [addr.address.barangayName, addr.address.cityMunicipalityName].filter((s): s is string => !!s).join(", ")
      : "") || "Nearby providers";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <View style={{ flex: 1 }}>
        {/* Full-bleed map */}
        <MapView
          mode="pricePins"
          region={region}
          pins={pins}
          height={Dimensions.get("window").height}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 0, borderWidth: 0 }}
        />

        {/* Header pill: area + List toggle */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: SP.sm,
            paddingHorizontal: SP.screen,
            paddingTop: SP.sm,
          }}
        >
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: SP.sm,
              height: 44,
              paddingHorizontal: SP.base,
              borderRadius: RADIUS.pill,
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.border,
              ...SHADOW.md,
            }}
          >
            <Pressable accessibilityRole="button" accessibilityLabel="Back to list" onPress={() => backOr("/(tabs)")} hitSlop={8}>
              <ArrowLeft size={20} color={C.ink} />
            </Pressable>
            <MapPin size={16} color={C.primaryText} />
            <Text numberOfLines={1} style={{ flex: 1, fontSize: 15, fontWeight: "700", color: C.ink }}>
              {areaLabel}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show list"
              onPress={() => backOr("/(tabs)")}
              style={{
                height: 32,
                justifyContent: "center",
                paddingHorizontal: SP.md,
                borderRadius: RADIUS.pill,
                backgroundColor: C.primaryTint,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.primaryText }}>List</Text>
            </Pressable>
          </View>
        </View>

        {/* Bottom preview card for the selected pin */}
        {selected ? (
          <View style={{ position: "absolute", left: SP.screen, right: SP.screen, bottom: SP.xl }}>
            <ProviderCard
              data={toCardData(selected)}
              variant="mapPreview"
              favorite={selected.isFavorite}
              onPress={() =>
                router.push({ pathname: "/provider/[branchId]", params: { branchId: selected.branchId, type: selected.providerType } })
              }
            />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
