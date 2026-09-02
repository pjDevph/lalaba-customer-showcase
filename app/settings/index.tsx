// app/settings/index.tsx — Settings hub (GAP-M-023): profile editing, legal,
// support, and sign out. Every row routes to a real screen — no dead handlers.

import React from "react";
import { router } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { confirm } from "@/stores/dialogStore";
import { SettingsScreen, RowGroup, SettingsRow } from "@/features/settings/parts";

export default function Settings() {
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);

  const onSignOut = () => {
    confirm({
      title: "Sign out?",
      message: "You can sign back in anytime with the same account.",
      confirmLabel: "Sign out",
      onConfirm: () => void signOut(),
    });
  };

  return (
    <SettingsScreen title="Settings">
      <RowGroup>
        <SettingsRow
          first
          icon="userRound"
          label="Edit profile"
          detail={profile ? `${profile.firstName} ${profile.lastName}`.trim() : undefined}
          onPress={() => router.push("/settings/edit-profile")}
        />
      </RowGroup>

      {/* Its own group rather than sitting with the legal links: a voucher is
          something the customer OWNS, and burying it under Terms of Service is
          how a saved offer goes unused. */}
      <RowGroup>
        <SettingsRow
          first
          icon="ticket"
          label="My vouchers"
          onPress={() => router.push("/vouchers")}
        />
      </RowGroup>

      <RowGroup>
        <SettingsRow first icon="fileText" label="Terms of Service" onPress={() => router.push("/settings/terms")} />
        <SettingsRow icon="shieldCheck" label="Privacy Policy" onPress={() => router.push("/settings/privacy")} />
        <SettingsRow icon="info" label="Help & support" onPress={() => router.push("/settings/support")} />
      </RowGroup>

      <RowGroup>
        <SettingsRow first destructive icon="logOut" label="Sign out" onPress={onSignOut} />
      </RowGroup>
    </SettingsScreen>
  );
}
