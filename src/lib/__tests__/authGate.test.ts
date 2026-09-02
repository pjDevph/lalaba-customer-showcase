// Guards the email-verification gate in app/_layout.tsx. Getting this wrong in
// either direction is bad: too loose lets unverified accounts into the app, too
// strict strands Google/phone users on a "check your inbox" screen for an inbox
// they never gave us.

import type { User } from "firebase/auth";
import { needsEmailVerification } from "../authGate";

type Provider = "password" | "google.com" | "apple.com" | "phone";

function user(emailVerified: boolean, ...providers: Provider[]): User {
  return {
    emailVerified,
    providerData: providers.map((providerId) => ({ providerId })),
  } as unknown as User;
}

describe("needsEmailVerification", () => {
  it("gates an unverified password account", () => {
    expect(needsEmailVerification(user(false, "password"))).toBe(true);
  });

  it("releases a password account once verified", () => {
    expect(needsEmailVerification(user(true, "password"))).toBe(false);
  });

  it.each<Provider>(["google.com", "apple.com", "phone"])(
    "never gates a %s account, even with emailVerified false",
    (provider) => {
      expect(needsEmailVerification(user(false, provider))).toBe(false);
    },
  );

  it("gates an account that linked a password to a social login", () => {
    // Linked accounts carry both providers — the typed address is still unproven.
    expect(needsEmailVerification(user(false, "google.com", "password"))).toBe(true);
  });

  it("does not gate a signed-out session", () => {
    expect(needsEmailVerification(null)).toBe(false);
  });
});
