// src/components/PsgcAddressFields.tsx
// Region → Province → City/Municipality → Barangay, picked from the PSGC API
// instead of typed free-hand — the same source of truth the partner app's
// AddressPicker uses, so a customer's "Quezon City" and a branch's "Quezon City"
// are the same string and discovery can actually match them.
//
// The backend takes names (not codes) for customer addresses, but the codes are
// what drive the cascade, so they're held here and surfaced via onChange for any
// caller that wants them.

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, RADIUS, SP } from "@/theme/tokens";
import { Check, ChevronRight, Search, X } from "@/theme/icons";
import {
  fetchBarangays,
  fetchCitiesMunicipalities,
  fetchProvinces,
  fetchRegions,
  isNcr,
  NCR_PROVINCE_NAME,
} from "@/utils/psgc";

/** The PSGC-resolved parts of an address. Names go to the API; codes drive the cascade. */
export interface PsgcValue {
  regionName: string;
  regionCode: string;
  provinceName: string;
  provinceCode: string;
  cityMunicipalityName: string;
  cityMunicipalityCode: string;
  barangayName: string;
  barangayCode: string;
}

export const EMPTY_PSGC: PsgcValue = {
  regionName: "",
  regionCode: "",
  provinceName: "",
  provinceCode: "",
  cityMunicipalityName: "",
  cityMunicipalityCode: "",
  barangayName: "",
  barangayCode: "",
};

/** True once every level the address needs has been chosen. */
export function isPsgcComplete(v: PsgcValue): boolean {
  return !!(v.regionName && v.provinceName && v.cityMunicipalityName && v.barangayName);
}

interface Item {
  code: string;
  name: string;
}

type Level = "region" | "province" | "city" | "barangay";

const LEVEL_LABEL: Record<Level, string> = {
  region: "Region",
  province: "Province",
  city: "City / Municipality",
  barangay: "Barangay",
};

// ─── Picker modal ─────────────────────────────────────────────────────────────

