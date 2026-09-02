// app/index.tsx
// Entry redirect. Authenticated sessions jump straight to the tabs; everyone
// else lands on the splash, which then hands off to the welcome flow.
import React from "react";
import { Redirect } from "expo-router";
import { useAuthStore } from "@/stores/authStore";

export default function Index() {
  const status = useAuthStore((s) => s.status);
  if (status === "authenticated") return <Redirect href="/(tabs)" />;
  return <Redirect href="/(auth)/splash" />;
}
