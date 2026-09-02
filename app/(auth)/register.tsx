// app/(auth)/register.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Email registration as its own page, mirroring the partner app's register
// wizard: name → mobile → email → password, then explicit Terms/Privacy
// acceptance before the account is created.
//
// Validated by the SAME `registerSchema` the partner app uses, so the two apps
// cannot drift on what a valid name/mobile/password is. Both the CTA's disabled
// state and the field errors read from that one parse — never a parallel copy.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Button,
  LegalConsentSheet,
  LEGAL_VERSIONS,
  PasswordInput,
  PasswordRules,
  PhoneInput,
  type LegalKind,
  type PhoneInputValue,
} from "@/components";
import { C, RADIUS, SP } from "@/theme/tokens";
import { Check } from "@/theme/icons";
import { useAuthStore } from "@/stores/authStore";
import { notify } from "@/stores/notificationStore";
import { useFormValidation } from "@/hooks/useFormValidation";
import { registerSchema } from "@/lib/validation";
import { Screen, AuthHeader, BackBox } from "@/features/auth/parts";

function Field({
  label,
  error,
  children,
}: Readonly<{ label: string; error?: string; children: React.ReactNode }>) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: C.ink, marginBottom: 6 }}>{label}</Text>
      {children}
      {error ? (
        <Text style={{ fontSize: 12, color: C.error, marginTop: SP.xs }}>{error}</Text>
      ) : null}
    </View>
  );
}

function TextField({
  value,
  onChangeText,
  onBlur,
  placeholder,
  invalid,
  ...rest
}: Readonly<
  { value: string; onChangeText: (v: string) => void; onBlur: () => void; placeholder: string; invalid: boolean } &
  Pick<React.ComponentProps<typeof TextInput>, "keyboardType" | "autoCapitalize" | "autoComplete" | "autoCorrect">
>) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      onBlur={onBlur}
      placeholder={placeholder}
      placeholderTextColor={C.textTertiary}
      style={{
        borderWidth: 1,
        borderColor: invalid ? C.error : C.border,
        borderRadius: RADIUS.md,
        backgroundColor: C.surface,
        paddingHorizontal: SP.base,
        minHeight: SP.touch + 4,
        fontSize: 16,
        color: C.ink,
      }}
      {...rest}
    />
  );
}

