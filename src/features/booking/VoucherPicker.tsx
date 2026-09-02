// src/features/booking/VoucherPicker.tsx
// "Select voucher" at checkout.
//
// A better way to fill the promoCode field that already exists — nothing more.
// It never computes a discount and never sends an amount: picking a voucher
// sets the code, and the same server call that has always priced a typed code
// prices this one. So a claimed voucher and a typed code take exactly the same
// path by the time any money is involved.
//
// Which vouchers are usable is decided by the backend too, against the same
// validate() the checkout runs. The alternative — reimplementing the rules
// here — could not work anyway: "first order only" needs the order history and
// the per-customer cap needs the redemption ledger, neither of which is on the
// device.

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { C, SP, RADIUS, peso } from "@/theme/tokens";
import { Icon } from "@/theme/icons";
import { gqlMyVouchers, type UserVoucher } from "@/services/graphql/campaigns";

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

function VoucherOption({
  voucher,
  onPick,
}: Readonly<{ voucher: UserVoucher; onPick: () => void }>) {
  const usable = voucher.usable;
  return (
    <Pressable
      onPress={usable ? onPick : undefined}
      disabled={!usable}
      accessibilityRole="button"
      accessibilityState={{ disabled: !usable }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: SP.md,
        padding: SP.base,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: usable ? C.border : C.borderSubtle,
        backgroundColor: usable ? C.surface : C.surfaceAlt,
        opacity: usable ? 1 : 0.7,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: RADIUS.full,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: usable ? C.primaryTint : C.surfaceAlt,
        }}
      >
        <Icon
          name="ticket"
          size={18}
          color={usable ? C.primaryText : C.textMuted}
        />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: C.ink }}>
          {benefitLabel(voucher)}
        </Text>
        <Text style={{ fontSize: 12.5, color: C.textSecondary, marginTop: 1 }}>
          {voucher.description}
        </Text>
        {/* The reason a voucher cannot be used, in the server's words. Showing
            it beats hiding the row: someone who claimed a voucher and cannot
            find it assumes the app lost it. */}
        {!usable && voucher.unusableReason ? (
          <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>
            {voucher.unusableReason}
          </Text>
        ) : null}
      </View>

      {usable && voucher.discountPreviewCentavos != null ? (
        <Text style={{ fontSize: 14, fontWeight: "800", color: C.success }}>
          −{peso(voucher.discountPreviewCentavos)}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function VoucherPicker({
  visible,
  orderTotalCentavos,
  onPick,
  onClose,
}: Readonly<{
  visible: boolean;
  /** The PRE-discount subtotal. Anything already applied is added back by the
   *  caller, so swapping one voucher for another is priced against the same
   *  basis the checkout will use. */
  orderTotalCentavos: number;
  onPick: (code: string) => void;
  onClose: () => void;
}>) {
  const [vouchers, setVouchers] = useState<UserVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const held = await gqlMyVouchers(orderTotalCentavos);
      // Spent and expired ones are dropped HERE but kept on the My Vouchers
      // screen: at checkout the question is "what can I use now", and a list
      // of things that cannot be used is noise in the middle of paying.
      setVouchers(held.filter((v) => v.status === "AVAILABLE"));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [orderTotalCentavos]);

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
        <View
          style={{
            backgroundColor: C.bg,
            borderTopLeftRadius: RADIUS.xl,
            borderTopRightRadius: RADIUS.xl,
            paddingTop: SP.base,
            paddingBottom: SP.xl,
            maxHeight: "80%",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: SP.screen,
              paddingBottom: SP.base,
            }}
          >
            <Text style={{ flex: 1, fontSize: 18, fontWeight: "700", color: C.ink }}>
              Your vouchers
            </Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <Icon name="x" size={20} color={C.textSecondary} />
            </Pressable>
          </View>

          {loading ? (
            <View style={{ padding: SP.xl, alignItems: "center" }}>
              <ActivityIndicator color={C.primary} />
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{
                paddingHorizontal: SP.screen,
                gap: SP.sm,
                paddingBottom: SP.base,
              }}
            >
              {vouchers.length === 0 ? (
                <Text
                  style={{
                    fontSize: 14,
                    color: C.textMuted,
                    textAlign: "center",
                    paddingVertical: SP.xl,
                  }}
                >
                  {error
                    ? "Couldn't load your vouchers."
                    : "No vouchers to use on this order yet."}
                </Text>
              ) : (
                vouchers.map((v) => (
                  <VoucherOption
                    key={v._id}
                    voucher={v}
                    onPick={() => onPick(v.code)}
                  />
                ))
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