function PickerModal({
  level,
  items,
  loading,
  error,
  selectedCode,
  onPick,
  onClose,
  onRetry,
}: Readonly<{
  level: Level | null;
  items: Item[];
  loading: boolean;
  error: string | null;
  selectedCode: string;
  onPick: (item: Item) => void;
  onClose: () => void;
  onRetry: () => void;
}>) {
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const filtered = needle ? items.filter((i) => i.name.toLowerCase().includes(needle)) : items;

  return (
    <Modal
      visible={level !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onShow={() => setQuery("")}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }} edges={["top", "bottom"]}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: SP.xl,
            paddingVertical: SP.base,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: C.ink }}>
            {level ? `Select ${LEVEL_LABEL[level]}` : ""}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            hitSlop={12}
            style={{
              width: 32,
              height: 32,
              borderRadius: RADIUS.pill,
              backgroundColor: C.surfaceAlt,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={17} color={C.textSecondary} strokeWidth={2.5} />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: SP.xl, paddingBottom: SP.md }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: SP.sm,
              borderWidth: 1,
              borderColor: C.border,
              borderRadius: RADIUS.md,
              backgroundColor: C.bg,
              paddingHorizontal: SP.md,
              minHeight: SP.touch,
            }}
          >
            <Search size={17} color={C.textTertiary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={`Search ${LEVEL_LABEL[level ?? "region"].toLowerCase()}`}
              placeholderTextColor={C.textTertiary}
              autoCorrect={false}
              style={{ flex: 1, fontSize: 15, color: C.ink, paddingVertical: SP.sm }}
            />
          </View>
        </View>

        {loading ? (
          <View style={{ paddingVertical: SP["3xl"], alignItems: "center", gap: SP.md }}>
            <ActivityIndicator color={C.primaryText} />
            <Text style={{ fontSize: 13, color: C.textMuted }}>Loading…</Text>
          </View>
        ) : error ? (
          <View style={{ paddingVertical: SP["2xl"], paddingHorizontal: SP.xl, alignItems: "center", gap: SP.md }}>
            <Text style={{ fontSize: 14, color: C.textMuted, textAlign: "center", lineHeight: 20 }}>
              {error}
            </Text>
            <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={8}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: C.primaryText }}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: SP.xl, paddingBottom: SP["2xl"] }}
          >
            {filtered.length === 0 ? (
              <Text style={{ fontSize: 14, color: C.textMuted, paddingVertical: SP.xl, textAlign: "center" }}>
                No matches for “{query}”.
              </Text>
            ) : (
              filtered.map((item) => {
                const selected = item.code === selectedCode;
                return (
                  <Pressable
                    key={item.code}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => onPick(item)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: SP.md,
                      paddingVertical: SP.md,
                      borderBottomWidth: 1,
                      borderBottomColor: C.borderSubtle,
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 15,
                        color: C.ink,
                        fontWeight: selected ? "700" : "400",
                      }}
                    >
                      {item.name}
                    </Text>
                    {selected ? <Check size={18} color={C.primaryText} strokeWidth={3} /> : null}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ─── Dropdown row ─────────────────────────────────────────────────────────────

function DropdownRow({
  label,
  value,
  placeholder,
  disabled,
  onPress,
}: Readonly<{
  label: string;
  value: string;
  placeholder: string;
  disabled: boolean;
  onPress: () => void;
}>) {
  return (
    <View>
      <Text style={{ fontSize: 13, fontWeight: "600", color: C.ink, marginBottom: 6 }}>
        {label} <Text style={{ color: C.error }}>*</Text>
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: SP.md,
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: RADIUS.md,
          backgroundColor: disabled ? C.surfaceAlt : C.surface,
          paddingHorizontal: SP.base,
          minHeight: SP.touch + 4,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <Text
          numberOfLines={1}
          style={{ flex: 1, fontSize: 15, color: value ? C.ink : C.textTertiary }}
        >
          {value || placeholder}
        </Text>
        <ChevronRight size={18} color={C.textTertiary} />
      </Pressable>
    </View>
  );
}

// ─── Fields ───────────────────────────────────────────────────────────────────

export interface PsgcAddressFieldsProps {
  value: PsgcValue;
  onChange: (next: PsgcValue) => void;
}

export function PsgcAddressFields({ value, onChange }: Readonly<PsgcAddressFieldsProps>) {
  const [open, setOpen] = useState<Level | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // NCR has no province rows in PSGC; the level is filled in automatically with
  // "Metro Manila" (how PH addresses are actually written) and skipped.
  const ncr = isNcr(value.regionCode);

  const loadLevel = useCallback(
    async (level: Level) => {
      setLoading(true);
      setError(null);
      try {
        let next: Item[] = [];
        if (level === "region") {
          next = (await fetchRegions()).map((r) => ({ code: r.code, name: r.name }));
        } else if (level === "province") {
          next = (await fetchProvinces(value.regionCode)).map((p) => ({ code: p.code, name: p.name }));
        } else if (level === "city") {
          const parent = ncr ? value.regionCode : value.provinceCode;
          next = (await fetchCitiesMunicipalities(parent, ncr)).map((c) => ({
            code: c.code,
            name: c.name,
          }));
        } else {
          next = (await fetchBarangays(value.cityMunicipalityCode)).map((b) => ({
            code: b.code,
            name: b.name,
          }));
        }
        next.sort((a, b) => a.name.localeCompare(b.name));
        setItems(next);
      } catch {
        setItems([]);
        setError("Couldn't load the list. Check your connection and try again.");
      } finally {
        setLoading(false);
      }
    },
    [ncr, value.regionCode, value.provinceCode, value.cityMunicipalityCode],
  );

  useEffect(() => {
    if (open) void loadLevel(open);
  }, [open, loadLevel]);

  // Picking a level invalidates everything below it — leaving a stale barangay
  // under a newly-picked city is how impossible addresses get saved.
  const onPick = (item: Item) => {
    if (open === "region") {
      const nowNcr = isNcr(item.code);
      onChange({
        ...EMPTY_PSGC,
        regionName: item.name,
        regionCode: item.code,
        provinceName: nowNcr ? NCR_PROVINCE_NAME : "",
        provinceCode: "",
      });
    } else if (open === "province") {
      onChange({
        ...value,
        provinceName: item.name,
        provinceCode: item.code,
        cityMunicipalityName: "",
        cityMunicipalityCode: "",
        barangayName: "",
        barangayCode: "",
      });
    } else if (open === "city") {
      onChange({
        ...value,
        cityMunicipalityName: item.name,
        cityMunicipalityCode: item.code,
        barangayName: "",
        barangayCode: "",
      });
    } else {
      onChange({ ...value, barangayName: item.name, barangayCode: item.code });
    }
    setOpen(null);
  };

  const selectedCodeFor = (level: Level | null): string => {
    switch (level) {
      case "region":
        return value.regionCode;
      case "province":
        return value.provinceCode;
      case "city":
        return value.cityMunicipalityCode;
      case "barangay":
        return value.barangayCode;
      default:
        return "";
    }
  };

  return (
    <View style={{ gap: SP.base }}>
      <DropdownRow
        label="Region"
        value={value.regionName}
        placeholder="Select region"
        disabled={false}
        onPress={() => setOpen("region")}
      />

      {ncr ? (
        <View>
          <Text style={{ fontSize: 13, fontWeight: "600", color: C.ink, marginBottom: 6 }}>
            Province
          </Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: C.borderSubtle,
              borderRadius: RADIUS.md,
              backgroundColor: C.surfaceAlt,
              paddingHorizontal: SP.base,
              justifyContent: "center",
              minHeight: SP.touch + 4,
            }}
          >
            <Text style={{ fontSize: 15, color: C.textMuted }}>{NCR_PROVINCE_NAME}</Text>
          </View>
          <Text style={{ fontSize: 12, color: C.textMuted, marginTop: SP.xs }}>
            NCR has no provinces — set automatically.
          </Text>
        </View>
      ) : (
        <DropdownRow
          label="Province"
          value={value.provinceName}
          placeholder={value.regionCode ? "Select province" : "Select a region first"}
          disabled={!value.regionCode}
          onPress={() => setOpen("province")}
        />
      )}

      <DropdownRow
        label="City / Municipality"
        value={value.cityMunicipalityName}
        placeholder={
          ncr || value.provinceCode ? "Select city or municipality" : "Select a province first"
        }
        disabled={!(ncr ? value.regionCode : value.provinceCode)}
        onPress={() => setOpen("city")}
      />

      <DropdownRow
        label="Barangay"
        value={value.barangayName}
        placeholder={value.cityMunicipalityCode ? "Select barangay" : "Select a city first"}
        disabled={!value.cityMunicipalityCode}
        onPress={() => setOpen("barangay")}
      />

      <PickerModal
        level={open}
        items={items}
        loading={loading}
        error={error}
        selectedCode={selectedCodeFor(open)}
        onPick={onPick}
        onClose={() => setOpen(null)}
        onRetry={() => open && loadLevel(open)}
      />
    </View>
  );
}
