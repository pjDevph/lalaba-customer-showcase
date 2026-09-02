// src/features/booking/parts.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Shared wizard chrome for the 7-step booking flow. Every step wraps its content
// in <WizardScreen>, which lays out the SafeAreaView shell, TopBar (back),
// StepCounter, title/subtitle, a scrollable body, and the StickyBookingFooter
// carrying the running estimate + Continue CTA.
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { backOr } from "@/lib/nav";
import { C, SP, RADIUS, TYPE } from "@/theme/tokens";
import { TopBar, StickyBookingFooter, Button } from "@/components";
import { ChevronRight, Check } from "@/theme/icons";
import { providerProfile } from "@/services/graphql/discovery";
import type {
  ProviderProfile,
  ProviderType,
  PricingType,
  ServiceUnit,
} from "@/types/api";
import { SERVICE_UNIT_WORDS } from "@/types/api";

// 3-step booking: Service & laundry → Pickup & return → Review & pay.
export const TOTAL_STEPS = 3;
export const STAGES = ["Service", "Pickup", "Review"] as const;

// Named 3-stage progress — clearer orientation than seven anonymous bars.
function NamedStages({ step }: Readonly<{ step: number }>) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {STAGES.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <React.Fragment key={label}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: active || done ? C.primary : C.surfaceAlt,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {done ? (
                  <Check size={14} color={C.textInverse} strokeWidth={3} />
                ) : (
                  <Text style={{ fontSize: 12, fontWeight: "800", color: active ? C.textInverse : C.textMuted }}>{n}</Text>
                )}
              </View>
              <Text style={{ fontSize: 12.5, fontWeight: active ? "800" : "600", color: active || done ? C.ink : C.textMuted }}>
                {label}
              </Text>
            </View>
            {i < STAGES.length - 1 ? (
              <View style={{ flex: 1, height: 2, marginHorizontal: SP.sm, borderRadius: 1, backgroundColor: done ? C.primary : C.borderSubtle }} />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─── Provider profile cache ───────────────────────────────────────────────────
// The booking store only carries providerId + providerType, so we fetch the
// provider's display info once and memoise it by branchId for the whole flow.
const _profileCache = new Map<string, ProviderProfile>();

export interface UseProviderResult {
  profile: ProviderProfile | null;
  name: string;
  areaLabel: string;
}

export function useProvider(
  branchId: string | null,
  providerType: ProviderType | null,
): UseProviderResult {
  const cached = branchId ? _profileCache.get(branchId) ?? null : null;
  const [profile, setProfile] = React.useState<ProviderProfile | null>(cached);

  React.useEffect(() => {
    let alive = true;
    if (!branchId || !providerType) return;
    if (_profileCache.has(branchId)) {
      setProfile(_profileCache.get(branchId) ?? null);
      return;
    }
    providerProfile(branchId, providerType)
      .then((p) => {
        _profileCache.set(branchId, p);
        if (alive) setProfile(p);
      })
      .catch(() => {
        /* name falls back gracefully */
      });
    return () => {
      alive = false;
    };
  }, [branchId, providerType]);

  return {
    profile,
    name: profile?.name ?? "your provider",
    areaLabel: profile?.areaLabel ?? "your area",
  };
}

// ─── WizardScreen shell ───────────────────────────────────────────────────────
export interface WizardScreenProps {
  step: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Running estimate (centavos) for the footer; omit to hide the estimate. */
  estimateCentavos?: number;
  /** Optional high end — renders the footer as a range "₱x – ₱y". */
  estimateMaxCentavos?: number;
  estimateLabel?: string;
  estimateHint?: string;
  ctaLabel?: string;
  onContinue: () => void;
  ctaDisabled?: boolean;
  ctaLoading?: boolean;
  onBack?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
}

export function WizardScreen({
  step,
  title,
  subtitle,
  children,
  estimateCentavos,
  estimateMaxCentavos,
  estimateLabel,
  estimateHint,
  ctaLabel = "Continue",
  onContinue,
  ctaDisabled = false,
  ctaLoading = false,
  onBack,
  contentStyle,
}: Readonly<WizardScreenProps>) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <TopBar onBack={onBack ?? (() => backOr("/(tabs)"))} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          { paddingHorizontal: SP.screen, paddingTop: SP.sm, paddingBottom: SP.xl },
          contentStyle,
        ]}
      >
        {/* Named 3-stage progress, then title/subtitle. */}
        <View style={{ marginBottom: SP.lg }}>
          <NamedStages step={step} />
        </View>
        <Text style={{ fontSize: 18, fontWeight: "800", color: C.ink }}>{title}</Text>
        {subtitle ? (
          <Text style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 18, marginTop: 2, marginBottom: SP.lg }}>
            {subtitle}
          </Text>
        ) : (
          <View style={{ marginBottom: SP.lg }} />
        )}
        {children}
      </ScrollView>
      <StickyBookingFooter
        estimateCentavos={estimateCentavos}
        estimateMaxCentavos={estimateMaxCentavos}
        estimateLabel={estimateLabel}
        estimateHint={estimateHint}
        ctaLabel={ctaLabel}
        onPressCta={onContinue}
        ctaDisabled={ctaDisabled}
        ctaLoading={ctaLoading}
        safeBottom={insets.bottom}
      />
    </SafeAreaView>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
