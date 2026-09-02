// src/config/firebase.ts
// Firebase client SDK — authentication only (email/password, Google, phone OTP).
// MongoDB (via NestJS GraphQL) is the database. Config is injected via
// app.config.ts extra → Constants.expoConfig.extra.

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  connectAuthEmulator,
  type Persistence,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { devLog } from "../utils/devLog";
import { initAppCheck } from "./appCheck";
import { initAppCheckBridge } from "./appCheckBridge";

// getReactNativePersistence ships at runtime in firebase v10 but is missing from
// the 'firebase/auth' type exports, so pull it in untyped.
 
const { getReactNativePersistence } = require("firebase/auth") as {
  getReactNativePersistence: (storage: unknown) => Persistence;
};

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

function getFirebaseConfig(): FirebaseConfig {
  const extra = Constants.expoConfig?.extra as
    | { firebaseConfig?: FirebaseConfig }
    | undefined;
  if (!extra?.firebaseConfig) {
    throw new Error("Firebase config missing from app.config.ts extra");
  }
  return extra.firebaseConfig;
}

const alreadyInitialized = getApps().length > 0;
const app = alreadyInitialized ? getApp() : initializeApp(getFirebaseConfig());


// APPCHK-003 — before Auth is constructed below and before any GraphQL call.
// A token requested before initialization resolves to nothing, and the first
// request of a cold start is exactly the one that matters.
initAppCheck();

// APPCHK-016X — EXPERIMENTAL, default OFF (EXPO_PUBLIC_APPCHK_016X=on).
// Bridges the native attestation above into the JS Firebase app so that
// firebase/auth can attach X-Firebase-AppCheck to Authentication requests.
// Must run on THIS app instance and before `auth` is constructed below.
// Remove this call and appCheckBridge.ts to revert the spike entirely.
initAppCheckBridge(app);

// Persistent login across cold starts — a consumer app should keep the user
// signed in (unlike the merchant app, which uses inMemoryPersistence to force a
// fresh login on every launch).
const auth = alreadyInitialized
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });

if (!alreadyInitialized && process.env.EXPO_PUBLIC_USE_EMULATOR === "true") {
  const defaultHost = Platform.OS === "android" ? "10.0.2.2" : "localhost"; // NOSONAR
  const host = process.env.EXPO_PUBLIC_EMULATOR_HOST ?? defaultHost;
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  devLog(`🔥 [Firebase] Auth emulator → http://${host}:9099`);
}

export { app, auth };
