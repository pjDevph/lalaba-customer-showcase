// app/booking/service.tsx — Step 1 of 3: a service CART.
// Pick one or more services; each selected service gets its own quantity model
// (basket size for weight, count for per-item/load), an optional per-service
// note, and its own subtotal. A single shared bag count can't describe mixed
// services, so everything is per-line. Order-level pickup instructions live in
// Step 3 — separate concept.
//
// Catalog picking is a full-screen overlay (not a react-native Modal) layered
// inside this screen's own tree — a plain Modal doesn't reflow around the
// keyboard, so a search input near the bottom of a sheet gets covered. Being
// part of the normal view hierarchy lets KeyboardAvoidingView do its job.
import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { C, SP, RADIUS, peso } from "@/theme/tokens";
import { Check, Plus, ShoppingBasket } from "@/theme/icons";
import { InfoBanner } from "@/components";
import { providerServices } from "@/services/graphql/discovery";
import { useBookingStore } from "@/stores/bookingStore";
import type { ProviderServiceItem, ServiceCategory } from "@/types/api";
import {
  WizardScreen,
  useProvider,
  CenterLoader,
  unitFor,
  SectionLabel,
  Card,
  clampQuantity,
  countedUnitWord,
  pluralUnit,
  quantityLimitHint,
} from "@/features/booking/parts";
import {
  SIZES,
  CATALOG_PREVIEW,
  CATEGORY_CHIP_THRESHOLD,
  isWeight,
  sizeOfKg,
  weightPriceAt,
  rateSuffix,
  sizeSubtitle,
  lineRange,
  money,
} from "@/features/booking/serviceHelpers";
import { Stepper, SearchBarButton, ServiceCatalogOverlay } from "@/features/booking/ServiceCatalogOverlay";


