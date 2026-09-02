// src/lib/authGate.ts
// Pure predicates behind the auth routing gate in app/_layout.tsx. Kept out of
// authStore so they can be unit-tested without pulling in Firebase/AsyncStorage.

import type { User } from "firebase/auth";

/**
 * Whether this account must prove its email before entering the app.
 *
 * Only applies to accounts whose email the user typed themselves. Google/Apple
 * hand us an already-verified address, and phone-OTP accounts have no email at
 * all — gating those would strand users on a "check your inbox" screen for an
 * inbox they never gave us. An account that linked a password to a social login
 * still counts: the typed address is unproven regardless of how they got in.
 */
export function needsEmailVerification(user: User | null): boolean {
  if (!user || user.emailVerified) return false;
  return user.providerData.some((p) => p.providerId === "password");
}
