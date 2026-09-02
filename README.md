# Lalaba — Customer App

The Expo/React Native app customers use to find laundry providers, book pickup/delivery, and pay from an in-app wallet. Public, redacted snapshot — see [Notes on this snapshot](#notes-on-this-snapshot).

Talks to the [Lalaba backend](https://github.com/pjDevph/lalaba-backend-showcase) over GraphQL — its sibling is the [Partner app](https://github.com/pjDevph/lalaba-partner-showcase), which providers and staff use.

## Stack

Expo (React Native, `expo-router`) · Firebase Auth (JS SDK) + App Check · Google Maps (`react-native-maps`) for provider discovery · a custom fetch-based GraphQL client — deliberately no Apollo/codegen, kept thin on purpose.

## Notes on this snapshot

Single squashed commit, not the real project history. Internal-only content (`docs/release-evidence/`, `CLAUDE.md`) was removed before publishing — no secrets were found in the real git history.

---

Part of the Lalaba platform · built by [Prince John Gandollas](https://github.com/pjDevph) with a small engineering team