function ConsentRow({
  checked,
  onToggle,
  disabled = false,
  hint,
  children,
}: Readonly<{
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  hint?: string;
  children: React.ReactNode;
}>) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      onPress={disabled ? undefined : onToggle}
      disabled={disabled}
      style={{ flexDirection: "row", gap: SP.md, opacity: disabled ? 0.5 : 1 }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: RADIUS.sm,
          borderWidth: checked ? 0 : 1.5,
          borderColor: C.borderStrong,
          backgroundColor: checked ? C.primary : C.surface,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
        }}
      >
        {checked ? <Check size={15} color={C.textInverse} strokeWidth={3} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, color: C.textSecondary, lineHeight: 20 }}>{children}</Text>
        {hint ? (
          <Text style={{ fontSize: 12, color: C.textTertiary, marginTop: 2 }}>{hint}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function Register() {
  const router = useRouter();
  const registerCustomer = useAuthStore((s) => s.registerCustomer);
  const isBusy = useAuthStore((s) => s.isBusy);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState<PhoneInputValue | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [openDoc, setOpenDoc] = useState<LegalKind | null>(null);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (field: string) => setTouched((t) => ({ ...t, [field]: true }));

  // Tapping an unchecked row opens the document to read; you can only agree from
  // inside the sheet, after scrolling it. Tapping a checked row withdraws consent.
  const onConsentPress = (kind: LegalKind, agreed: boolean) => {
    if (!agreed) return setOpenDoc(kind);
    if (kind === "terms") {
      setAgreeTerms(false);
      setAgreePrivacy(false); // privacy is gated on terms — don't leave it orphaned
    } else {
      setAgreePrivacy(false);
    }
  };

  const onAcceptDoc = (kind: LegalKind) => {
    if (kind === "terms") setAgreeTerms(true);
    else setAgreePrivacy(true);
    setOpenDoc(null);
  };

  const { isValid, errors } = useFormValidation(registerSchema, {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim(),
    mobile: phone?.local ?? "",
    password,
    confirmPassword,
  });
  const show = (field: string) => (touched[field] ? errors[field] : undefined);
  // A mismatch is legible the moment the second password diverges, so this one
  // doesn't wait for blur — otherwise you finish typing, see five green ticks
  // above, and a disabled button with nothing explaining why.
  const confirmError = confirmPassword.length > 0 ? errors.confirmPassword : undefined;

  // Privacy can only be accepted after the Terms, matching the partner app.
  const canSubmit = isValid && agreeTerms && agreePrivacy && !isBusy;

  const onSubmit = async () => {
    try {
      await registerCustomer({
        firstName,
        lastName,
        phoneNumber: phone?.local ?? "",
        email,
        password,
        consents: [
          { policyType: "terms_of_service", version: LEGAL_VERSIONS.terms },
          { policyType: "privacy_policy", version: LEGAL_VERSIONS.privacy },
        ],
      });
      // Success → status becomes 'needs-email-verification' and the root gate
      // routes to /(auth)/verify-email. Nothing to push here.
    } catch {
      const err = useAuthStore.getState().error;
      notify.error("Couldn't create account", err ?? "Please try again.");
      useAuthStore.getState().clearError();
    }
  };

  return (
    <Screen
      footer={
        <>
          {isValid && !isBusy && (!agreeTerms || !agreePrivacy) ? (
            <Text style={{ fontSize: 13, color: C.textSecondary, textAlign: "center" }}>
              Agree to both to continue.
            </Text>
          ) : null}
          <Button
            label="Create account"
            fullWidth
            loading={isBusy}
            disabled={!canSubmit}
            onPress={onSubmit}
          />
        </>
      }
    >
      <View style={{ marginBottom: SP.xl }}>
        <BackBox onPress={() => router.back()} />
      </View>

      <AuthHeader
        title="Create your account"
        subtitle="We'll use these details to set up your bookings."
        style={{ marginBottom: SP.xl }}
      />

      <View style={{ gap: SP.lg }}>
        <View style={{ flexDirection: "row", gap: SP.md }}>
          <Field label="First name" error={show("firstName")}>
            <TextField
              value={firstName}
              onChangeText={setFirstName}
              onBlur={() => touch("firstName")}
              placeholder="Ana"
              autoCapitalize="words"
              autoComplete="given-name"
              invalid={!!show("firstName")}
            />
          </Field>
          <Field label="Last name" error={show("lastName")}>
            <TextField
              value={lastName}
              onChangeText={setLastName}
              onBlur={() => touch("lastName")}
              placeholder="Dela Cruz"
              autoCapitalize="words"
              autoComplete="family-name"
              invalid={!!show("lastName")}
            />
          </Field>
        </View>

        <View>
          <PhoneInput
            label="Mobile number"
            value={phone?.digits ?? ""}
            onChange={setPhone}
            onBlur={() => touch("mobile")}
            error={show("mobile")}
          />
          <Text style={{ fontSize: 12, color: C.textMuted, marginTop: SP.xs }}>
            Shared only with providers handling your active order.
          </Text>
        </View>

        <Field label="Email address" error={show("email")}>
          <TextField
            value={email}
            onChangeText={setEmail}
            onBlur={() => touch("email")}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            invalid={!!show("email")}
          />
        </Field>

        <View>
          <PasswordInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            onBlur={() => touch("password")}
            autoComplete="password-new"
            placeholder="Create a password"
          />
          {password.length > 0 ? (
            <PasswordRules value={password} style={{ marginTop: SP.sm }} />
          ) : null}
        </View>

        <PasswordInput
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          onBlur={() => touch("confirmPassword")}
          autoComplete="password-new"
          placeholder="Re-enter your password"
          error={confirmError}
        />

        <View style={{ gap: SP.base, marginTop: SP.xs }}>
          <ConsentRow
            checked={agreeTerms}
            hint={agreeTerms ? undefined : "Tap to read, then agree at the end."}
            onToggle={() => onConsentPress("terms", agreeTerms)}
          >
            {"I have read and agree to the "}
            <Text style={{ color: C.primaryText, fontWeight: "700" }}>Terms and Conditions</Text>.
          </ConsentRow>

          <ConsentRow
            checked={agreePrivacy}
            disabled={!agreeTerms}
            hint={
              agreeTerms
                ? agreePrivacy
                  ? undefined
                  : "Tap to read, then acknowledge at the end."
                : "Accept the Terms first to enable this."
            }
            onToggle={() => onConsentPress("privacy", agreePrivacy)}
          >
            {"I have read and acknowledge the "}
            <Text style={{ color: C.primaryText, fontWeight: "700" }}>Privacy Policy</Text>
            {" and consent to the processing of my personal data as described."}
          </ConsentRow>
        </View>
      </View>

      <LegalConsentSheet
        kind={openDoc}
        accepted={openDoc === "terms" ? agreeTerms : agreePrivacy}
        onClose={() => setOpenDoc(null)}
        onAccept={onAcceptDoc}
      />
    </Screen>
  );
}
