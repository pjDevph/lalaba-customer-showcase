// src/components/LegalBody.tsx
// The single source of the app's legal copy. Rendered both by the Settings
// viewers (app/settings/terms.tsx, privacy.tsx) and by the consent sheet on
// /(auth)/register — so what a user agrees to at sign-up is word-for-word what
// they can re-read later. Mirrors the partner app's LegalBody for the same reason.
//
// Short factual stubs — replace with counsel-reviewed text before public launch.
// Bump LEGAL_VERSIONS when the wording changes: those values are recorded against
// the account as `consents` at registration.

import React from "react";
import { Text, View } from "react-native";
import { C, SP } from "@/theme/tokens";

export const LEGAL_VERSIONS = { terms: "1.0", privacy: "1.0" } as const;
const EFFECTIVE = "Version 1.0 — effective August 2026";

export type LegalKind = "terms" | "privacy";

export const LEGAL_TITLES: Record<LegalKind, string> = {
  terms: "Terms of Service",
  privacy: "Privacy Policy",
};

function Block({ heading, children }: Readonly<{ heading?: string; children: React.ReactNode }>) {
  return (
    <View style={{ gap: SP.xs }}>
      {heading ? (
        <Text style={{ fontSize: 15, fontWeight: "700", color: C.ink }}>{heading}</Text>
      ) : null}
      <Text style={{ fontSize: 14, color: C.textSecondary, lineHeight: 21 }}>{children}</Text>
    </View>
  );
}

function Terms() {
  return (
    <>
      <Block heading="1. The service">
        Lalaba is a marketplace that connects you with independent laundry providers (laundromats and
        home washers) for pickup, washing, and return of your laundry. The provider — not Lalaba —
        performs the laundry service.
      </Block>
      <Block heading="2. Bookings and pricing">
        Prices shown before booking are estimates based on your declared weight or item count. The
        final price is set when the provider weighs your laundry at pickup. The price you see is the
        full amount you pay — there are no separate service charges added on top.
      </Block>
      <Block heading="3. Payment">
        Payment is collected in cash or via e-wallet transfer outside the app when your laundry is
        weighed and the final price is confirmed, before pickup. Lalaba does not hold or process your
        payment.
      </Block>
      <Block heading="4. Cancellations">
        You may cancel a booking before pickup, subject to the provider&apos;s confirmation status.
        Providers may decline or propose changes to a booking, which you can accept or decline in the
        app.
      </Block>
      <Block heading="5. Your account">
        You are responsible for the accuracy of your account details and delivery addresses. Misuse of
        the platform may lead to account suspension.
      </Block>
      <Block heading="6. Liability">
        Laundry care is performed by the provider you select. Issues with an order should be raised
        through the order&apos;s chat or Help &amp; Support so they can be resolved with the provider.
      </Block>
    </>
  );
}

function Privacy() {
  return (
    <>
      <Block heading="What we collect">
        Your name, email, mobile number, saved delivery addresses, and the details of your bookings
        (services, weights, prices, and order history). If you sign in with Google, we receive your
        basic Google account profile.
      </Block>
      <Block heading="How it's used">
        To create and fulfill your laundry bookings, to let providers and couriers contact you about
        an active order, and to keep your order history and receipts available to you.
      </Block>
      <Block heading="What providers see">
        The provider handling your order sees your name, contact number, delivery address, and order
        details for that order only. Your details are not shared with providers you have not booked.
      </Block>
      <Block heading="Storage and security">
        Account authentication is handled by Firebase Authentication. Your profile and order data are
        stored on Lalaba&apos;s backend and are not sold to third parties.
      </Block>
      <Block heading="Your choices">
        You can edit your profile and addresses in the app. To request deletion of your account and
        personal data, contact support (Settings → Help &amp; support).
      </Block>
    </>
  );
}

export function LegalBody({ kind }: Readonly<{ kind: LegalKind }>) {
  return (
    <View style={{ gap: SP.lg }}>
      <Text style={{ fontSize: 12.5, color: C.textMuted }}>{EFFECTIVE}</Text>
      {kind === "terms" ? <Terms /> : <Privacy />}
    </View>
  );
}
