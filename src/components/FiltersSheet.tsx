// src/components/FiltersSheet.tsx
// Bottom-sheet filter panel — the structured home for everything that used to
// clutter the home chip rows: provider type, distance, services, minimum
// rating, and open-now. Edits a local draft and shows a live "Show N providers"
// count; Apply writes the draft to the discovery store and re-searches.

import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, RADIUS, SP, SHADOW } from "@/theme/tokens";
import { X } from "@/theme/icons";
import { useDiscoveryStore, DEFAULT_RADIUS_KM } from "@/stores/discoveryStore";
import { discoverProviders } from "@/services/graphql/discovery";
import type { ProviderTypeFilter } from "@/types/api";
import { CATEGORY_CHIPS } from "@/features/provider/parts";

const TYPE_OPTS: readonly { label: string; value: ProviderTypeFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Laundromats", value: "MERCHANT" },
  { label: "Home Washers", value: "WASHER" },
];
const DISTANCE_OPTS: readonly { label: string; km: number }[] = [
  { label: "Any", km: DEFAULT_RADIUS_KM },
  { label: "1 km", km: 1 },
  { label: "3 km", km: 3 },
  { label: "5 km", km: 5 },
  { label: "10 km", km: 10 },
];
const RATING_OPTS: readonly { label: string; value: number | null }[] = [
  { label: "Any", value: null },
  { label: "4.0+", value: 4 },
  { label: "4.5+", value: 4.5 },
];

interface Draft {
  providerType: ProviderTypeFilter;
  radiusKm: number;
  category: string | null;
  minRating: number | null;
  openNow: boolean;
}

function Pill({ label, active, onPress }: Readonly<{ label: string; active: boolean; onPress: () => void }>) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        paddingHorizontal: SP.base,
        height: 38,
        justifyContent: "center",
        borderRadius: RADIUS.pill,
        borderWidth: 1,
        borderColor: active ? C.primary : C.border,
        backgroundColor: active ? C.primary : C.surface,
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: "600", color: active ? C.textInverse : C.ink }}>{label}</Text>
    </Pressable>
  );
}

function Group({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <View style={{ gap: SP.sm }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color: C.ink }}>{title}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SP.sm }}>{children}</View>
    </View>
  );
}