export function SectionLabel({ children, style }: Readonly<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }>) {
  return (
    <Text style={[{ ...TYPE.label, marginBottom: SP.md }, style]}>{children}</Text>
  );
}

// ─── Card container ───────────────────────────────────────────────────────────
export function Card({ children, style }: Readonly<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }>) {
  return (
    <View
      style={[
        {
          backgroundColor: C.surface,
          borderRadius: RADIUS.xl,
          borderWidth: 1,
          borderColor: C.border,
          padding: SP.base,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ─── Editable summary row (review screen) ─────────────────────────────────────
export interface EditableRowProps {
  label: string;
  value: string;
  secondary?: string;
  onEdit?: () => void;
}

export function EditableRow({ label, value, secondary, onEdit }: Readonly<EditableRowProps>) {
  return (
    <View style={{ paddingVertical: SP.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: SP.md }}>
        <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: C.ink }}>{label}</Text>
        {onEdit ? <EditLink onPress={onEdit} /> : null}
      </View>
      <Text style={{ fontSize: 13, color: C.textMuted, lineHeight: 19, marginTop: 3 }}>{value}</Text>
      {secondary ? (
        <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 1 }}>{secondary}</Text>
      ) : null}
    </View>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: C.borderSubtle }} />;
}

// ─── Inline "Edit" link ───────────────────────────────────────────────────────
export function EditLink({ onPress }: Readonly<{ onPress: () => void }>) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: C.primaryText }}>Edit</Text>
      <ChevronRight size={16} color={C.primaryText} strokeWidth={2.5} />
    </Pressable>
  );
}

// ─── Provider initials avatar ─────────────────────────────────────────────────
export function Initials({ text }: Readonly<{ text: string }>) {
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: RADIUS.md,
        backgroundColor: C.primaryTint,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: "800", color: C.primaryText }}>{text}</Text>
    </View>
  );
}

// ─── Muted footnote / disclaimer text ─────────────────────────────────────────
export function MutedNote({
  children,
  color = C.textMuted,
  style,
}: Readonly<{ children: React.ReactNode; color?: string; style?: StyleProp<TextStyle> }>) {
  return (
    <Text style={[{ fontSize: 12, color, lineHeight: 18 }, style]}>{children}</Text>
  );
}

// ─── Full-screen loader ───────────────────────────────────────────────────────
export function CenterLoader() {
  return (
    <View style={{ paddingVertical: SP["3xl"], alignItems: "center" }}>
      <ActivityIndicator color={C.primaryText} />
    </View>
  );
}

// ─── Address-missing prompt ───────────────────────────────────────────────────
export function AddressPrompt() {
  return (
    <Card style={{ borderColor: C.warning, backgroundColor: C.warningTint, marginTop: SP.base }}>
      <Text style={{ fontSize: 14, fontWeight: "700", color: C.ink }}>Add a delivery address</Text>
      <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 4, lineHeight: 19 }}>
        We need a delivery address before you can schedule a pickup.
      </Text>
      <Button
        label="Choose an address"
        variant="secondary"
        size="sm"
        onPress={() => router.push("/address-select")}
        style={{ marginTop: SP.md }}
      />
    </Card>
  );
}

