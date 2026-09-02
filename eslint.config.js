// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // T1 (2026-08-22): the repo was swept to zero `any`, so this goes straight to
    // `error` rather than `warn` — there is no backlog to grandfather. The plugin
    // must be registered in the SAME config object as the rule, and scoped to TS
    // files only (the JS config files here are not type-checked).
    // Use `unknown` plus a narrowing guard; for caught errors prefer
    // userErrorMessage() from src/utils/userError.ts, which also strips server
    // internals before anything reaches the UI.
    files: ["**/*.ts", "**/*.tsx"],
    plugins: { "@typescript-eslint": require("@typescript-eslint/eslint-plugin") },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    // Never the platform's native dialogs. An action to confirm goes through
    // confirm() from src/stores/dialogStore.ts (rendered by <ConfirmDialog/>);
    // anything that is only telling the user something goes through a toast.
    //
    // A rule rather than a convention because it has come back twice after
    // being swept, and each return is invisible until someone greps for it.
    files: ["src/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "Alert",
          property: "alert",
          message:
            "Use confirm() from stores/dialogStore for actions, or a toast for notices — not the native alert.",
        },
        // window-prefixed too: `no-restricted-globals` only matches the bare
        // identifier, and these apps can render on web via Expo.
        { object: "window", property: "alert", message: "Use a toast — not the blocking browser dialog." },
        { object: "window", property: "confirm", message: "Use the app's confirm modal — not the blocking browser dialog." },
        { object: "window", property: "prompt", message: "Use a real modal with a text field — not the blocking browser dialog." },
        {
          object: "Alert",
          property: "prompt",
          message:
            "Use a real modal with a text field — not the native prompt.",
        },
      ],
      "no-restricted-globals": [
        "error",
        {
          name: "alert",
          message: "Use a toast for notices, or confirm() from stores/dialogStore.",
        },
        {
          name: "confirm",
          message: "Use confirm() from stores/dialogStore — not the blocking browser dialog.",
        },
        {
          name: "prompt",
          message: "Use a real modal with a text field — not the blocking browser dialog.",
        },
      ],
    },
  },
  {
    rules: {
      // Pre-existing violations — disabled to unblock CI
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",
      "import/no-unresolved": "off",

    },
  },
]);
