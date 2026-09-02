// app/settings/privacy.tsx — in-app Privacy Policy viewer.
// The copy itself lives in src/components/LegalBody.tsx, shared with the sign-up
// consent sheet, so the wording a user agrees to is the wording they re-read here.

import React from "react";
import { LegalBody } from "@/components";
import { SettingsScreen } from "@/features/settings/parts";

export default function Privacy() {
  return (
    <SettingsScreen title="Privacy Policy">
      <LegalBody kind="privacy" />
    </SettingsScreen>
  );
}