// ─── Pricing helpers ──────────────────────────────────────────────────────────
//
// PER_LOAD_WITH_CAPACITY is a home washer charging by machine load: the price
// is per load and `baseKilos` is how much fits in one. The customer still
// enters a WEIGHT — she has a basket, not a number of loads — so it counts as
// a weight-based service everywhere the input is concerned, and only the
// arithmetic differs.
export function unitFor(pricingType: PricingType): "kg" | "load" | "item" {
  switch (pricingType) {
    case "PER_PIECE":
      return "item";
    case "PER_LOAD":
    case "PER_LOAD_WITH_CAPACITY":
      return "load";
    default:
      return "kg";
  }
}

/**
 * What a counted service is actually counting, for the quantity prompt.
 *
 * The provider chose a specific unit — pairs of shoes, panels of curtain — and
 * "How many items?" throws that away at the one moment it matters, when the
 * customer is deciding what to enter. Falls back to the generic word when the
 * service is not counted or predates the unit field.
 */
export function countedUnitWord(svc: {
  pricingType: PricingType;
  unit?: ServiceUnit | null;
}): string {
  if (svc.pricingType !== "PER_PIECE") return unitFor(svc.pricingType);
  return svc.unit ? SERVICE_UNIT_WORDS[svc.unit] : "item";
}

/** Pluralises a unit word for a count — "1 pair", "2 pairs". */
export function pluralUnit(word: string, count: number): string {
  return count === 1 ? word : `${word}s`;
}

/**
 * Clamps a requested count to the provider's own limits.
 *
 * The backend rejects an out-of-range booking outright, so without this the
 * customer only discovers the limit after filling in the whole wizard and
 * pressing Book. At minimum one, always: a counted line with no count prices
 * to zero.
 */
/**
 * States the provider's limits before the stepper hits them, so a customer who
 * cannot go below two knows why rather than finding the minus button dead.
 */
export function quantityLimitHint(svc: {
  pricingType: PricingType;
  unit?: ServiceUnit | null;
  minQuantity?: number | null;
  maxQuantity?: number | null;
}): string | null {
  if (svc.pricingType !== "PER_PIECE") return null;
  const { minQuantity: min, maxQuantity: max } = svc;
  if (min == null && max == null) return null;
  const word = countedUnitWord(svc);
  if (min != null && max != null) {
    return min === max
      ? `This provider takes exactly ${min} ${pluralUnit(word, min)}.`
      : `This provider takes ${min}–${max} ${pluralUnit(word, max)}.`;
  }
  if (min != null) {
    return `This provider takes at least ${min} ${pluralUnit(word, min)}.`;
  }
  return `This provider takes up to ${max} ${pluralUnit(word, max!)}.`;
}

export function clampQuantity(
  requested: number,
  svc: { minQuantity?: number | null; maxQuantity?: number | null },
): number {
  const floor = Math.max(1, svc.minQuantity ?? 1);
  const ceiling = svc.maxQuantity ?? Number.POSITIVE_INFINITY;
  return Math.min(Math.max(requested, floor), Math.max(floor, ceiling));
}

/** Loads needed for a weight — a part load still occupies the whole machine. */
export function loadsFor(kg: number, capacityKg?: number | null): number {
  if (!capacityKg || capacityKg <= 0) return 1;
  return Math.max(1, Math.ceil(kg / capacityKg));
}

// Short per-unit suffix for inline prices, e.g. "₱65/kg".
export function unitShort(pricingType: PricingType): string {
  switch (pricingType) {
    case "PER_PIECE":
      return "pc";
    case "PER_LOAD":
    case "PER_LOAD_WITH_CAPACITY":
      return "load";
    default:
      return "kg";
  }
}

export function unitWord(pricingType: PricingType): string {
  switch (pricingType) {
    case "PER_PIECE":
      return "per piece";
    case "PER_LOAD":
    case "PER_LOAD_WITH_CAPACITY":
      return "per load";
    default:
      return "per kg";
  }
}
