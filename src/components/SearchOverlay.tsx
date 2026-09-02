// src/components/SearchOverlay.tsx
// Inline search — a transparent overlay that keeps the user on Home. Tapping the
// search bar opens this: a dropdown of Recent searches, Services, and matching
// Providers, with live grouped suggestions as you type. Selecting a service
// filters the Home list; selecting a provider opens their profile; "See all
// results" opens the full results screen. Tapping the dim backdrop closes it.

import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { C, RADIUS, SP, SHADOW } from "@/theme/tokens";
import { Search, X, ArrowLeft, ChevronRight, Clock } from "@/theme/icons";
import { useDiscoveryStore } from "@/stores/discoveryStore";
import { RECENTS, pushRecent, clearRecents } from "@/lib/recentSearches";
import { BROWSE_CHIPS } from "@/features/provider/parts";
import type { ProviderCard } from "@/types/api";

function distanceLabel(km: number | null): string {
  if (km == null) return "";
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

function initialsOf(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function SectionLabel({ children, right }: Readonly<{ children: React.ReactNode; right?: React.ReactNode }>) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: SP.sm }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: C.textSecondary, letterSpacing: 0.3, textTransform: "uppercase" }}>{children}</Text>
      {right}
    </View>
  );
}

export function SearchOverlay({ open, onClose }: Readonly<{ open: boolean; onClose: () => void }>) {
  const insets = useSafeAreaInsets();
  const results = useDiscoveryStore((s) => s.results);
  const setFilter = useDiscoveryStore((s) => s.setFilter);

  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const serviceMatches = useMemo(
    () => (q ? BROWSE_CHIPS.filter((c) => c.label.toLowerCase().includes(q)) : BROWSE_CHIPS.slice(0, 4)),
    [q],
  );
  const providerMatches = useMemo(
    () => (q ? results.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6) : results.slice(0, 3)),
    [q, results],
  );

  function close() {
    setQuery("");
    onClose();
  }

  function openService(chip: { label: string; value: string }) {
    setFilter("category", chip.value);
    setFilter("search", "");
    pushRecent(chip.label);
    close();
  }

  function openProvider(p: ProviderCard) {
    close();
    router.push({ pathname: "/provider/[branchId]", params: { branchId: p.branchId, type: p.providerType } });
  }

  function seeAll(term: string) {
    const t = term.trim();
    if (!t) return;
    pushRecent(t);
    setFilter("search", t);
    close();
    router.push("/search");
  }

  const accentFor = (t: ProviderCard["providerType"]) => (t === "WASHER" ? { bg: C.washerTint, fg: C.washer } : { bg: C.primaryTint, fg: C.primary });

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.35)" }}>
        {/* Search field row */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: SP.sm, paddingHorizontal: SP.screen, paddingTop: insets.top + SP.sm, paddingBottom: SP.sm, backgroundColor: C.bg }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close search" onPress={close} hitSlop={8} style={{ padding: 4 }}>
            <ArrowLeft size={24} color={C.ink} />
          </Pressable>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: SP.sm, height: 44, paddingHorizontal: SP.md, borderRadius: RADIUS.lg, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}>
            <Search size={18} color={C.textMuted} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={(e) => seeAll(e.nativeEvent.text)}
              placeholder="Search services or providers"
              placeholderTextColor={C.textTertiary}
              returnKeyType="search"
              style={{ flex: 1, fontSize: 15, color: C.ink, paddingVertical: 0 }}
            />
            {query.length > 0 ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Clear text" onPress={() => setQuery("")} hitSlop={8}>
                <X size={18} color={C.textMuted} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Dropdown card (max ~60% height, scrollable) + dim backdrop below */}
        <View style={{ backgroundColor: C.bg, maxHeight: "62%", borderBottomLeftRadius: RADIUS.xl, borderBottomRightRadius: RADIUS.xl, ...SHADOW.md }}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SP.screen, gap: SP.lg }}>
            {/* Recent (only when not typing) */}
            {!q && RECENTS.length > 0 ? (
              <View>
                <SectionLabel right={<Pressable hitSlop={6} onPress={() => { clearRecents(); setQuery((s) => s); }}><Text style={{ fontSize: 13, fontWeight: "700", color: C.primaryText }}>Clear</Text></Pressable>}>Recent</SectionLabel>
                {RECENTS.map((r) => (
                  <Pressable key={r} onPress={() => setQuery(r)} style={{ flexDirection: "row", alignItems: "center", gap: SP.sm, paddingVertical: SP.sm }}>
                    <Clock size={16} color={C.textTertiary} />
                    <Text style={{ flex: 1, fontSize: 15, color: C.ink }}>{r}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {/* Services */}
            {serviceMatches.length > 0 ? (
              <View>
                <SectionLabel>{q ? "Services" : "Popular services"}</SectionLabel>
                {serviceMatches.map((c) => (
                  <Pressable key={c.value} onPress={() => openService(c)} style={{ flexDirection: "row", alignItems: "center", gap: SP.sm, paddingVertical: SP.sm }}>
                    <Search size={16} color={C.textTertiary} />
                    <Text style={{ flex: 1, fontSize: 15, color: C.ink }}>{c.label}</Text>
                    <ChevronRight size={16} color={C.textTertiary} />
                  </Pressable>
                ))}
              </View>
            ) : null}

            {/* Providers */}
            {providerMatches.length > 0 ? (
              <View>
                <SectionLabel>{q ? "Providers" : "Nearby providers"}</SectionLabel>
                {providerMatches.map((p) => {
                  const a = accentFor(p.providerType);
                  return (
                    <Pressable key={p.branchId} onPress={() => openProvider(p)} style={{ flexDirection: "row", alignItems: "center", gap: SP.md, paddingVertical: SP.sm }}>
                      <View style={{ width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: a.bg, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 12, fontWeight: "800", color: a.fg }}>{initialsOf(p.name)}</Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: "600", color: C.ink }}>{p.name}</Text>
                        <Text numberOfLines={1} style={{ fontSize: 12.5, color: C.textMuted }}>
                          {p.providerType === "WASHER" ? "Home Washer" : "Laundromat"}
                          {p.distanceKm != null ? ` · ${distanceLabel(p.distanceKm)}` : ""}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {/* See all results */}
            {q ? (
              <Pressable onPress={() => seeAll(query)} style={{ flexDirection: "row", alignItems: "center", gap: SP.sm, paddingVertical: SP.md, borderTopWidth: 1, borderTopColor: C.borderSubtle }}>
                <Search size={16} color={C.primaryText} />
                <Text style={{ flex: 1, fontSize: 15, fontWeight: "700", color: C.primaryText }}>See all results for “{query.trim()}”</Text>
                <ChevronRight size={16} color={C.primaryText} />
              </Pressable>
            ) : null}

            {q && serviceMatches.length === 0 && providerMatches.length === 0 ? (
              <Text style={{ fontSize: 14, color: C.textMuted, paddingVertical: SP.md }}>No quick matches — try “See all results”.</Text>
            ) : null}
          </ScrollView>
        </View>

        {/* Dim backdrop — tap to close */}
        <Pressable accessibilityLabel="Close search" style={{ flex: 1 }} onPress={close} />
      </View>
    </Modal>
  );
}