export function FiltersSheet({ open, onClose }: Readonly<{ open: boolean; onClose: () => void }>) {
  const insets = useSafeAreaInsets();
  const filters = useDiscoveryStore((s) => s.filters);
  const setFilter = useDiscoveryStore((s) => s.setFilter);
  const search = useDiscoveryStore((s) => s.search);

  const [draft, setDraft] = useState<Draft>({
    providerType: filters.providerType,
    radiusKm: filters.radiusKm,
    category: filters.category,
    minRating: filters.minRating,
    openNow: filters.openNow,
  });

  // Sync the draft from the live filters each time the sheet opens.
  useEffect(() => {
    if (open) {
      setDraft({
        providerType: filters.providerType,
        radiusKm: filters.radiusKm,
        category: filters.category,
        minRating: filters.minRating,
        openNow: filters.openNow,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  // Live "Show N providers" count for the current draft (debounced, off-store).
  const [count, setCount] = useState<number | null>(null);
  const lat = filters.latitude;
  const lng = filters.longitude;
  const sort = filters.sort;
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setCount(null);
    const t = setTimeout(async () => {
      try {
        const input: Parameters<typeof discoverProviders>[0] = { providerType: draft.providerType, sort, radiusKm: draft.radiusKm };
        if (draft.category) input.category = draft.category;
        if (lat != null) input.latitude = lat;
        if (lng != null) input.longitude = lng;
        if (draft.minRating != null) input.minRating = draft.minRating;
        if (draft.openNow) input.openNow = true;
        const r = await discoverProviders(input);
        if (!cancelled) setCount(r.length);
      } catch {
        if (!cancelled) setCount(null);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [open, draft, lat, lng, sort]);

  const isDirty = useMemo(
    () =>
      draft.providerType !== "ALL" ||
      draft.radiusKm !== DEFAULT_RADIUS_KM ||
      draft.category != null ||
      draft.minRating != null ||
      draft.openNow,
    [draft],
  );

  function apply() {
    setFilter("providerType", draft.providerType);
    setFilter("radiusKm", draft.radiusKm);
    setFilter("category", draft.category);
    setFilter("minRating", draft.minRating);
    setFilter("openNow", draft.openNow);
    void search();
    onClose();
  }

  function reset() {
    setDraft({ providerType: "ALL", radiusKm: DEFAULT_RADIUS_KM, category: null, minRating: null, openNow: false });
  }

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.4)", justifyContent: "flex-end" }}>
        <Pressable style={{ flex: 1 }} accessibilityLabel="Close filters" onPress={onClose} />
        <View style={{ backgroundColor: C.bg, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, maxHeight: "88%", ...SHADOW.md }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SP.screen, paddingTop: SP.base, paddingBottom: SP.sm }}>
            <Pressable accessibilityLabel="Close" onPress={onClose} hitSlop={8}><X size={22} color={C.ink} /></Pressable>
            <Text style={{ fontSize: 17, fontWeight: "800", color: C.ink }}>Filters</Text>
            <Pressable onPress={reset} hitSlop={8} disabled={!isDirty}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: isDirty ? C.primary : C.textTertiary }}>Reset</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SP.screen, gap: SP.xl }}>
            <Group title="Provider type">
              {TYPE_OPTS.map((o) => (
                <Pill key={o.value} label={o.label} active={draft.providerType === o.value} onPress={() => patch({ providerType: o.value })} />
              ))}
            </Group>

            <Group title="Distance">
              {DISTANCE_OPTS.map((o) => (
                <Pill key={o.label} label={o.label} active={draft.radiusKm === o.km} onPress={() => patch({ radiusKm: o.km })} />
              ))}
            </Group>

            <Group title="Service">
              <Pill label="Any" active={draft.category == null} onPress={() => patch({ category: null })} />
              {CATEGORY_CHIPS.map((c) => (
                <Pill key={c.value} label={c.label} active={draft.category === c.value} onPress={() => patch({ category: draft.category === c.value ? null : c.value })} />
              ))}
            </Group>

            <Group title="Minimum rating">
              {RATING_OPTS.map((o) => (
                <Pill key={o.label} label={o.label} active={draft.minRating === o.value} onPress={() => patch({ minRating: o.value })} />
              ))}
            </Group>

            {/* Open now toggle */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View>
                <Text style={{ fontSize: 15, fontWeight: "700", color: C.ink }}>Open now</Text>
                <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>Only show providers currently accepting orders</Text>
              </View>
              <Switch
                value={draft.openNow}
                onValueChange={(v) => patch({ openNow: v })}
                trackColor={{ false: C.borderSubtle, true: C.primaryTint }}
                thumbColor={draft.openNow ? C.primary : C.surface}
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={{ paddingHorizontal: SP.screen, paddingTop: SP.sm, paddingBottom: insets.bottom + SP.base, borderTopWidth: 1, borderTopColor: C.borderSubtle }}>
            <Pressable
              accessibilityRole="button"
              onPress={apply}
              style={{ height: 52, borderRadius: RADIUS.lg, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontSize: 16, fontWeight: "800", color: C.textInverse }}>
                {count == null ? "Show results" : `Show ${count} provider${count === 1 ? "" : "s"}`}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Count of active (non-default) filters, for the "Filters • N" chip.
export function activeFilterCount(f: {
  providerType: ProviderTypeFilter;
  radiusKm: number;
  category: string | null;
  minRating: number | null;
  openNow: boolean;
}): number {
  let n = 0;
  if (f.providerType !== "ALL") n++;
  if (f.radiusKm !== DEFAULT_RADIUS_KM) n++;
  if (f.category != null) n++;
  if (f.minRating != null) n++;
  if (f.openNow) n++;
  return n;
}