export default function ServiceStep() {
  const branchId = useBookingStore((s) => s.providerId);
  const providerType = useBookingStore((s) => s.providerType);
  const serviceLines = useBookingStore((s) => s.serviceLines);
  const upsertServiceLine = useBookingStore((s) => s.upsertServiceLine);
  const removeServiceLine = useBookingStore((s) => s.removeServiceLine);
  const refreshQuote = useBookingStore((s) => s.refreshQuote);

  const { name } = useProvider(branchId, providerType);
  const [services, setServices] = React.useState<ProviderServiceItem[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [unsure, setUnsure] = React.useState<Set<string>>(new Set());
  const [manual, setManual] = React.useState<Set<string>>(new Set());
  const [manualText, setManualText] = React.useState<Record<string, string>>({});
  const [catalogOpen, setCatalogOpen] = React.useState(false);
  const [focusSearch, setFocusSearch] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<ServiceCategory | "ALL">("ALL");

  React.useEffect(() => {
    if (!branchId || !providerType) return;
    let alive = true;
    providerServices(branchId, providerType)
      .then((list) => alive && setServices(list))
      .catch(() => alive && setLoadError("Could not load this provider's services."));
    return () => { alive = false; };
  }, [branchId, providerType]);

  const svcById = React.useMemo(() => new Map((services ?? []).map((s) => [s.serviceRefId, s])), [services]);
  const categories = React.useMemo(() => {
    const set = new Set<ServiceCategory>();
    (services ?? []).forEach((s) => { if (s.category) set.add(s.category); });
    return Array.from(set);
  }, [services]);
  const showCategoryChips = (services ?? []).length >= CATEGORY_CHIP_THRESHOLD && categories.length > 1;

  const filteredServices = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return (services ?? []).filter((s) => {
      if (category !== "ALL" && s.category !== category) return false;
      if (q && !s.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [services, query, category]);
  const isAdded = (refId: string) => serviceLines.some((l) => l.serviceRefId === refId);

  const openCatalog = (opts: { focusSearch: boolean }) => {
    setFocusSearch(opts.focusSearch);
    setCatalogOpen(true);
  };
  const closeCatalog = () => {
    setCatalogOpen(false);
    setQuery("");
    setCategory("ALL");
  };

  const addService = (svc: ProviderServiceItem) => {
    upsertServiceLine({
      serviceRefId: svc.serviceRefId,
      serviceName: svc.name,
      estimatedPieceCount: isWeight(svc.pricingType)
        ? undefined
        : clampQuantity(1, svc),
    });
    void refreshQuote();
  };
  const remove = (refId: string) => {
    removeServiceLine(refId);
    setUnsure((u) => { const n = new Set(u); n.delete(refId); return n; });
    void refreshQuote();
  };
  const patchLine = (refId: string, patch: Partial<{ estimatedWeightKg?: number; estimatedPieceCount?: number; note?: string }>) => {
    const line = serviceLines.find((l) => l.serviceRefId === refId);
    if (!line) return;
    upsertServiceLine({ ...line, ...patch });
  };
  const setSize = (refId: string, kg: number) => {
    setUnsure((u) => { const n = new Set(u); n.delete(refId); return n; });
    setManual((m) => { const n = new Set(m); n.delete(refId); return n; });
    patchLine(refId, { estimatedWeightKg: kg });
    void refreshQuote();
  };
  const setUnsureLine = (refId: string) => {
    setUnsure((u) => new Set(u).add(refId));
    setManual((m) => { const n = new Set(m); n.delete(refId); return n; });
    patchLine(refId, { estimatedWeightKg: undefined });
    void refreshQuote();
  };
  // Precise customers (a kitchen scale, a prior weigh-in) shouldn't be forced
  // into the nearest bucket — this writes the same estimatedWeightKg field the
  // buckets do, just with an exact value instead of a midpoint.
  const setManualLine = (refId: string) => {
    setUnsure((u) => { const n = new Set(u); n.delete(refId); return n; });
    setManual((m) => new Set(m).add(refId));
    const line = serviceLines.find((l) => l.serviceRefId === refId);
    setManualText((t) => ({ ...t, [refId]: line?.estimatedWeightKg != null ? String(line.estimatedWeightKg) : "" }));
  };
  const setManualText_ = (refId: string, text: string) => {
    setManualText((t) => ({ ...t, [refId]: text }));
    const kg = parseFloat(text);
    patchLine(refId, { estimatedWeightKg: text.trim() !== "" && Number.isFinite(kg) && kg > 0 ? kg : undefined });
    void refreshQuote();
  };
  // Clamped to the provider's own limits, not just >= 1: the backend rejects an
  // out-of-range count outright, and discovering that after the whole wizard is
  // a worse experience than a stepper that simply stops.
  const setCount = (refId: string, n: number, svc?: ProviderServiceItem) => {
    patchLine(refId, {
      estimatedPieceCount: svc ? clampQuantity(n, svc) : Math.max(1, n),
    });
    void refreshQuote();
  };

  // A line is complete when its quantity is known (or explicitly "not sure").
  const lineComplete = (refId: string) => {
    const line = serviceLines.find((l) => l.serviceRefId === refId);
    const svc = svcById.get(refId);
    if (!line || !svc) return false;
    if (isWeight(svc.pricingType)) return line.estimatedWeightKg != null || unsure.has(refId);
    return (line.estimatedPieceCount ?? 0) >= 1;
  };
  const firstIncomplete = serviceLines.find((l) => !lineComplete(l.serviceRefId));

  // Aggregate the per-line ranges into a booking-wide low/high estimate.
  const [totalMin, totalMax] = serviceLines.reduce<[number, number]>(
    ([lo, hi], l) => {
      const svc = svcById.get(l.serviceRefId);
      const r = svc ? lineRange(svc, l.estimatedWeightKg, l.estimatedPieceCount, unsure.has(l.serviceRefId), manual.has(l.serviceRefId)) : undefined;
      return r ? [lo + r[0], hi + r[1]] : [lo, hi];
    },
    [0, 0],
  );

  const ctaLabel = serviceLines.length === 0 ? "Add a service" : "Continue";
  const estimateHint = firstIncomplete
    ? `Choose an amount for ${firstIncomplete.serviceName}`
    : undefined;

  const serviceRow = (svc: ProviderServiceItem) => {
    const added = isAdded(svc.serviceRefId);
    return (
      <View key={svc.serviceRefId} style={{ flexDirection: "row", alignItems: "center", gap: SP.md, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.lg, paddingHorizontal: SP.base, paddingVertical: SP.md }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: C.ink }} numberOfLines={1}>{svc.name}</Text>
          <Text style={{ fontSize: 12.5, color: C.textMuted, marginTop: 1 }}>{peso(svc.price)}/{unitFor(svc.pricingType)}{rateSuffix(svc)}{svc.readyInHint ? ` · ${svc.readyInHint}` : ""}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => (added ? remove(svc.serviceRefId) : addService(svc))}
          style={{ flexDirection: "row", alignItems: "center", gap: 4, borderRadius: RADIUS.pill, paddingHorizontal: SP.base, paddingVertical: 7, borderWidth: 1, borderColor: added ? C.primary : C.border, backgroundColor: added ? C.primaryTint : C.surface }}
        >
          {added ? <Check size={15} color={C.primaryText} strokeWidth={3} /> : <Plus size={15} color={C.primaryText} strokeWidth={2.5} />}
          <Text style={{ fontSize: 13, fontWeight: "700", color: C.primaryText }}>{added ? "Added" : "Add"}</Text>
        </Pressable>
      </View>
    );
  };

  if (catalogOpen) {
    return (
      <ServiceCatalogOverlay
        providerName={name}
        totalCount={(services ?? []).length}
        results={filteredServices}
        selectedCount={serviceLines.length}
        query={query}
        onQueryChange={setQuery}
        autoFocusSearch={focusSearch}
        categories={categories}
        showCategoryChips={showCategoryChips}
        activeCategory={category}
        onCategoryChange={setCategory}
        onClose={closeCatalog}
        renderRow={serviceRow}
      />
    );
  }

  return (
    <WizardScreen
      step={1}
      title="Book your laundry"
      subtitle={`Booking with ${name}`}
      estimateCentavos={totalMin > 0 ? totalMin : undefined}
      estimateMaxCentavos={totalMax}
      estimateLabel={serviceLines.length > 1 ? `Estimated total · ${serviceLines.length} services` : "Estimated total"}
      estimateHint={estimateHint}
      ctaLabel={ctaLabel}
      ctaDisabled={serviceLines.length === 0 || !!firstIncomplete}
      onContinue={() => router.push("/booking/logistics")}
    >
      <SectionLabel>Choose services</SectionLabel>
      {services === null && !loadError ? <CenterLoader /> : null}
      {loadError ? <InfoBanner tone="warning" text={loadError} /> : null}

      {serviceLines.length === 0 ? (
        <>
          <Text style={{ fontSize: 12.5, color: C.textMuted, marginTop: -SP.sm, marginBottom: SP.md }}>Select one or more</Text>

          {(services ?? []).length > CATALOG_PREVIEW ? (
            <SearchBarButton onPress={() => openCatalog({ focusSearch: true })} style={{ marginBottom: SP.md }} />
          ) : null}

          {/* Preview the first few; the rest live behind "View all" so the
              list stays short even for providers with a long menu. */}
          <View style={{ gap: SP.sm }}>
            {(services ?? []).slice(0, CATALOG_PREVIEW).map(serviceRow)}
          </View>
          {(services ?? []).length > CATALOG_PREVIEW ? (
            <Pressable accessibilityRole="button" onPress={() => openCatalog({ focusSearch: false })}
              style={{ marginTop: SP.md, alignSelf: "flex-start" }}>
              <Text style={{ fontSize: 13.5, fontWeight: "700", color: C.primaryText }}>View all {(services ?? []).length} services</Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => openCatalog({ focusSearch: false })}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.surfaceAlt, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: C.border, paddingHorizontal: SP.base, paddingVertical: SP.md }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Check size={16} color={C.primaryText} strokeWidth={3} />
            <Text style={{ fontSize: 14, fontWeight: "700", color: C.ink }}>{serviceLines.length} service{serviceLines.length === 1 ? "" : "s"} added</Text>
          </View>
          <Text style={{ fontSize: 13.5, fontWeight: "700", color: C.primaryText }}>+ Add another</Text>
        </Pressable>
      )}

      {/* Selected services */}
      {serviceLines.length > 0 ? (
        <>
          <SectionLabel style={{ marginTop: SP.xl }}>Your services · {serviceLines.length}</SectionLabel>
          <View style={{ gap: SP.md }}>
            {serviceLines.map((line) => {
              const svc = svcById.get(line.serviceRefId);
              if (!svc) return null;
              const weight = isWeight(svc.pricingType);
              const isUnsure = unsure.has(line.serviceRefId);
              const isManual = manual.has(line.serviceRefId);
              const activeSize = isManual ? null : sizeOfKg(line.estimatedWeightKg);
              const range = lineRange(svc, line.estimatedWeightKg, line.estimatedPieceCount, isUnsure, isManual);
              return (
                <Card key={line.serviceRefId}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: SP.sm }}>
                    <Text style={{ flex: 1, fontSize: 15, fontWeight: "800", color: C.ink }}>{svc.name}</Text>
                    <Pressable accessibilityRole="button" onPress={() => remove(line.serviceRefId)} hitSlop={8}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: C.textTertiary }}>Remove</Text>
                    </Pressable>
                  </View>

                  {weight ? (
                    <View style={{ marginTop: SP.md }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: C.ink }}>Estimate your load size</Text>
                      <Text style={{ fontSize: 11, color: C.textMuted, marginBottom: SP.sm }}>Final weight is confirmed at pickup</Text>
                      <View style={{ flexDirection: "row", gap: SP.sm }}>
                        {SIZES.map((s) => {
                          const active = !isUnsure && activeSize === s.key;
                          const bucketPrice = money([weightPriceAt(svc, s.kgLow), weightPriceAt(svc, s.kgHigh)]);
                          return (
                            <Pressable key={s.key} accessibilityRole="button" onPress={() => setSize(line.serviceRefId, s.kgMid)}
                              style={{ flex: 1, alignItems: "center", paddingVertical: SP.sm, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: active ? C.primary : C.border, backgroundColor: active ? C.primaryTint : C.surface }}>
                              <Text style={{ fontSize: 13.5, fontWeight: "800", color: active ? C.primary : C.ink }}>{s.label}</Text>
                              <Text style={{ fontSize: 10.5, color: active ? C.primary : C.textMuted }}>{s.kgLow}–{s.kgHigh} kg</Text>
                              <Text style={{ fontSize: 11, fontWeight: "700", color: active ? C.primary : C.textSecondary, marginTop: 3 }} numberOfLines={1}>{bucketPrice}</Text>
                            </Pressable>
                          );
                        })}
                      </View>

                      {/* Detail for the currently-selected bucket only — showing
                          all three at once (persona, examples, icon) per button
                          was too dense at a third of the screen width each. */}
                      {!isUnsure && !isManual && activeSize ? (() => {
                        const active = SIZES.find((s) => s.key === activeSize)!;
                        return (
                          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: SP.sm, marginTop: SP.sm, backgroundColor: C.surfaceAlt, borderRadius: RADIUS.md, padding: SP.sm }}>
                            <ShoppingBasket size={18} color={C.primaryText} strokeWidth={1.75} style={{ marginTop: 1 }} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 12, fontWeight: "700", color: C.ink }}>{sizeSubtitle(svc, active)} · {active.persona}</Text>
                              <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{active.examples}</Text>
                            </View>
                          </View>
                        );
                      })() : null}
                      <View style={{ flexDirection: "row", gap: SP.sm, marginTop: SP.sm }}>
                        <Pressable accessibilityRole="button" onPress={() => setUnsureLine(line.serviceRefId)}
                          style={{ flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: isUnsure ? C.primary : C.border, backgroundColor: isUnsure ? C.primaryTint : C.surface, borderRadius: RADIUS.pill, paddingHorizontal: SP.md, paddingVertical: 6 }}>
                          {isUnsure ? <Check size={13} color={C.primaryText} strokeWidth={3} /> : null}
                          <Text style={{ fontSize: 12.5, fontWeight: "700", color: isUnsure ? C.primary : C.textSecondary }}>Not sure</Text>
                        </Pressable>
                        <Pressable accessibilityRole="button" onPress={() => setManualLine(line.serviceRefId)}
                          style={{ flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: isManual ? C.primary : C.border, backgroundColor: isManual ? C.primaryTint : C.surface, borderRadius: RADIUS.pill, paddingHorizontal: SP.md, paddingVertical: 6 }}>
                          {isManual ? <Check size={13} color={C.primaryText} strokeWidth={3} /> : null}
                          <Text style={{ fontSize: 12.5, fontWeight: "700", color: isManual ? C.primary : C.textSecondary }}>Enter exact kg</Text>
                        </Pressable>
                      </View>

                      {isManual ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: SP.sm, marginTop: SP.sm }}>
                          <TextInput
                            autoFocus
                            placeholder="e.g. 5.5"
                            placeholderTextColor={C.textTertiary}
                            value={manualText[line.serviceRefId] ?? ""}
                            onChangeText={(t) => setManualText_(line.serviceRefId, t)}
                            keyboardType="decimal-pad"
                            style={{ width: 100, backgroundColor: C.surfaceAlt, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border, paddingHorizontal: SP.md, paddingVertical: SP.sm, fontSize: 14, color: C.ink }}
                          />
                          <Text style={{ fontSize: 13, color: C.textMuted }}>kg</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : (
                    <View style={{ marginTop: SP.md }}>
                      {/* Names the provider's own unit — "How many pairs?" —
                          rather than a generic "items", and stops the stepper
                          at her stated limits. */}
                      <Text style={{ fontSize: 13, fontWeight: "700", color: C.ink, marginBottom: SP.sm }}>How many {pluralUnit(countedUnitWord(svc), 2)}?</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: SP.md }}>
                        <Stepper onPress={() => setCount(line.serviceRefId, (line.estimatedPieceCount ?? 1) - 1, svc)} icon="minus" />
                        <Text style={{ minWidth: 90, textAlign: "center", fontSize: 16, fontWeight: "800", color: C.ink }}>
                          {line.estimatedPieceCount ?? 1} {pluralUnit(countedUnitWord(svc), line.estimatedPieceCount ?? 1)}
                        </Text>
                        <Stepper onPress={() => setCount(line.serviceRefId, (line.estimatedPieceCount ?? 1) + 1, svc)} icon="plus" />
                      </View>
                      {quantityLimitHint(svc) ? (
                        <Text style={{ fontSize: 12, color: C.textMuted, marginTop: SP.sm }}>{quantityLimitHint(svc)}</Text>
                      ) : null}
                    </View>
                  )}

                  {/* Per-service note (compact) */}
                  <TextInput
                    placeholder="Add a note (optional) — e.g. keep whites separate"
                    placeholderTextColor={C.textTertiary}
                    value={line.note ?? ""}
                    onChangeText={(t) => patchLine(line.serviceRefId, { note: t })}
                    maxLength={300}
                    style={{ marginTop: SP.md, backgroundColor: C.surfaceAlt, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border, paddingHorizontal: SP.md, paddingVertical: SP.sm, fontSize: 14, color: C.ink }}
                  />

                  {/* Subtotal */}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: SP.md }}>
                    <Text style={{ fontSize: 13, color: C.textMuted }}>Estimated</Text>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: C.ink }}>{money(range)}</Text>
                  </View>
                </Card>
              );
            })}
          </View>
        </>
      ) : null}

      {serviceLines.length > 0 ? (
        <InfoBanner tone="warning" text={`This is only an estimate. The final amount is confirmed when ${name} weighs your laundry at pickup.`} style={{ marginTop: SP.lg }} />
      ) : null}
    </WizardScreen>
  );
}
