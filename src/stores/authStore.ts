// src/stores/authStore.ts
// ─────────────────────────────────────────────────────────────────────────────
// AUTH STORE (customer app — Firebase Auth + GraphQL)
//
// Single-role consumer app: there is no branch/device/permission machinery.
// The store tracks a simple lifecycle:
//   loading                  → bootstrapping / a request is in flight
//   unauthenticated          → no Firebase user (show login)
//   needs-email-verification → password account whose email is still unproven;
//                              pinned to /(auth)/verify-email by the root gate
//   needs-registration       → Firebase user exists but has no backend profile
//                              yet (new Google/phone user, or a verified email user)
//   authenticated            → backend profile resolved (profile != null)
//
// Session persistence is handled by Firebase (getReactNativePersistence →
// AsyncStorage, see src/config/firebase.ts), so the user stays signed in across
// cold starts — unlike the merchant app. This store only persists small
// non-session onboarding flags; the live ID token is always read from Firebase.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  signInWithPhoneNumber,
  sendEmailVerification,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type ConfirmationResult,
} from "firebase/auth";
import { auth } from "../config/firebase";
import { ApiError } from "../config/graphql";
import {
  fetchMe,
  registerUser,
  signupRoles,
  type RegisterUserInput,
} from "../services/graphql/auth";
import type { UserProfile } from "../types/api";
import { needsEmailVerification } from "../lib/authGate";
import { devWarn } from "../utils/devLog";

/** Everything the one-page registration form collects. */
export interface CustomerRegistrationInput {
  firstName: string;
  lastName: string;
  /** PH local format, e.g. "09171234567". */
  phoneNumber: string;
  email: string;
  password: string;
  consents: RegisterUserInput["consents"];
}

export type AuthStatus =
  | "loading"
  | "unauthenticated"
  // Firebase identity exists but the email behind it is unproven. Only ever
  // reached by password-provider accounts (see needsEmailVerification below).
  | "needs-email-verification"
  | "needs-registration"
  | "authenticated";

interface AuthState {
  status: AuthStatus;
  profile: UserProfile | null;
  error: string | null;
  isBusy: boolean;

  // Persisted, non-session onboarding flag(s).
  hasSeenOnboarding: boolean;

