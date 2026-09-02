// src/config/maps.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for the Google Maps browser/SDK key at RUNTIME.
// Keys are platform-restricted in the Google Cloud console (an iOS-restricted
// key is rejected by the Android SDK and vice-versa), so each platform reads its
// own var. `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` stays supported as an unrestricted
// fallback. `app.config.ts` resolves the same vars at BUILD time for the native
// manifest/Info.plist entries the map SDK actually authenticates with.
// ─────────────────────────────────────────────────────────────────────────────

import { Platform } from "react-native";

export const GOOGLE_MAPS_API_KEY =
  (Platform.OS === "ios"
    ? process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS
    : process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID) ??
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??
  "";
