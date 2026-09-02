// app/settings/edit-profile.tsx — edit name + mobile number via the backend's
// updateUser mutation (self-update). Email comes from the Firebase identity and
// is read-only; there is no profile-photo field on the backend yet.

import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { C, RADIUS, SP } from "@/theme/tokens";
import { Button, PhoneInput } from "@/components";
import type { PhoneInputValue } from "@/components";
import { useAuthStore } from "@/stores/authStore";
import { notify } from "@/stores/notificationStore";
import { updateUser } from "@/services/graphql/auth";
import { userErrorMessage } from "@/utils/userError";
import { backOr } from "@/lib/nav";
import { SettingsScreen } from "@/features/settings/parts";

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
}: Readonly<{
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  placeholder?: string;
  editable?: boolean;
}>) {
  return (
    <View>
      <Text style={{ fontSize: 13, fontWeight: "600", color: C.ink, marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.textTertiary}
        editable={editable}
        autoCapitalize="words"
        style={{
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: RADIUS.md,
          backgroundColor: editable ? C.surface : C.surfaceAlt,
          paddingHorizontal: SP.base,
          minHeight: SP.touch + 4,
          fontSize: 16,
          color: editable ? C.ink : C.textMuted,
        }}
      />
    </View>
  );
}

export default function EditProfile() {
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const [firstName, setFirstName] = useState(profile?.firstName ?? "");
  const [lastName, setLastName] = useState(profile?.lastName ?? "");
  const initialDigits = (profile?.phoneNumber ?? "").replace(/\D/g, "").replace(/^0/, "").slice(0, 10);
  const [phoneDigits, setPhoneDigits] = useState(initialDigits);
  const [phone, setPhone] = useState<PhoneInputValue | null>(null);
  const [saving, setSaving] = useState(false);

  const phoneValid = phone ? phone.valid : /^9\d{9}$/.test(phoneDigits);
  const canSave = firstName.trim().length > 0 && lastName.trim().length > 0 && phoneValid && !saving;

  const onSave = async () => {
    setSaving(true);
    try {
      await updateUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phone?.local ?? `0${phoneDigits}`,
      });
      await refreshProfile();
      notify.success("Profile updated", "Your details have been saved.");
      backOr("/settings");
    } catch (err) {
      notify.error("Couldn't save profile", userErrorMessage(err, "Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsScreen title="Edit profile">
      <View style={{ gap: SP.lg }}>
        <Field label="First name" value={firstName} onChangeText={setFirstName} placeholder="Ana" />
        <Field label="Last name" value={lastName} onChangeText={setLastName} placeholder="Dela Cruz" />
        <View>
          <Text style={{ fontSize: 13, fontWeight: "600", color: C.ink, marginBottom: 6 }}>Mobile number</Text>
          <PhoneInput
            value={phoneDigits}
            onChange={(v) => {
              setPhoneDigits(v.digits);
              setPhone(v);
            }}
          />
          <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>
            Shared only with providers handling your active order.
          </Text>
        </View>
        <Field label="Email" value={profile?.email ?? ""} editable={false} />
        <Button label="Save changes" fullWidth loading={saving} disabled={!canSave} onPress={onSave} />
      </View>
    </SettingsScreen>
  );
}
