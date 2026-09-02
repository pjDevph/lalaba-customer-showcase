// app/chat/_layout.tsx — chat thread stack (headers rendered per-screen via TopBar).

import React from "react";
import { Stack } from "expo-router";

export default function ChatLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
