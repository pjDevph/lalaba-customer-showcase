import { ExpoConfig, ConfigContext } from "expo/config";

const ENV = process.env.EXPO_PUBLIC_ENV ?? "development";
const ENV_LABELS: Record<string, string> = { development: "Dev", staging: "Staging" };
const ENV_LABEL = ENV_LABELS[ENV] ?? ENV;

const appIds: Record<string, string> = {
  development: "com.lalaba.customer.dev",
  staging: "com.lalaba.customer.stg",
  production: "com.lalaba.customer",
};

// The shared NestJS backend (LALABA_BE_DEV) listens on port 3001; GraphQL at <base>/graphql.
// EXPO_PUBLIC_API_BASE_URL is auto-detected from LAN IP by start.js.
const apiBaseUrls: Record<string, string> = {
  production: "https://api.lalaba.ph/v1",
  staging: "https://api-stg.lalaba.ph/v1",
  development: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3001",
};

// Google Maps SDK keys. They are platform-restricted in the Google Cloud console,
// so iOS and Android each get their own; EXPO_PUBLIC_GOOGLE_MAPS_API_KEY remains
// an unrestricted fallback. These land in Info.plist / AndroidManifest at prebuild
// — the map renders a blank grid without them, so a missing key fails loudly.
const iosMapsKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS ?? process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const androidMapsKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID ?? process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

const firebaseConfigs: Record<string, object> = {
  development: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY_DEV ?? "",
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN_DEV ?? "",
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID_DEV ?? "",
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET_DEV ?? "",
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_SENDER_ID_DEV ?? "",
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_DEV ?? "",
  },
  staging: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY_STG ?? "",
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN_STG ?? "",
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID_STG ?? "",
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET_STG ?? "",
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_SENDER_ID_STG ?? "",
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_STG ?? "",
  },
  production: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_SENDER_ID ?? "",
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
  },
};

const buildConfig = ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: ENV === "production" ? "Lalaba" : `Lalaba(${ENV_LABEL})`,
  slug: "lalaba",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "lalaba",
  userInterfaceStyle: "light",
  runtimeVersion: { policy: "appVersion" },
  updates: {
    url: "https://u.expo.dev/d6cc14b3-c8c2-42b5-8a43-32a50c959e88",
  },
  splash: {
    image: "./assets/splash-icon-white.png",
    resizeMode: "contain",
    backgroundColor: "#00AEEF", // Lalaba brand blue (icon blue, shared with the partner app)
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: appIds[ENV] ?? appIds.development,
    googleServicesFile: "./GoogleService-Info.plist",
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "Used to find laundry services near you and confirm your delivery address.",
      NSPhotoLibraryUsageDescription:
        "Used to attach proof of payment when you pay a provider directly.",
    },
    config: {
      googleMapsApiKey: iosMapsKey,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#00AEEF",
    },
    package: appIds[ENV] ?? appIds.development,
    // google-services.json is gitignored, so EAS Build's cloud checkout never
    // has it — GOOGLE_SERVICES_JSON (an EAS file env var) supplies it there;
    // local builds fall back to the file already on disk.
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
    permissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"],
    softwareKeyboardLayoutMode: "resize",
    config: {
      googleMaps: {
        apiKey: androidMapsKey,
      },
    },
  },
  androidStatusBar: {
    translucent: true,
    barStyle: "dark-content",
  },
  plugins: [
    "expo-router",
    [
      "expo-build-properties",
      {
        ios: {
          useFrameworks: "static",
          buildReactNativeFromSource: true,
        },
      },
    ],
    "@react-native-google-signin/google-signin",
    "@react-native-firebase/app",
    "@react-native-firebase/auth",
    "@react-native-firebase/messaging",
    "@react-native-firebase/app-check",
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Allow Lalaba to use your location to find nearby laundry providers.",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "Allow Lalaba to access your photos to attach proof of payment.",
      },
    ],
    "./plugins/withAllowNonModularIncludes.js",
  ],
  experiments: {
    typedRoutes: false,
  },
  extra: {
    env: ENV,
    firebaseConfig: firebaseConfigs[ENV] ?? firebaseConfigs.development,
    apiBaseUrl: apiBaseUrls[ENV] ?? apiBaseUrls.development,
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
    // Both are exposed because `extra` is platform-agnostic; runtime picks one
    // (src/config/maps.ts) — it never needs them for the SDK, only for HTTP APIs.
    googleMapsApiKeyIos: iosMapsKey,
    googleMapsApiKeyAndroid: androidMapsKey,
    eas: {
      projectId: "d6cc14b3-c8c2-42b5-8a43-32a50c959e88",
    },
  },
});

export default buildConfig;
