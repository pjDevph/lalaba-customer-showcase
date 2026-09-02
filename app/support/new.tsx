// app/support/new.tsx
// "Report a problem" — category + subject/body, creates the ticket then hands
// off to the thread screen. Only offers categories that make sense from the
// customer side; WALLET_TOPUP/VERIFICATION are provider-only concepts (see
// the merchant/washer app's equivalent picker for those).

import React, { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { C, SP, RADIUS } from "@/theme/tokens";
import { TopBar, RadioSelectCard, Button } from "@/components";
import { useSupportTicketStore } from "@/stores/supportTicketStore";
import { notify } from "@/stores/notificationStore";
import type { TicketCategory } from "@/types/api";

const CATEGORIES: readonly { key: TicketCategory; label: string; description: string }[] = [
  { key: "ORDER_LATE", label: "My order is late", description: "Pickup or delivery is overdue" },
  { key: "ORDER_DAMAGED", label: "Item was damaged", description: "Something came back damaged" },
  { key: "ORDER_MISSING_ITEMS", label: "Item is missing", description: "Something didn't come back" },
  { key: "PAYMENT_DISPUTE", label: "Payment issue", description: "Charged the wrong amount, or a payment problem" },
  { key: "REFUND_REQUEST", label: "Refund request", description: "You'd like money back for an order" },
  { key: "PROVIDER_CONDUCT", label: "Problem with a provider", description: "A laundromat or home washer" },
  { key: "COURIER_CONDUCT", label: "Problem with a courier", description: "The person who picked up or delivered" },
  { key: "ACCOUNT_ACCESS", label: "Account access", description: "Trouble signing in or account settings" },
  { key: "APP_BUG", label: "Something's broken in the app", description: "A bug, crash, or thing that doesn't work" },
  { key: "OTHER", label: "Something else", description: "" },
];

export default function NewSupportTicketScreen() {
  const [category, setCategory] = useState<TicketCategory | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const create = useSupportTicketStore((s) => s.create);
  const sending = useSupportTicketStore((s) => s.sending);

  const canSubmit = category != null && subject.trim().length > 0 && body.trim().length > 0 && !sending;

  async function onSubmit() {
    if (!category) return;
    const ticket = await create({ subject: subject.trim(), body: body.trim(), category });
    if (ticket) {
      router.replace(`/support/${ticket._id}`);
    } else {
      const err = useSupportTicketStore.getState().error;
      notify.error("Couldn't send your report", err ?? "Please try again.");
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <TopBar title="Report a problem" showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: SP.screen, gap: SP.lg, paddingBottom: SP["2xl"] }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: SP.sm }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: C.ink }}>What's this about?</Text>
          <View style={{ gap: SP.sm }}>
            {CATEGORIES.map((c) => (
              <RadioSelectCard
                key={c.key}
                title={c.label}
                description={c.description || undefined}
                selected={category === c.key}
                onPress={() => setCategory(c.key)}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: SP.sm }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: C.ink }}>Subject</Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="A short summary"
            placeholderTextColor={C.textTertiary}
            maxLength={200}
            style={{
              backgroundColor: C.surfaceAlt,
              borderRadius: RADIUS.md,
              borderWidth: 1,
              borderColor: C.border,
              paddingHorizontal: SP.base,
              paddingVertical: SP.md,
              fontSize: 15,
              color: C.ink,
            }}
          />
        </View>

        <View style={{ gap: SP.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: C.ink }}>Tell us what happened</Text>
            {/* Shown only near the cap. A counter sitting at 0/5000 from the
                start reads as a demand for length rather than a limit. */}
            {body.length > 4500 ? (
              <Text style={{ fontSize: 12, color: body.length >= 5000 ? C.error : C.textMuted }}>
                {body.length}/5000
              </Text>
            ) : null}
          </View>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="The more detail, the faster we can help."
            placeholderTextColor={C.textTertiary}
            // Matches TEXT_LIMITS.LONG on the server, so the limit is felt
            // while typing rather than as a rejection after Send.
            maxLength={5000}
            multiline
            style={{
              minHeight: 120,
              backgroundColor: C.surfaceAlt,
              borderRadius: RADIUS.md,
              borderWidth: 1,
              borderColor: C.border,
              paddingHorizontal: SP.base,
              paddingVertical: SP.md,
              fontSize: 15,
              color: C.ink,
              textAlignVertical: "top",
            }}
          />
        </View>

        <Button label="Send report" fullWidth loading={sending} disabled={!canSubmit} onPress={() => void onSubmit()} />
      </ScrollView>
    </SafeAreaView>
  );
}
