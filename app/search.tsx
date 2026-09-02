// app/search.tsx  (038 empty + 039 results)
// Focused search: recent searches + browse categories when empty; a results
// toolbar (filters · sort · count) with compact provider cards when querying.

import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { backOr } from "@/lib/nav";
import { C, SP, RADIUS } from "@/theme/tokens";
import { Search, X, ArrowLeft, SlidersHorizontal } from "@/theme/icons";
import { Chip, ProviderCard } from "@/components";
import { useDiscoveryStore } from "@/stores/discoveryStore";
import type { ProviderSort } from "@/types/api";
import { toCardData, BROWSE_CHIPS, LoadingState, EmptyState } from "@/features/provider/parts";
import { RECENTS, pushRecent, clearRecents } from "@/lib/recentSearches";

const SORT_LABEL: Record<ProviderSort, string> = {
  NEAREST: "Nearest first",
  TOP_RATED: "Top rated",
};

export default function SearchScreen() {
  const filters = useDiscoveryStore((s) => s.filters);
  const results = useDiscoveryStore((s) => s.results);
  const isLoading = useDiscoveryStore((s) => s.isLoading);
  const setFilter = useDiscoveryStore((s) => s.setFilter);
  const search = useDiscoveryStore((s) => s.search);

  const [text, setText] = useState(filters.search);
  const [, force] = useState(0); // re-render when RECENTS mutates
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasQuery = text.trim().length > 0;

  // Debounced live search as the query changes.
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const term = text.trim();
    if (!term) return;
    debounce.current = setTimeout(() => {
      setFilter("search", term);
      void search();
    }, 350);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [text, setFilter, search]);

  // Clear the shared search filter when leaving so Home isn't left filtered.
  useEffect(() => {
    return () => {
      setFilter("search", "");
      void search();
    };
  }, [setFilter, search]);

  function submit(term: string) {
    const t = term.trim();
    if (!t) return;
    pushRecent(t);
    force((n) => n + 1);
    setText(t);
    setFilter("search", t);
    void search();
  }

  function toggleSort() {
    const next: ProviderSort = filters.sort === "NEAREST" ? "TOP_RATED" : "NEAREST";
    setFilter("sort", next);
    void search();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      {/* Search field row */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: SP.sm, paddingHorizontal: SP.screen, paddingVertical: SP.sm }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => backOr("/(tabs)")} hitSlop={8} style={{ padding: 4 }}>
          <ArrowLeft size={24} color={C.ink} />
        </Pressable>
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: SP.sm,
            height: 44,
            paddingHorizontal: SP.md,
            borderRadius: RADIUS.lg,
            backgroundColor: C.surface,
            borderWidth: 1,
            borderColor: C.border,
          }}
        >
          <Search size={18} color={C.textMuted} />
          <TextInput
            autoFocus
            value={text}
            onChangeText={setText}
            onSubmitEditing={(e) => submit(e.nativeEvent.text)}
            placeholder="Search services or providers"
            placeholderTextColor={C.textTertiary}
            returnKeyType="search"
            style={{ flex: 1, fontSize: 15, color: C.ink, paddingVertical: 0 }}
          />
          {hasQuery ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setText("")} hitSlop={8}>
              <X size={18} color={C.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {!hasQuery ? (
        // ── 038: empty state ──────────────────────────────────────────────────
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SP.screen, gap: SP.xl }}>
          {RECENTS.length > 0 ? (
            <View style={{ gap: SP.md }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: C.ink }}>Recent searches</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    clearRecents();
                    force((n) => n + 1);
                  }}
                  hitSlop={6}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: C.primaryText }}>Clear</Text>
                </Pressable>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SP.sm }}>
                {RECENTS.map((r) => (
                  <Chip key={r} label={r} onPress={() => submit(r)} />
                ))}
              </View>
            </View>
          ) : null}

          <View style={{ gap: SP.md }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: C.ink }}>Browse services</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SP.sm }}>
              {BROWSE_CHIPS.map((c) => (
                <Chip
                  key={c.value}
                  label={c.label}
                  onPress={() => {
                    setFilter("category", c.value);
                    submit(c.label);
                  }}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        // ── 039: results ──────────────────────────────────────────────────────
        <>
          {/* Toolbar */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: SP.sm,
              paddingHorizontal: SP.screen,
              paddingBottom: SP.sm,
            }}
          >
            <Pressable
              accessibilityRole="button"
              onPress={() => {}}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                height: 34,
                paddingHorizontal: SP.md,
                borderRadius: RADIUS.pill,
                borderWidth: 1,
                borderColor: C.border,
                backgroundColor: C.surface,
              }}
            >
              <SlidersHorizontal size={16} color={C.ink} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: C.ink }}>Filters</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change sort order"
              onPress={toggleSort}
              style={{
                height: 34,
                justifyContent: "center",
                paddingHorizontal: SP.md,
                borderRadius: RADIUS.pill,
                borderWidth: 1,
                borderColor: C.border,
                backgroundColor: C.surface,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: C.primaryText }}>{SORT_LABEL[filters.sort]}</Text>
            </Pressable>

            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={{ fontSize: 13, color: C.textMuted }}>
                {results.length} result{results.length === 1 ? "" : "s"}
              </Text>
            </View>
          </View>

          {isLoading && results.length === 0 ? (
            <LoadingState label="Searching…" />
          ) : results.length === 0 ? (
            <EmptyState
              title="No matches"
              body={`Nothing found for "${text.trim()}". Try a different term or category.`}
              icon={<Search size={28} color={C.textTertiary} />}
            />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SP.screen, gap: SP.md, paddingTop: 0 }}>
              {results.map((p) => (
                <ProviderCard
                  key={p.branchId}
                  data={toCardData(p)}
                  variant="compact"
                  favorite={p.isFavorite}
                  onPress={() =>
                    router.push({ pathname: "/provider/[branchId]", params: { branchId: p.branchId, type: p.providerType } })
                  }
                />
              ))}
            </ScrollView>
          )}
        </>
      )}
    </SafeAreaView>
  );
}
