// src/features/booking/ServiceCatalogOverlay.tsx
// The full-screen catalog/search overlay and the small controls used by the
// Step-1 service cart. Split out of service.tsx (F2, 600-line limit).
//
// This is deliberately NOT a react-native Modal: rendered inside the screen's
// own tree, KeyboardAvoidingView can resize the results area instead of the OS
// keyboard covering a fixed-height sheet.
// Lives under src/, not app/: expo-router scans every file in app/ and warns
// "missing the required default export" for anything that is not a route —
// the `_` prefix does NOT exempt it (only _layout is special).
import React from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, SP, RADIUS } from "@/theme/tokens";
import { Plus, Minus, Search, X, ArrowLeft } from "@/theme/icons";
import type { ProviderServiceItem, ServiceCategory } from "@/types/api";
import { CATEGORY_LABELS } from "@/features/booking/serviceHelpers";

export function Stepper({ onPress, icon }: Readonly<{ onPress: () => void; icon: "plus" | "minus" }>) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={{ width: 44, height: 44, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", backgroundColor: C.surface }}>
      {icon === "plus" ? <Plus size={20} color={C.ink} strokeWidth={2.5} /> : <Minus size={20} color={C.ink} strokeWidth={2.5} />}
    </Pressable>
  );
}

// Non-interactive-looking search field that just opens the full catalog,
// already focused for typing — avoids running two separate search inputs.
export function SearchBarButton({ onPress, style }: Readonly<{ onPress: () => void; style?: object }>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Search services"
      onPress={onPress}
      style={[{ flexDirection: "row", alignItems: "center", gap: SP.sm, backgroundColor: C.surfaceAlt, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border, paddingHorizontal: SP.md, paddingVertical: SP.sm + 2 }, style]}
    >
      <Search size={16} color={C.textTertiary} />
      <Text style={{ fontSize: 14, color: C.textTertiary }}>Search services</Text>
    </Pressable>
  );
}

// ─── Full-screen catalog / search overlay ──────────────────────────────────
// Rendered in place of the wizard step (not a react-native Modal) so
// KeyboardAvoidingView can actually resize the results area instead of the
// OS keyboard just sitting on top of a fixed-height sheet.
export interface ServiceCatalogOverlayProps {
  providerName: string;
  totalCount: number;
  results: ProviderServiceItem[];
  selectedCount: number;
  query: string;
  onQueryChange: (q: string) => void;
  autoFocusSearch: boolean;
  categories: ServiceCategory[];
  showCategoryChips: boolean;
  activeCategory: ServiceCategory | "ALL";
  onCategoryChange: (c: ServiceCategory | "ALL") => void;
  onClose: () => void;
  renderRow: (svc: ProviderServiceItem) => React.ReactNode;
}

export function ServiceCatalogOverlay({
  providerName,
  totalCount,
  results,
  selectedCount,
  query,
  onQueryChange,
  autoFocusSearch,
  categories,
  showCategoryChips,
  activeCategory,
  onCategoryChange,
  onClose,
  renderRow,
}: Readonly<ServiceCatalogOverlayProps>) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: SP.screen, paddingBottom: SP.sm, gap: SP.sm }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={8} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", marginLeft: -8 }}>
          <ArrowLeft size={24} color={C.ink} strokeWidth={2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: C.ink }}>All {totalCount} services</Text>
          <Text style={{ fontSize: 12, color: C.textMuted }}>{providerName}</Text>
        </View>
        {selectedCount > 0 ? (
          <Text style={{ fontSize: 13, fontWeight: "700", color: C.primaryText }}>{selectedCount} selected</Text>
        ) : null}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={8}>
        <View style={{ paddingHorizontal: SP.screen, paddingBottom: SP.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: SP.sm, backgroundColor: C.surfaceAlt, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border, paddingHorizontal: SP.md }}>
            <Search size={16} color={C.textTertiary} />
            <TextInput
              autoFocus={autoFocusSearch}
              placeholder="Search services..."
              placeholderTextColor={C.textTertiary}
              value={query}
              onChangeText={onQueryChange}
              style={{ flex: 1, paddingVertical: SP.sm, fontSize: 14, color: C.ink }}
            />
            {query.length > 0 ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => onQueryChange("")} hitSlop={8}>
                <X size={16} color={C.textTertiary} />
              </Pressable>
            ) : null}
          </View>

          {showCategoryChips ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: SP.sm }} contentContainerStyle={{ gap: SP.xs }}>
              <CategoryChip label="All" active={activeCategory === "ALL"} onPress={() => onCategoryChange("ALL")} />
              {categories.map((c) => (
                <CategoryChip key={c} label={CATEGORY_LABELS[c]} active={activeCategory === c} onPress={() => onCategoryChange(c)} />
              ))}
            </ScrollView>
          ) : null}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: SP.screen, paddingBottom: SP.xl }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: SP.sm }}>
            {results.map(renderRow)}
            {results.length === 0 ? (
              <Text style={{ fontSize: 13, color: C.textMuted, textAlign: "center", paddingVertical: SP.xl }}>
                {query ? `No services match "${query}"` : `No services in this category`}
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function CategoryChip({ label, active, onPress }: Readonly<{ label: string; active: boolean; onPress: () => void }>) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ borderRadius: RADIUS.pill, paddingHorizontal: SP.md, paddingVertical: 7, borderWidth: 1, borderColor: active ? C.primary : C.border, backgroundColor: active ? C.primaryTint : C.surface }}
    >
      <Text style={{ fontSize: 12.5, fontWeight: "700", color: active ? C.primary : C.textSecondary }}>{label}</Text>
    </Pressable>
  );
}
