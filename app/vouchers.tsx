// app/vouchers.tsx
// "My Vouchers" — what this customer is currently holding.
//
// Every voucher's status is worked out by the backend from the promotion and
// the redemption ledger, not stored on the claim, so a cancelled order puts a
// voucher back here with nothing on this screen to keep in step.

import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";

import { TopBar } from "@/components";
import { C, SP, RADIUS, TYPE, peso } from "@/theme/tokens";
import { Icon } from "@/theme/icons";
import {
  gqlMyVouchers,
  type UserVoucher,
  type UserVoucherStatus,
} from "@/services/graphql/campaigns";

/** What the voucher is worth, in the terms the promotion is written in. */
function benefitLabel(v: UserVoucher): string {
  if (v.discountType === "FLAT") return `${peso(v.discountValue)} off`;
  if (v.discountType === "PERCENTAGE") {
    const cap = v.maxDiscountCentavos
      ? ` (up to ${peso(v.maxDiscountCentavos)})`
      : "";
    return `${v.discountValue}% off${cap}`;
  }
  return "Fee waived";
}

/** Why it cannot be used, when it cannot. Silence for an available one. */
function statusNote(v: UserVoucher): string | null {
  switch (v.status) {
    case "USED":
      return "You've used this one";
    case "EXPIRED":
      return "This offer has ended";
    case "REVOKED":
      return "No longer available";
    default:
      return null;
  }
}

const TONE: Record<UserVoucherStatus, { fg: string; bg: string }> = {
  AVAILABLE: { fg: C.primaryText, bg: C.primaryTint },
  USED: { fg: C.textMuted, bg: C.surfaceAlt },
  EXPIRED: { fg: C.textMuted, bg: C.surfaceAlt },
  REVOKED: { fg: C.textMuted, bg: C.surfaceAlt },
};

function expiryLabel(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `Valid until ${d.toLocaleDateString("en-PH", {
    day: "numeric",
    month: "short",
  })}`;
}

function VoucherRow({ voucher }: Readonly<{ voucher: UserVoucher }>) {
  const usable = voucher.status === "AVAILABLE";
  const tone = TONE[voucher.status];
  const note = statusNote(voucher);
  const expiry = expiryLabel(voucher.expiresAt);

  return (
    <View
      style={{
        flexDirection: "row",
        gap: SP.md,
        padding: SP.base,
        borderRadius: RADIUS.lg,
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.borderSubtle,
        // Spent and expired vouchers stay listed but visibly inert — removing
        // them would read as "it vanished", which is the complaint keeping the
        // row is meant to answer.
        opacity: usable ? 1 : 0.6,
      }}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: RADIUS.full,
          backgroundColor: tone.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="ticket" size={20} color={tone.fg} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: C.ink }}>
          {benefitLabel(voucher)}
        </Text>
        <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>
          {voucher.description}
        </Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
          <Text style={{ fontSize: 12, color: C.textTertiary }}>
            {voucher.code}
          </Text>
          {voucher.minOrderValueCentavos ? (
            <Text style={{ fontSize: 12, color: C.textTertiary }}>
              {"  ·  "}Min {peso(voucher.minOrderValueCentavos)}
            </Text>
          ) : null}
          {expiry ? (
            <Text style={{ fontSize: 12, color: C.textTertiary }}>
              {"  ·  "}
              {expiry}
            </Text>
          ) : null}
        </View>

        {note ? (
          <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
            {note}
          </Text>
        ) : voucher.usesRemaining > 1 ? (
          <Text style={{ fontSize: 12, color: C.primaryText, marginTop: 4 }}>
            {voucher.usesRemaining} uses left
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function VouchersScreen() {
  const [vouchers, setVouchers] = useState<UserVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setVouchers(await gqlMyVouchers());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // On focus, not just on mount: a voucher can be spent by placing an order
  // and this screen is often returned to rather than opened fresh.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <TopBar title="My vouchers" showBack onBack={() => router.back()} />

      {loading && vouchers.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={vouchers}
          keyExtractor={(v) => v._id}
          contentContainerStyle={{
            padding: SP.screen,
            gap: SP.md,
            flexGrow: 1,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load().finally(() => setRefreshing(false));
              }}
              tintColor={C.primary}
            />
          }
          renderItem={({ item }) => <VoucherRow voucher={item} />}
          ListEmptyComponent={
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                gap: SP.sm,
                padding: SP.xl,
              }}
            >
              <Text style={[TYPE.section, { color: C.ink }]}>
                {error ? "Couldn't load your vouchers" : "No vouchers yet"}
              </Text>
              <Text
                style={[TYPE.body, { color: C.textMuted, textAlign: "center" }]}
              >
                {error
                  ? "Pull down to try again."
                  : "Offers you save will appear here, ready to use at checkout."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
