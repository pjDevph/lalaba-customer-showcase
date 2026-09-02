// src/components/VerifiedBadge.tsx
// The Verified / Unverified badge customers see on providers. Extracted from
// ProviderCard so the provider screen, chat header and order details all show
// the same thing rather than three near-copies.
//
// Callers pass a boolean. Server-side that boolean is always `verifiedAt !=
// null` — never verificationStatus. Keep the single derivation.

import React from "react";
import { View, Text } from "react-native";
import { Shield, ShieldCheck } from "lucide-react-native";
import { C } from "../theme/tokens";

export function VerifiedBadge({
  verified,
  size = 20,
  showLabel = true,
}: Readonly<{
  verified: boolean;
  size?: number;
  /** Icon-only for tight spots like a chat header or an order row. */
  showLabel?: boolean;
}>) {
  return (
    <View style={{ alignItems: "center", gap: 1 }}>
      {verified ? (
        <ShieldCheck size={size} color={C.success} />
      ) : (
        <Shield size={size} color={C.textTertiary} />
      )}
      {showLabel && (
        <Text
          style={{
            fontSize: 10,
            fontWeight: "700",
            color: verified ? C.success : C.textTertiary,
          }}
        >
          {verified ? "Verified" : "Unverified"}
        </Text>
      )}
    </View>
  );
}
