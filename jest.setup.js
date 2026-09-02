
// APPCHK — the App Check native module (RNFBAppModule) does not exist under
// Jest, so importing it fails the whole suite at load time. Mocked to the
// shape src/config/appCheck.ts actually uses; behaviour is covered by the
// backend AppCheckGuard spec and by on-device evidence, not from here.
jest.mock("@react-native-firebase/app-check", () => {
  const provider = { configure: jest.fn() };
  const appCheck = () => ({
    newReactNativeFirebaseAppCheckProvider: () => provider,
  });
  return {
    __esModule: true,
    default: appCheck,
    firebase: {
      appCheck: () => ({
        initializeAppCheck: jest.fn(),
        getToken: jest.fn().mockResolvedValue({ token: "test-app-check-token" }),
      }),
    },
  };
});