  // ── Actions ─────────────────────────────────────────────────────────────────
  initAuthListener: () => () => void;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendOtp: (phoneE164: string) => Promise<void>;
  confirmOtp: (code: string) => Promise<void>;
  completeRegistration: (input: RegisterUserInput) => Promise<void>;
  /** Full email signup: Firebase identity + backend profile in one step. */
  registerCustomer: (input: CustomerRegistrationInput) => Promise<void>;
  /** Re-reads the Firebase user; on success advances past the verification gate. */
  checkEmailVerified: () => Promise<boolean>;
  resendVerificationEmail: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Server rejected the session — see setUnauthenticatedHandler in config/graphql. */
  handleDeadSession: (message: string) => void;
  setHasSeenOnboarding: (v: boolean) => void;
  clearError: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// A "no backend profile yet" signal: either `me` resolved to null, or the guard
// threw UNAUTHENTICATED "Account not found." — the one case that means "route to
// registration" rather than a hard rejection.
function isNoProfileError(err: unknown): boolean {
  if (err instanceof ApiError) {
    return (
      err.status === 404 ||
      (err.code === "UNAUTHENTICATED" && /account not found/i.test(err.message))
    );
  }
  return false;
}

function friendlyAuthError(code?: string): string {
  switch (code) {
    case "auth/user-not-found":
      return "No account found for this email. Check the email, or sign up.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Incorrect email or password.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/email-already-in-use":
      return "An account already exists for this email. Sign in instead.";
    case "auth/weak-password":
      return "Password is too weak — use at least 6 characters.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact support.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/invalid-verification-code":
      return "That code is incorrect. Please try again.";
    case "auth/network-request-failed":
    case "network-error":
      return "Network error — check your connection and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

// Resolve the backend profile for the current Firebase user and apply it. When
// no profile exists yet → 'needs-registration'; on success → 'authenticated'.
// Returns false if a *hard* error occurred (leaves status untouched for caller).
async function resolveProfile(set: (p: Partial<AuthState>) => void): Promise<boolean> {
  // Checked before fetchMe() so an unverified account never touches the backend
  // profile surface at all — this is the single choke point every sign-in path
  // (listener, email, Google, OTP) funnels through.
  if (needsEmailVerification(auth.currentUser)) {
    set({ status: "needs-email-verification", profile: null });
    return true;
  }
  try {
    const me = await fetchMe();
    if (!me) {
      set({ status: "needs-registration", profile: null });
      return true;
    }
    set({ status: "authenticated", profile: me });
    return true;
  } catch (err) {
    if (isNoProfileError(err)) {
      set({ status: "needs-registration", profile: null });
      return true;
    }
    devWarn("[authStore] resolveProfile failed:", err);
    return false;
  }
}

// Phone-auth confirmation handle lives at module scope (never persisted) between
// sendOtp() and confirmOtp().
let pendingConfirmation: ConfirmationResult | null = null;

// ─── Store ────────────────────────────────────────────────────────────────────
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      status: "loading",
      profile: null,
      error: null,
      isBusy: false,
      hasSeenOnboarding: false,

      // Firebase fires onAuthStateChanged once on launch (session restored from
      // AsyncStorage) and again on every sign-in/out. We resolve the backend
      // profile on each signed-in event that we didn't initiate ourselves.
      initAuthListener: () => {
        const unsub = onAuthStateChanged(auth, (fbUser) => {
          void (async () => {
            // Interactive flows manage their own profile resolution — skip while
            // one is running so we don't double-fetch or clobber their error.
            if (get().isBusy) return;
            if (!fbUser) {
              set({ status: "unauthenticated", profile: null });
              return;
            }
            const ok = await resolveProfile((p) => set(p));
            if (!ok) {
              // Backend unreachable but Firebase session is valid — surface a
              // soft error and fall back to unauthenticated so the UI can retry.
              set({ status: "unauthenticated", profile: null, error: friendlyAuthError("network-error") });
            }
          })();
        });
        return unsub;
      },

      signInWithEmail: async (email, password) => {
        set({ isBusy: true, error: null, status: "loading" });
        try {
          await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
          const ok = await resolveProfile((p) => set(p));
          if (!ok) set({ status: "unauthenticated", error: friendlyAuthError("network-error") });
        } catch (err: unknown) {
          const code = (err as { code?: string })?.code;
          set({ status: "unauthenticated", error: friendlyAuthError(code) });
        } finally {
          set({ isBusy: false });
        }
      },

      // Google sign-in via @react-native-google-signin → Firebase credential.
      // TODO: verify native google-signin wiring (webClientId in app.config.ts
      //       extra.googleWebClientId, GoogleService-Info / google-services.json).
      //       The flow below mirrors the merchant app; confirm the native module
      //       is linked before relying on it.
      signInWithGoogle: async () => {
        set({ isBusy: true, error: null, status: "loading" });
        try {
          const { GoogleSignin, isSuccessResponse } = await import(
            "@react-native-google-signin/google-signin"
          );
          const webClientId =
            (Constants.expoConfig?.extra as { googleWebClientId?: string } | undefined)
              ?.googleWebClientId ?? "";
          GoogleSignin.configure({ webClientId });
          await GoogleSignin.hasPlayServices();
          const response = await GoogleSignin.signIn();
          if (!isSuccessResponse(response)) {
            set({ status: "unauthenticated", isBusy: false });
            return;
          }
          const idToken = response.data.idToken;
          if (!idToken) throw new Error("Google sign-in returned no idToken");
          const credential = GoogleAuthProvider.credential(idToken);
          await signInWithCredential(auth, credential);
          const ok = await resolveProfile((p) => set(p));
          if (!ok) set({ status: "unauthenticated", error: friendlyAuthError("network-error") });
        } catch (err: unknown) {
          const code = (err as { code?: string })?.code;
          set({ status: "unauthenticated", error: friendlyAuthError(code) });
        } finally {
          set({ isBusy: false });
        }
      },

      // ── Phone OTP (Firebase Phone Auth) ─────────────────────────────────────
      // TODO: Firebase Phone Auth in React Native needs a reCAPTCHA/APNs verifier.
      //       With the Firebase JS SDK this means wiring up an app verifier (e.g.
      //       expo-firebase-recaptcha's FirebaseRecaptchaVerifierModal) and
      //       passing it as the 3rd arg below. Until that native/verifier setup
      //       is in place this will reject. Phone must be E.164, e.g. +639171234567.
      sendOtp: async (phoneE164) => {
        set({ isBusy: true, error: null });
        try {
          // @ts-expect-error — appVerifier arg is required at runtime in RN and
          // must be supplied once the reCAPTCHA verifier is wired (see TODO).
          pendingConfirmation = await signInWithPhoneNumber(auth, phoneE164.trim());
        } catch (err: unknown) {
          const code = (err as { code?: string })?.code;
          set({ error: friendlyAuthError(code) });
          throw err;
        } finally {
          set({ isBusy: false });
        }
      },

      confirmOtp: async (code) => {
        if (!pendingConfirmation) {
          set({ error: "No OTP request in progress. Request a new code." });
          return;
        }
        set({ isBusy: true, error: null, status: "loading" });
        try {
          await pendingConfirmation.confirm(code.trim());
          pendingConfirmation = null;
          const ok = await resolveProfile((p) => set(p));
          if (!ok) set({ status: "unauthenticated", error: friendlyAuthError("network-error") });
        } catch (err: unknown) {
          const errCode = (err as { code?: string })?.code;
          set({ status: "unauthenticated", error: friendlyAuthError(errCode) });
        } finally {
          set({ isBusy: false });
        }
      },

      // Creates the backend profile for the current Firebase user, then resolves
      // it → 'authenticated'. Requires a signed-in Firebase user.
      completeRegistration: async (input) => {
        set({ isBusy: true, error: null, status: "loading" });
        try {
          const created = await registerUser(input);
          set({ status: "authenticated", profile: created });
        } catch (err: unknown) {
          const message =
            err instanceof ApiError ? err.message : "Could not complete registration.";
          set({ status: "needs-registration", error: message });
          throw err;
        } finally {
          set({ isBusy: false });
        }
      },

      // One-page signup (app/(auth)/register.tsx): create the Firebase identity,
      // then the backend profile, then hand off to the verification gate.
      //
      // Status deliberately stays "loading" for the whole sequence. Releasing it
      // to 'needs-email-verification' between the two calls would let the root
      // gate navigate away mid-flight and unmount the caller before the profile
      // was created — leaving an identity with no profile behind it.
      registerCustomer: async (input) => {
        set({ isBusy: true, error: null, status: "loading" });
        try {
          const roles = await signupRoles();
          const customer = roles.find((r) => r.roleId === "customer");
          if (!customer) throw new Error("Couldn't find the customer role. Please try again.");

          await createUserWithEmailAndPassword(
            auth,
            input.email.trim().toLowerCase(),
            input.password,
          );
          if (auth.currentUser) {
            // Non-blocking — the verify screen offers a resend if this fails.
            sendEmailVerification(auth.currentUser).catch(() => {});
          }

          await registerUser({
            role: customer._id,
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
            phoneNumber: input.phoneNumber.trim(),
            consents: input.consents,
          });

          set({ status: "needs-email-verification", profile: null });
        } catch (err: unknown) {
          const code = (err as { code?: string })?.code;
          const message =
            err instanceof ApiError
              ? err.message
              : code
                ? friendlyAuthError(code)
                : (err as Error)?.message || "Could not create your account.";
          // The Firebase user may exist while registerUser failed. Signing it out
          // keeps the app's state honest — the user retries from a clean slate
          // rather than sitting on a half-built account. The email stays taken,
          // so friendlyAuthError's "account already exists" message guides them.
          await firebaseSignOut(auth).catch(() => {});
          set({ status: "unauthenticated", profile: null, error: message });
          throw err;
        } finally {
          set({ isBusy: false });
        }
      },

      // `emailVerified` is baked into the cached token, so it only changes after
      // an explicit reload() — polling this is the only way to notice the user
      // clicking the link in another app.
      checkEmailVerified: async () => {
        const user = auth.currentUser;
        if (!user) return false;
        try {
          await user.reload();
        } catch {
          return false; // offline / transient — the caller keeps polling
        }
        if (!auth.currentUser?.emailVerified) return false;
        // Verified: fall through the normal resolution path so the user lands on
        // needs-registration (no backend profile yet) or authenticated.
        const ok = await resolveProfile((p) => set(p));
        if (!ok) set({ error: friendlyAuthError("network-error") });
        return true;
      },

      resendVerificationEmail: async () => {
        const user = auth.currentUser;
        if (!user) throw new Error("No signed-in account to verify.");
        await sendEmailVerification(user);
      },

      refreshProfile: async () => {
        try {
          const me = await fetchMe();
          if (me) set({ status: "authenticated", profile: me });
        } catch (err) {
          devWarn("[authStore] refreshProfile failed:", err);
        }
      },

      // A dead session is not a transient error: every subsequent request,
      // including the ones polling screens fire on a timer, fails the same way
      // until the user signs in again. Dropping to 'unauthenticated' both stops
      // that traffic and moves the app to the sign-in route.
      handleDeadSession: (message: string) => {
        // Registration-in-progress, not a rejection — leave the session alone
        // and let the caller's own isNoProfileError path route to sign-up.
        if (/account not found/i.test(message)) return;
        if (get().status === "unauthenticated") return; // already torn down
        pendingConfirmation = null;
        set({ status: "unauthenticated", profile: null, error: null });
        void firebaseSignOut(auth).catch(() => {});
      },

      signOut: async () => {
        pendingConfirmation = null;
        set({ status: "unauthenticated", profile: null, error: null });
        await firebaseSignOut(auth).catch(() => {});
      },

      setHasSeenOnboarding: (v) => set({ hasSeenOnboarding: v }),
      clearError: () => set({ error: null }),
    }),
    {
      name: "lalaba-customer-auth",
      storage: createJSONStorage(() => AsyncStorage),
      // Session (status/profile) is NOT persisted — Firebase restores the session
      // and initAuthListener re-resolves the profile on launch. Only durable,
      // non-session onboarding flags are kept.
      partialize: (state) => ({ hasSeenOnboarding: state.hasSeenOnboarding }),
    },
  ),
);
