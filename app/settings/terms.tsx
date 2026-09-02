// app/settings/terms.tsx — in-app Terms of Service viewer.
// The copy itself lives in src/components/LegalBody.tsx, shared with the sign-up
// consent sheet, so the wording a user agrees to is the wording they re-read here.

import React from "react";
import { LegalBody } from "@/components";
import { SettingsScreen } from "@/features/settings/parts";

export default function Terms() {
  return (
    <SettingsScreen title="Terms of Service">
      <LegalBody kind="terms" />
    </SettingsScreen>
  );
}
