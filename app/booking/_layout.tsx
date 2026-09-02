// app/booking/_layout.tsx
import React from "react";
import { Stack, Redirect } from "expo-router";
import { useBookingStore } from "@/stores/bookingStore";

export default function BookingLayout() {
  const branchId = useBookingStore((s) => s.providerId);

  // Deep-linked without a started booking → send home.
  if (!branchId) {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
