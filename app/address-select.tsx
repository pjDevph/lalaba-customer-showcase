// app/address-select.tsx  (037 — "Deliver to")
// Sheet-styled screen: search, use-current-location, saved addresses, add new.
// Selecting an address sets it in the address store and returns to the caller.

import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Location from "expo-location";
import { C, SP, RADIUS, SHADOW, COMP } from "@/theme/tokens";
import { Search, MapPin, Plus, X, Navigation as NavIcon } from "lucide-react-native";
import { AddressRow, BottomSheet, Button, PsgcAddressFields, EMPTY_PSGC, isPsgcComplete, type PsgcValue } from "@/components";
import { useAddressStore } from "@/stores/addressStore";
import { useDiscoveryStore } from "@/stores/discoveryStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { formatBranchAddress } from "@/features/provider/parts";
import { searchPlaces, reverseGeocode, shortLocality, type PlaceSuggestion } from "@/services/geocoding";
import type { CreateAddressInput } from "@/services/graphql/addresses";
import { psgcLookupCity } from "@/utils/psgc";

const SEARCH_DEBOUNCE_MS = 350;

// Region/province/city/barangay are no longer free text — they come from the
// PSGC picker so they match the canonical names branches are registered under.
interface FormState {
  label: string;
  streetAddress: string;
  zipCode: string;
  psgc: PsgcValue;
}
const EMPTY_FORM: FormState = {
  label: "",
  streetAddress: "",
  zipCode: "",
  psgc: EMPTY_PSGC,
};

