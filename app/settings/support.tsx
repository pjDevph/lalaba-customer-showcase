// app/settings/support.tsx — Help & support: what to do per situation + email
// contact. TODO: support@lalaba.ph is a placeholder address — confirm the real
// support mailbox before launch.

import React from "react";
import { Linking } from "react-native";
import { router } from "expo-router";
import { SettingsScreen, RowGroup, SettingsRow, LegalBlock } from "@/features/settings/parts";

const SUPPORT_EMAIL = "support@lalaba.ph";

export default function Support() {
  return (
    <SettingsScreen title="Help & support">
      <LegalBlock heading="Problem with an active order?">
        Open the order and use its chat — the provider (and courier, during pickup or delivery) can
        respond directly there. That is the fastest way to resolve weight, schedule, or delivery
        issues.
      </LegalBlock>

      <LegalBlock heading="Anything else">
        For account issues, feedback, or data requests, email us and include your order reference if
        it concerns a booking.
      </LegalBlock>

      <RowGroup>
        <SettingsRow
          first
          icon="lifeBuoy"
          label="Report a problem"
          detail="Chat with Lalaba Support"
          onPress={() => router.push("/support/new")}
        />
        <SettingsRow
          icon="mail"
          label="Email support"
          detail={SUPPORT_EMAIL}
          onPress={() => {
            Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {});
          }}
        />
        <SettingsRow
          icon="messageCircle"
          label="Go to my orders"
          detail="Chat with your provider about an order"
          onPress={() => router.push("/(tabs)/orders")}
        />
      </RowGroup>
    </SettingsScreen>
  );
}