export default function AddressSelectScreen() {
  const addresses = useAddressStore((s) => s.addresses);
  const selectedId = useAddressStore((s) => s.selectedAddressId);
  const load = useAddressStore((s) => s.load);
  const select = useAddressStore((s) => s.select);
  const create = useAddressStore((s) => s.create);
  const setCoords = useDiscoveryStore((s) => s.setCoords);
  const searchDiscovery = useDiscoveryStore((s) => s.search);
  const push = useNotificationStore((n) => n.push);

  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [gpsLabel, setGpsLabel] = useState("Detect my location automatically");
  // Coordinates for the address being added — from the picked suggestion when
  // the form was prefilled from search, else the current discovery centre.
  const pickedCoords = useRef<{ latitude: number; longitude: number } | null>(null);

  // Sheet slide-up (the route itself is a transparent modal that fades in).
  const slide = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(slide, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [slide]);

  useEffect(() => {
    void load();
  }, [load]);

  // Label the GPS row with the customer's actual locality when we know it.
  useEffect(() => {
    const { latitude, longitude } = useDiscoveryStore.getState().filters;
    if (latitude == null || longitude == null) return;
    let alive = true;
    void reverseGeocode(latitude, longitude).then((place) => {
      if (alive && place) setGpsLabel(`GPS · ${shortLocality(place)}`);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Debounced place autocomplete.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void searchPlaces(q, controller.signal).then((results) => {
        if (controller.signal.aborted) return;
        setSuggestions(results);
        setSearching(false);
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Picking a suggestion opens the add-address form prefilled with what
  // Nominatim knew, so the customer only fills in the gaps.
  function pickSuggestion(place: PlaceSuggestion) {
    pickedCoords.current = { latitude: place.latitude, longitude: place.longitude };
    setForm({
      label: "",
      streetAddress: place.streetAddress || place.title,
      zipCode: place.zipCode,
      psgc: EMPTY_PSGC,
    });
    setAddOpen(true);

    // Nominatim's place names aren't PSGC names, so they can't be trusted into
    // the form directly — resolve them to real PSGC entries (passing the
    // province/region as a hint, since city names repeat across provinces) and
    // prefill only what resolves. The barangay is always left to the picker:
    // Nominatim's is frequently absent or spelled differently.
    void psgcLookupCity(place.cityMunicipalityName, {
      provinceName: place.provinceName,
      regionName: place.regionName,
    })
      .then((hit) => {
        if (!hit) return;
        setForm((f) => ({
          ...f,
          psgc: {
            ...EMPTY_PSGC,
            regionName: hit.regionName,
            regionCode: hit.regionCode,
            provinceName: hit.provinceName,
            provinceCode: hit.provinceCode,
            cityMunicipalityName: hit.cityName,
            cityMunicipalityCode: hit.cityCode,
          },
        }));
      })
      .catch(() => {
        /* offline or no match — the picker still works from scratch */
      });
  }

  const filtered = addresses.filter((a) => {
    if (!query.trim()) return true;
    const hay = `${a.label ?? ""} ${formatBranchAddress(a.address)}`.toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });

  function choose(id: string) {
    select(id);
    router.back();
  }

  async function handleUseCurrentLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords(pos.coords.latitude, pos.coords.longitude);
      void searchDiscovery();
      router.back();
    } catch {
      // Silently ignore — the row simply does nothing if location is unavailable.
    } finally {
      setLocating(false);
    }
  }

  const formValid = !!form.streetAddress.trim() && isPsgcComplete(form.psgc);

  async function saveNewAddress() {
    if (!formValid) return;
    setSaving(true);
    try {
      let coords = pickedCoords.current;
      if (!coords) {
        // A manually-typed address (label/street/barangay typed by hand, not
        // picked from a search suggestion) has no geocoded pin yet. This used
        // to silently fall back to the current discovery viewport/GPS —
        // which is how a "Home" address typed as Angono, Rizal once got saved
        // pinned in San Francisco (the emulator's default GPS fix), with
        // nothing ever cross-checking the two. Geocode the typed text instead
        // of trusting an unrelated coordinate.
        const queryText = [
          form.streetAddress,
          form.psgc.barangayName,
          form.psgc.cityMunicipalityName,
          form.psgc.provinceName,
        ].filter(Boolean).join(", ");
        const hits = await searchPlaces(queryText);
        coords = hits[0] ? { latitude: hits[0].latitude, longitude: hits[0].longitude } : null;
      }
      if (!coords) {
        push({
          type: "warning",
          title: "Couldn't pinpoint this address",
          message: "We couldn't map this address automatically. Try searching for it above and picking a suggestion instead.",
        });
        return;
      }
      const input: CreateAddressInput = {
        address: {
          streetAddress: form.streetAddress.trim(),
          barangayName: form.psgc.barangayName,
          cityMunicipalityName: form.psgc.cityMunicipalityName,
          provinceName: form.psgc.provinceName,
          regionName: form.psgc.regionName,
        },
        mapLocation: coords,
        isDefault: addresses.length === 0,
      };
      if (form.label.trim()) input.label = form.label.trim();
      if (form.zipCode.trim()) input.address.zipCode = form.zipCode.trim();
      const created = await create(input);
      if (created) {
        setAddOpen(false);
        setForm(EMPTY_FORM);
        pickedCoords.current = null;
        router.back();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.overlay }} edges={[]}>
      {/* Tap-out backdrop */}
      <Pressable accessibilityLabel="Dismiss" style={{ flex: 1 }} onPress={() => router.back()} />

      {/* Sheet */}
      <Animated.View
        style={{
          backgroundColor: C.surface,
          borderTopLeftRadius: RADIUS["3xl"],
          borderTopRightRadius: RADIUS["3xl"],
          paddingTop: SP.md,
          maxHeight: "88%",
          ...SHADOW.lg,
          transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [0, 320] }) }],
        }}
      >
        <View style={{ alignItems: "center", paddingBottom: SP.sm }}>
          <View style={{ width: 40, height: 5, borderRadius: RADIUS.pill, backgroundColor: C.borderStrong }} />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SP.lg, paddingBottom: SP.md }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: C.ink }}>Deliver to</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} hitSlop={8}>
            <X size={22} color={C.textMuted} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SP.lg, paddingBottom: SP["2xl"], gap: SP.md }}>
          {/* Search */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: SP.sm,
              height: 44,
              paddingHorizontal: SP.md,
              borderRadius: RADIUS.lg,
              backgroundColor: C.surfaceAlt,
            }}
          >
            <Search size={18} color={C.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search for a street, barangay or landmark"
              placeholderTextColor={C.textTertiary}
              autoCorrect={false}
              returnKeyType="search"
              style={{ flex: 1, fontSize: 15, color: C.ink, paddingVertical: 0 }}
            />
            {query.length > 0 ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8} onPress={() => setQuery("")}>
                {searching ? <ActivityIndicator size="small" color={C.textMuted} /> : <X size={16} color={C.textMuted} />}
              </Pressable>
            ) : null}
          </View>

          {/* Place suggestions */}
          {query.trim().length >= 3 ? (
            <View style={{ gap: SP.xs }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: C.textMuted, letterSpacing: 0.5 }}>SUGGESTIONS</Text>
              {suggestions.map((s) => (
                <Pressable
                  key={s.id}
                  accessibilityRole="button"
                  onPress={() => pickSuggestion(s)}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: SP.md,
                    paddingVertical: SP.sm,
                    paddingHorizontal: SP.xs,
                  }}
                >
                  <MapPin size={18} color={C.textMuted} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: C.ink }} numberOfLines={1}>
                      {s.title}
                    </Text>
                    {s.subtitle ? (
                      <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 1 }} numberOfLines={2}>
                        {s.subtitle}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
              {!searching && suggestions.length === 0 ? (
                <Text style={{ fontSize: 13, color: C.textMuted, paddingVertical: SP.sm }}>
                  No matching places. You can still add the address manually below.
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Use my current location */}
          <Pressable
            accessibilityRole="button"
            onPress={() => void handleUseCurrentLocation()}
            disabled={locating}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: SP.md,
              padding: SP.base,
              borderRadius: RADIUS.lg,
              borderWidth: 1,
              borderColor: C.border,
              backgroundColor: C.surface,
            }}
          >
            <View style={{ width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: C.primaryTint, alignItems: "center", justifyContent: "center" }}>
              {locating ? <ActivityIndicator size="small" color={C.primaryText} /> : <NavIcon size={18} color={C.primaryText} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: C.primaryText }}>Use my current location</Text>
              <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 1 }}>{gpsLabel}</Text>
            </View>
          </Pressable>

          {/* Saved addresses */}
          {filtered.length > 0 ? (
            <View style={{ gap: SP.sm, marginTop: SP.xs }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: C.textMuted, letterSpacing: 0.5 }}>SAVED ADDRESSES</Text>
              {filtered.map((a) => (
                <AddressRow
                  key={a._id}
                  label={a.label ?? "Address"}
                  addressLine={formatBranchAddress(a.address)}
                  isDefault={a.isDefault}
                  selectable
                  selected={a._id === selectedId}
                  onPress={() => choose(a._id)}
                />
              ))}
            </View>
          ) : (
            <View style={{ paddingVertical: SP.lg, alignItems: "center" }}>
              <MapPin size={26} color={C.textTertiary} />
              <Text style={{ fontSize: 14, color: C.textMuted, marginTop: SP.sm }}>No saved addresses yet</Text>
            </View>
          )}

          {/* Add new address */}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              pickedCoords.current = null;
              setForm(EMPTY_FORM);
              setAddOpen(true);
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: SP.md,
              padding: SP.base,
              borderRadius: RADIUS.lg,
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: C.borderStrong,
              backgroundColor: C.surface,
              marginTop: SP.xs,
            }}
          >
            <View style={{ width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: C.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
              <Plus size={18} color={C.ink} />
            </View>
            <Text style={{ fontSize: 15, fontWeight: "700", color: C.ink }}>Add new address</Text>
          </Pressable>
        </ScrollView>
      </Animated.View>

      {/* Inline add-address form */}
      <BottomSheet visible={addOpen} onClose={() => setAddOpen(false)} title="Add address">
        <View style={{ gap: SP.md }}>
          <Field label="Label (e.g. Home, Work)" value={form.label} onChangeText={(v) => setForm((f) => ({ ...f, label: v }))} />
          <Field label="Street address" value={form.streetAddress} onChangeText={(v) => setForm((f) => ({ ...f, streetAddress: v }))} required />
          <PsgcAddressFields
            value={form.psgc}
            onChange={(psgc) => setForm((f) => ({ ...f, psgc }))}
          />
          <Field label="ZIP code" value={form.zipCode} onChangeText={(v) => setForm((f) => ({ ...f, zipCode: v }))} keyboardType="number-pad" />
          <Button
            label="Save address"
            fullWidth
            loading={saving}
            disabled={!formValid}
            onPress={() => void saveNewAddress()}
            style={{ marginTop: SP.sm }}
          />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  required,
  keyboardType,
}: Readonly<{
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  required?: boolean;
  keyboardType?: "default" | "number-pad";
}>) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: C.ink }}>
        {label}
        {required ? <Text style={{ color: C.error }}> *</Text> : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? "default"}
        placeholderTextColor={C.textTertiary}
        style={COMP.input}
      />
    </View>
  );
}
